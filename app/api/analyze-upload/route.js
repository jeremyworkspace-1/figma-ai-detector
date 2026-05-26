import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

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

请分析上方的设计稿${isPDF ? "（PDF 文件）" : "（图片）"}，文件名：「${nameHint}」

从以下维度评估其 AI 生成可能性：
1. **视觉风格**：布局是否过于"完美"和模板化，缺乏手工调整痕迹
2. **UI 元素**：组件是否高度规范，间距是否机械等分，像从设计系统直接生成
3. **文字内容**：是否使用典型 AI 占位符（Lorem ipsum、示例按钮文字、过于模板化的标题）
4. **色彩使用**：配色是否严格遵循某种调色板，缺乏个人审美选择
5. **原创性判断**：设计决策是否过于"标准"，是否缺乏独特的个人风格痕迹

${isPDF
  ? "该 PDF 可能包含多页，请逐页（或按主要区域）分析，在 frames 中每页一条记录。"
  : "该图片可能包含多个设计区域，请识别主要区域分别评估，在 frames 中每个区域一条记录。"}

**学生姓名识别（best-effort）：**
- 文件名「${nameHint}」中是否包含人名？（如「张三的作业」→「张三」；「HCI_WeiChen」→「Wei Chen」）
- 设计稿中是否有署名、"设计者：XX"、"作者：XX"、学号旁边的名字？
- 无法识别则返回 null

请严格以如下 JSON 格式返回，不要有任何其他文字：
{
  "studentName": <识别到的学生姓名，无法识别则返回 null>,
  "studentNameSource": <"filename" | "layer" | null>,
  "overallScore": <0-100 整数，越高越像 AI 生成>,
  "label": <"高度疑似AI" | "部分疑似" | "原创可信">,
  "summary": <2-3 句综合评价>,
  "frames": [
    {
      "name": <区域/页面名称，如"整体布局"、"第 1 页"、"首页设计"、"登录界面"等>,
      "score": <0-100>,
      "flags": [<具体发现的 AI 特征，1-3 条>]
    }
  ]
}`;

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

    // ── Parse response ───────────────────────────────────────────────────────
    const raw = message.content[0].text;
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) {
        return NextResponse.json({ error: "分析结果解析失败，请重试" }, { status: 500 });
      }
      result = JSON.parse(m[0]);
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
