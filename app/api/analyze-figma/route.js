import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "../../lib/supabase";

// ─── Figma URL 解析 ────────────────────────────────────────────────────────────
function parseFigmaKey(url) {
  const match = url.match(/figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error("无效的 Figma 链接，请检查格式");
  return match[2];
}

// ─── 递归提取图层名称（最多 depth 层，每层最多 maxChildren 个子节点）
function extractLayers(node, depth = 0, maxDepth = 4, maxChildren = 8) {
  const entry = { name: node.name, type: node.type };
  if (node.children && depth < maxDepth) {
    entry.children = node.children
      .slice(0, maxChildren)
      .map((c) => extractLayers(c, depth + 1, maxDepth, maxChildren));
  }
  return entry;
}

// ─── 提取文本内容（最多 limit 条）
function extractTexts(node, texts = [], limit = 15) {
  if (texts.length >= limit) return texts;
  if (node.type === "TEXT" && node.characters) {
    texts.push(node.characters.slice(0, 80));
  }
  for (const child of node.children || []) {
    if (texts.length >= limit) break;
    extractTexts(child, texts, limit);
  }
  return texts;
}

// ─── 提取颜色（最多 limit 个）
function extractColors(node, colors = new Set(), limit = 12) {
  if (colors.size >= limit) return colors;
  for (const fill of node.fills || []) {
    if (fill.type === "SOLID" && fill.color) {
      const { r, g, b } = fill.color;
      colors.add(
        `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`
      );
    }
  }
  for (const child of node.children || []) {
    if (colors.size >= limit) break;
    extractColors(child, colors, limit);
  }
  return colors;
}

// ─── 统计图层总数
function countLayers(node) {
  return 1 + (node.children || []).reduce((s, c) => s + countLayers(c), 0);
}

// ─── 从完整 Figma 数据中提取分析所需信息（pageId 指定则只分析该 Page）
function extractAnalysisData(figmaData, pageId) {
  let pages = figmaData.document?.children || [];

  if (pageId) {
    // 只保留用户选中的 page
    pages = pages.filter((p) => p.id === pageId);
  } else {
    // 没有指定则取前 3 个 page
    pages = pages.slice(0, 3);
  }

  return {
    fileName: figmaData.name,
    pages: pages.map((page) => ({
      name: page.name,
      frames: (page.children || [])
        .filter((n) => n.type === "FRAME" || n.type === "COMPONENT")
        .slice(0, 8) // 单页最多 8 个 Frame
        .map((frame) => ({
          name: frame.name,
          type: frame.type,
          layerCount: countLayers(frame),
          layers: extractLayers(frame),
          texts: extractTexts(frame),
          colors: [...extractColors(frame)],
        })),
    })),
  };
}

// ─── 从版本历史中提取编辑次数最多的用户名 ────────────────────────────────────────
function extractMostFrequentEditor(versions) {
  const counts = {};
  for (const v of versions) {
    const id     = v.user?.id;
    const handle = v.user?.handle || v.user?.name;
    if (!id || !handle) continue;
    if (!counts[id]) counts[id] = { handle, count: 0 };
    counts[id].count++;
  }
  let best = null, maxCount = 0;
  for (const info of Object.values(counts)) {
    if (info.count > maxCount) { maxCount = info.count; best = info.handle; }
  }
  return best; // null if no usable version data
}

// ─── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { userId } = await auth();
    const { figmaUrl, pageId } = await request.json();

    if (!figmaUrl?.trim()) {
      return NextResponse.json({ error: "请提供 Figma 链接" }, { status: 400 });
    }

    // 1. 解析文件 Key
    let fileKey;
    try {
      fileKey = parseFigmaKey(figmaUrl);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    // 2. 校验环境变量
    if (!process.env.FIGMA_TOKEN) {
      return NextResponse.json({ error: "服务端未配置 FIGMA_TOKEN" }, { status: 500 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "服务端未配置 ANTHROPIC_API_KEY" }, { status: 500 });
    }

    // 3. 并行获取 Figma 文件数据 + 版本历史（版本历史是姓名识别最可靠的来源）
    const [figmaRes, versionsRes] = await Promise.all([
      fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: { "X-Figma-Token": process.env.FIGMA_TOKEN },
      }),
      fetch(`https://api.figma.com/v1/files/${fileKey}/versions`, {
        headers: { "X-Figma-Token": process.env.FIGMA_TOKEN },
      }),
    ]);

    if (!figmaRes.ok) {
      const err = await figmaRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Figma API 错误: ${err.err || figmaRes.statusText}` },
        { status: figmaRes.status }
      );
    }

    const figmaData = await figmaRes.json();

    // 3b. 提取版本历史中出现次数最多的编辑者（best-effort，失败不阻塞）
    let versionHistoryName = null;
    if (versionsRes.ok) {
      try {
        const versionsData = await versionsRes.json();
        versionHistoryName = extractMostFrequentEditor(versionsData.versions || []);
      } catch (e) {
        console.warn("[analyze-figma] versions parse error:", e.message);
      }
    }

    // 4. 提取分析数据（只分析选中的 page）
    const selectedPage = (figmaData.document?.children || []).find((p) => p.id === pageId);
    const pageName = selectedPage?.name || pageId || "";
    const analysisData = extractAnalysisData(figmaData, pageId);

    // 4b. 提取辅助姓名识别的元数据（filename + cover texts，作为版本历史的备用）
    const fileName = figmaData.name || "";

    // 4c. 提取封面 Frame（最可能含署名）的文字，专门给 Claude 识别姓名
    const firstPage = figmaData.document?.children?.[0];
    const coverFrame = (selectedPage || firstPage)?.children?.find(
      (n) => (n.type === "FRAME" || n.type === "COMPONENT") &&
             /cover|封面|首页|title|intro/i.test(n.name)
    ) || (selectedPage || firstPage)?.children?.[0];
    const coverTexts = coverFrame ? extractTexts(coverFrame, [], 20) : [];

    // 5. 调用 Claude 分析
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1800,
      messages: [
        {
          role: "user",
          content: `你是一位资深 UI/UX 设计审核专家，专门判断 Figma 设计稿是否由 AI 工具（Galileo AI、Uizard、Figma AI 等）自动生成。

以下是从 Figma 文件提取的设计结构数据：
\`\`\`json
${JSON.stringify(analysisData, null, 2)}
\`\`\`

请从以下维度判断该设计稿的 AI 生成可能性：
1. **图层命名**：是否机械规范（Frame1、Button/Primary、Group 123）
2. **组件结构**：是否高度模板化、层级过于整齐
3. **文字内容**：是否为典型占位符（Lorem ipsum、标题文字、按钮文本）
4. **色彩使用**：是否严格遵循设计系统调色板，缺乏个人审美调整
5. **设计判断**：是否缺乏手工调整痕迹、设计决策是否过于"完美"

---

**附加任务：识别学生姓名（备用，版本历史已单独处理）**

元数据提示：
- Figma 文件名：「${fileName}」
- 封面/首页 Frame 中的文字（最可能含署名）：${coverTexts.length ? JSON.stringify(coverTexts) : "（无）"}

识别规则：
1. 图层文字中的署名、"姓名：XX"、"设计者：XX"、学号旁边的名字
2. 文件名中包含的人名（如「张三的作业」→「张三」；「HCI_WeiChen」→「Wei Chen」）
3. 无法识别则返回 null

请严格以如下 JSON 格式返回，不要有任何其他文字：
{
  "studentName": <识别到的学生姓名字符串，无法识别则返回 null>,
  "studentNameSource": <"layer"（来自图层文字）| "filename"（来自文件名）| null>,
  "overallScore": <0-100 整数，越高越像 AI 生成>,
  "label": <"高度疑似AI" | "部分疑似" | "原创可信">,
  "summary": <2-3 句综合评价>,
  "frames": [
    {
      "name": <Frame 名称>,
      "score": <0-100>,
      "flags": [<具体发现的 AI 特征，1-3 条>]
    }
  ]
}`,
        },
      ],
    });

    // 6. 解析 Claude 返回
    const raw = message.content[0].text;
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return NextResponse.json({ error: "分析结果解析失败，请重试" }, { status: 500 });
      result = JSON.parse(m[0]);
    }

    // 6b. 将 Figma frame nodeId 注入到每个 frame 结果，供后续获取缩略图使用
    const pageFrames = (selectedPage?.children || [])
      .filter((n) => n.type === "FRAME" || n.type === "COMPONENT")
      .slice(0, 8);
    const frameIdMap = Object.fromEntries(pageFrames.map((f) => [f.name, f.id]));
    if (Array.isArray(result.frames)) {
      result.frames = result.frames.map((f) => ({
        ...f,
        nodeId: frameIdMap[f.name] ?? null,
      }));
    }

    // 6c. 学生姓名优先级：版本历史编辑者 > 图层文字(Claude) > 文件名(Claude) > null
    // 版本历史是最可靠的来源（真实Figma操作记录），直接覆盖Claude的结果
    if (versionHistoryName) {
      result.studentName = versionHistoryName;
      result.studentNameSource = "version_history";
    }
    // 否则保留 Claude 识别到的 layer / filename 结果（或 null，由老师手动填写）

    // 7. 返回分析结果（保存由前端在 Step 3 确认后调用 /api/save-scan 完成）
    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze-figma]", err);
    return NextResponse.json({ error: err.message || "分析失败，请重试" }, { status: 500 });
  }
}
