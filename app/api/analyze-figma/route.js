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

    // 3. 获取 Figma 文件数据
    const figmaRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { "X-Figma-Token": process.env.FIGMA_TOKEN },
    });

    if (!figmaRes.ok) {
      const err = await figmaRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Figma API 错误: ${err.err || figmaRes.statusText}` },
        { status: figmaRes.status }
      );
    }

    const figmaData = await figmaRes.json();

    // 4. 提取分析数据（只分析选中的 page）
    const selectedPage = (figmaData.document?.children || []).find((p) => p.id === pageId);
    const pageName = selectedPage?.name || pageId || "";
    const analysisData = extractAnalysisData(figmaData, pageId);

    // 5. 调用 Claude 分析
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
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

请严格以如下 JSON 格式返回，不要有任何其他文字：
{
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

    // 7. 保存到 Supabase（fire-and-forget，不阻塞响应）
    supabase.from("scans").insert({
      user_id:      userId ?? null,
      student_name: figmaData.name ?? null,
      figma_url:    figmaUrl,
      page_name:    pageName,
      ai_score:     result.overallScore,
      analysis:     result,
    }).then(({ error }) => {
      if (error) console.error("[analyze-figma] supabase insert:", error.message);
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze-figma]", err);
    return NextResponse.json({ error: err.message || "分析失败，请重试" }, { status: 500 });
  }
}
