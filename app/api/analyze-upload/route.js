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

// ─── Prompt builders ──────────────────────────────────────────────────────────

/** PDF = almost always a design document, use the design-focused prompt. */
function buildPdfPrompt(nameHint) {
  return `你是一位资深 UI/UX 设计审核专家，专门判断设计稿是否由 AI 工具（Galileo AI、Uizard、Figma AI、Musho 等）自动生成。

请分析上方的 PDF 设计稿，文件名：${nameHint}

从以下维度评估其 AI 生成可能性：
1. 布局与间距：组件是否高度规范，间距是否机械等分
2. 组件结构：是否高度模板化，像从设计系统直接生成
3. 文字内容：是否使用 Lorem ipsum、示例按钮文字等 AI 占位符
4. 色彩使用：配色是否严格遵循某种调色板，缺乏个人审美
5. 整体原创性：是否缺乏手工调整痕迹和个人设计风格

该 PDF 可能包含多页，请逐页（或按主要区域）分析，在 frames 中每页一条记录。

学生姓名识别（best-effort）：
- 文件名「${nameHint}」中是否包含人名？（如「张三的作业」→「张三」；「HCI_WeiChen」→「Wei Chen」）
- 设计稿中是否有署名、设计者XX、作者XX、学号旁边的名字？
- 无法识别则返回 null

━━━ 输出格式要求（严格遵守，违反会导致系统崩溃）━━━

1. 只输出一个 JSON 对象，前后不得有任何文字或 markdown 代码块。
2. 所有字符串值内部【禁止使用英文双引号 "】，改用「」或（）。
3. 每个字符串必须写在同一行，不能换行。
4. 不得有尾随逗号。
5. flags 数组中每条字符串独立，不要嵌套数组。

detectionType 固定填 "ui_ai"（PDF 默认为设计稿检测）；imageType 固定填 "ui_design"。

输出示例：
{"studentName":null,"studentNameSource":null,"detectionType":"ui_ai","imageType":"ui_design","overallScore":72,"label":"高度疑似AI","summary":"图层命名高度规范，文字内容使用占位符，配色严格遵循调色板。整体缺乏手工调整痕迹，AI生成可能性较高。","frames":[{"name":"第1页","score":75,"flags":["组件间距机械等分","配色仅使用三种预设颜色","文字内容为模板占位符"]},{"name":"第2页","score":68,"flags":["按钮样式高度统一","缺乏手工微调痕迹"]}]}

现在请分析上述 PDF 并返回同结构的 JSON：`;
}

