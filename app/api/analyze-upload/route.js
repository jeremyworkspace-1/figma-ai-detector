import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { parseClaudeJSON } from "../../lib/parseClaudeJSON";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB server-side hard limit

// ─── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    await auth(); // validate session (userId not needed for this route)

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "服务端未配置 ANTHROPIC_API_KEY" }, { status: 500 });
    }

    // Parse multipart form data
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "请求格式错误，请重新上传" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    }

    const mimeType = file.type;
    const fileName = file.name || "未知文件";

    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "仅支持 PDF、PNG、JPG、WEBP 格式" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "文件超过 10 MB 限制，请压缩后重试" },
        { status: 400 }
      );
    }

    const base64 = buffer.toString("base64");
    const isPDF  = mimeType === "application/pdf";

    // ── Build content block ──────────────────────────────────────────────────
    const fileBlock = isPDF
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: base64 },
        };

    // Strip extension for cleaner name hint
    const nameHint = fileName.replace(/\.[^.]+$/, "");

    const prompt = `你是一位资深 UI/UX 设计审核专家，专门判断设计稿是否由 AI 工具（Galileo AI、Uizard、Figma AI、Musho 等）自动生成。

请分析上方的设计稿${isPDF ? "（PDF 文件）" : "（图片）"}，文件名：${nameHint}

从以下维度评估其 AI 生成可能性：
1. 视觉风格：布局是否过于完美和模板化，缺乏手工调整痕迹
2. UI 元素：组件是否高度规范，间距是否机械等分，像从设计系统直接生成
3. 文字内容：是否使用典型 AI 占位符（Lorem ipsum、示例按钮文字、过于模板化的标题）
4. 色彩使用：配色是否严格遵循某种调色板，缺乏个人审美选择
5. 原创性判断：设计决策是否过于标准，是否缺乏独特的个人风格痕迹

${isPDF
  ? "该 PDF 可能包含多页，请逐页（或按主要区域）分析，在 frames 中每页一条记录。"
  : "该图片可能包含多个设计区域，请识别主要区域分别评估，在 frames 中每个区域一条记录。"}

学生姓名识别（best-effort）：
- 文件名「${nameHint}」中是否包含人名？（如「张三的作业」→「张三」；「HCI_WeiChen」→「Wei Chen」）
- 设计稿中是否有署名、设计者XX、作者XX、学号旁边的名字？
- 无法识别则返回 null

━━━ 输出格式要求（严格遵守，违反会导致系统崩溃）━━━

1. 只输出一个 JSON 对象，前后不得有任何文字、说明或 markdown 代码块。
2. 所有字符串值内部【禁止使用英文双引号 "】——如需引用词语，改用「」或（）。
3. 每个字符串必须写在同一行，不能换行。
4. 不得有尾随逗号（如 [1,2,] 或 {"a":1,} 均非法）。
5. flags 数组中每条字符串独立，不要嵌套数组。

输出示例（严格按照此结构，替换为实际分析内容）：
{"studentName":null,"studentNameSource":null,"overallScore":68,"label":"部分疑似","summary":"整体布局较为规范，配色遵循固定调色板。文字内容以模板化短句为主，存在一定AI生成特征。","frames":[{"name":"整体布局","score":70,"flags":["组件间距机械等分","配色仅使用三种预设颜色","按钮样式高度统一"]},{"name":"内容区域","score":65,"flags":["文字内容模板化","缺乏手工微调痕迹"]}]}

现在请分析上述设计稿并返回同结构的 JSON：`;

    // ── Call Claude ──────────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // PDF documents require the pdfs beta; images use the standard API
    const requestParams = {
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: prompt }],
        },
      ],
    };

    const message = isPDF
      ? await anthropic.beta.messages.create(requestParams, {
          headers: { "anthropic-beta": "pdfs-2024-09-25" },
        })
      : await anthropic.messages.create(requestParams);

    // ── Parse response（容错解析器）───────────────────────────────────────────
    const raw = message.content[0].text.trim();
    const result = parseClaudeJSON(raw);
    if (result._parsedByFallback) {
      console.warn("[analyze-upload] used fallback parser, raw response:", raw.slice(0, 300));
    }

    // Ensure frames exist and mark nodeId as null (no Figma node)
    if (!Array.isArray(result.frames)) result.frames = [];
    result.frames = result.frames.map((f) => ({ ...f, nodeId: null }));

    // Tag as upload source
    result.sourceType = "upload";
    result.fileName   = fileName;

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze-upload]", err);
    return NextResponse.json(
      { error: err.message || "分析失败，请重试" },
      { status: 500 }
    );
  }
}