/** Image = dual detection: UI design AI + image generation AI. */
function buildImagePrompt(nameHint) {
  return `你是一位既擅长 UI/UX 设计审核、又精通 AI 图像鉴定的专家。请分析上传的图片（文件名：${nameHint}），完成双重 AI 生成检测。

━━━ 第一步：判断图片类型 ━━━
先判断这张图片属于哪类，填入 imageType 字段：
- ui_design：界面截图、原型图、App/网页设计稿、线框图
- artwork：照片、插画、海报、绘画、摄影作品、艺术图像
- mixed：同时包含 UI 设计界面和图像内容

━━━ 第二步：针对性 AI 生成检测 ━━━

【检测 A：UI 设计 AI 工具特征（适用于 ui_design 或 mixed）】
工具范围：Galileo AI、Figma AI、Canva AI、Uizard、Musho 等
检测维度：
1. 布局与间距：是否过于完美对称，组件间距机械等分
2. 组件规范度：UI 元素是否高度模板化，像从设计系统直接生成
3. 文字内容：是否使用 Lorem ipsum、通用示例按钮文字等占位符
4. 配色方案：是否严格遵循某种调色板，缺乏个人审美取舍
5. 整体原创性：是否缺乏手工调整痕迹和个人设计风格

【检测 B：AI 图像生成工具特征（适用于 artwork 或 mixed）】
工具范围：Midjourney、DALL-E、Stable Diffusion、Adobe Firefly、Sora 等
检测维度（逐项检查，发现即记录）：
1. 皮肤与肌理：皮肤是否过于光滑完美，毛孔/细纹/汗毛异常消失
2. 手部细节：手指数量是否异常（常见6指或手指融合），关节形态是否不自然
3. 背景一致性：背景是否存在重复图案、模糊不清，或与主体光影逻辑矛盾
4. 光影方向：同一场景中是否存在多个矛盾光源，阴影方向是否不一致
5. 文字可读性：图中文字是否扭曲、字母形状异常、出现无意义字符组合
6. 构图完美度：构图是否过于对称完美，缺乏真实场景的自然随机感
7. 笔触均匀度（插画）：线条是否过于光滑均匀，缺乏手绘的力道变化和不规则感
8. 边缘与细节：头发/毛发/眼睫毛边缘是否出现奇异融合或像素化

━━━ 第三步：综合评分逻辑 ━━━
detectionType 说明主要问题来源：
- ui_ai：主要是 AI UI 设计工具特征
- image_ai：主要是 AI 图像生成工具特征
- both：两类特征均有明显发现
- original：未见明显 AI 特征

overallScore 评分依据：
- 90-100：多项典型特征，几乎确定为 AI 生成
- 70-89：明显特征，高度疑似
- 40-69：部分特征，无法确定
- 0-39：未见明显特征，倾向原创

frames 数组：按图片的主要内容区域划分（如人物主体/背景/文字区域/UI界面区域），每个区域单独评分和列举证据。

学生姓名识别（best-effort）：
- 文件名「${nameHint}」中是否包含人名？（如「张三的作业」→「张三」；「HCI_WeiChen」→「Wei Chen」）
- 图片中是否有署名、作者信息、学号旁边的名字？
- 无法识别则返回 null

━━━ 输出格式要求（严格遵守，违反会导致系统崩溃）━━━

1. 只输出一个 JSON 对象，前后不得有任何文字或 markdown 代码块。
2. 所有字符串值内部【禁止使用英文双引号 "】，改用「」或（）。
3. 每个字符串必须写在同一行，不能换行。
4. 不得有尾随逗号。
5. flags 数组中每条字符串独立，不要嵌套数组。

输出示例A（AI生成图像）：
{"studentName":null,"studentNameSource":null,"detectionType":"image_ai","imageType":"artwork","overallScore":85,"label":"高度疑似AI","summary":"图片存在多项AI图像生成特征：皮肤质感异常光滑，手部出现6根手指，背景有重复纹理，光影方向前后矛盾。综合判断为AI图像生成工具（如Midjourney或DALL-E）输出，非真实照片或手绘作品。","frames":[{"name":"人物主体","score":90,"flags":["皮肤过于光滑，毛孔细节完全消失","右手清晰可见6根手指","发际线边缘出现AI融合特征"]},{"name":"背景区域","score":78,"flags":["背景存在重复纹理图案","光源方向与人物阴影矛盾"]}]}

输出示例B（AI设计稿）：
{"studentName":"张三","studentNameSource":"filename","detectionType":"ui_ai","imageType":"ui_design","overallScore":72,"label":"高度疑似AI","summary":"界面设计存在明显AI设计工具特征：组件间距机械等分，配色严格遵循蓝白调色板，文字内容均为模板占位符，缺乏手工调整痕迹。判断为Figma AI或Galileo等工具生成的UI设计稿。","frames":[{"name":"主界面","score":75,"flags":["组件间距完全等分无变化","所有按钮样式高度统一","文字内容为Lorem ipsum占位符"]},{"name":"导航栏","score":68,"flags":["导航项目间距机械规范","配色仅用两种预设颜色"]}]}

现在请分析上方图片并返回同结构的 JSON：`;
}

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

    // ── Two different prompts: PDF stays design-focused; images get dual detection ──
    const prompt = isPDF ? buildPdfPrompt(nameHint) : buildImagePrompt(nameHint);

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
