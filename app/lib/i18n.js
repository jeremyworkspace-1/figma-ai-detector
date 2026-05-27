// ─── Translation dictionary ───────────────────────────────────────────────────
const translations = {
  zh: {
    // Header / auth
    "header.signIn": "登录",
    "header.signUp": "注册",

    // Sidebar
    "sidebar.collapse": "收起",
    "sidebar.expand": "展开",

    // Shared score badges
    "badge.highlyAI": "高度疑似",
    "badge.partialAI": "部分疑似",
    "badge.original": "原创可信",
    "badge.highlyAIFull": "⚠ 高度疑似AI",
    "badge.partialAIFull": "◑ 部分疑似",
    "badge.originalFull": "✓ 原创可信",

    // Detection type badges
    "dtype.ui_ai": "AI设计稿",
    "dtype.image_ai": "AI生成图像",
    "dtype.both": "双重AI特征",

    // Name sources
    "nameSource.version_history": "版本历史",
    "nameSource.layer": "图层文字识别",
    "nameSource.filename": "文件名提取",

    // ── Dashboard ─────────────────────────────────────────────────────────────
    "dashboard.subtitle": "检测概览与最近记录",
    "dashboard.scanned": "已扫描",
    "dashboard.avgAiRate": "平均AI率",
    "dashboard.highRisk": "高风险",
    "dashboard.recentDetections": "最近检测",
    "dashboard.viewAll": "查看全部 →",
    "dashboard.noRecords": "暂无检测记录，",
    "dashboard.startNow": "立即开始检测 →",

    // ── New Scan ──────────────────────────────────────────────────────────────
    "newScan.subtitle": "三步完成 AI 检测与教师审阅，最终保存到 Submissions",
    "newScan.step1": "选择来源",
    "newScan.step2": "审阅证据",
    "newScan.step3": "最终判断",
    "newScan.figmaTab": "🔗  Figma 链接",
    "newScan.uploadTab": "📁  上传文件",
    "newScan.figmaPlaceholder": "粘贴 Figma 分享链接，例如：https://www.figma.com/file/...",
    "newScan.loadingPages": "正在读取页面…",
    "newScan.pasteHint": "粘贴链接后自动显示页面列表",
    "newScan.analyzing": "分析中…",
    "newScan.startScan": "开始检测 →",
    "newScan.dropRelease": "松开以上传",
    "newScan.dropHint": "拖拽文件到此处，或点击选择",
    "newScan.dropFormat": "支持 PDF、PNG、JPG、WEBP · 最大 8 MB",
    "newScan.removeFile": "移除文件",
    "newScan.pdfDoc": "PDF 文档",
    "newScan.pngImg": "PNG 图片",
    "newScan.jpegImg": "JPEG 图片",
    "newScan.webpImg": "WEBP 图片",
    "newScan.back": "← 重新输入",
    "newScan.reviewedFrames": "已审阅帧",
    "newScan.next": "下一步 →",
    "newScan.overallResult": "综合检测结果",
    "newScan.noFrames": "没有可审阅的区域",
    "newScan.toFinalJudgment": "进入最终判断 →",
    "newScan.backToReview": "← 返回审阅",
    "newScan.studentName": "👤 学生姓名",
    "newScan.autoDetected": "✨ 自动识别 ·",
    "newScan.studentNamePlaceholder": "输入学生姓名…",
    "newScan.reviewSummary": "📋 审阅汇总",
    "newScan.finalJudgment": "⚖️ 最终判断",
    "newScan.teacherNote": "💬 给学生的备注",
    "newScan.optional": "（可选）",
    "newScan.teacherNotePlaceholder": "例如：请于下周前提交原创设计稿，或附上设计过程草图供核查…",
    "newScan.saving": "保存中…",
    "newScan.saveRecord": "确认保存 →",
    "newScan.pleaseSelect": "请先选择最终判断再保存",
    "newScan.savedTitle": "记录已保存",
    "newScan.savedDesc": "检测结果、帧审阅记录和最终判断已写入数据库，可在 Submissions 页面查看完整记录。",
    "newScan.viewSubmissions": "查看 Submissions →",
    "newScan.newScan": "新建检测",
    "newScan.uploadedFile": "上传文件",
    "newScan.framesReviewed": "已审阅 {0}/{1} 帧",
    "newScan.confirmedAI": "· {0} 帧确认AI",
    "newScan.confirmedOriginal": "· {0} 帧确认原创",

    // Judgment options
    "judgment.ai.label": "确认为AI生成内容",
    "judgment.ai.desc": "设计稿由 AI 工具生成，建议要求重做或按规处理",
    "judgment.original.label": "原创作品，误报",
    "judgment.original.desc": "AI 检测误判，该作品为学生原创，正常通过",
    "judgment.unclear.label": "待定，需进一步核查",
    "judgment.unclear.desc": "证据不足，需与学生面谈后再作最终判断",

    // ── Submissions ───────────────────────────────────────────────────────────
    "submissions.subtitle": "审阅每份设计稿的检测证据，填写学生姓名，记录你的判断",
    "submissions.count": "共 {0} 条记录",
    "submissions.noRecords": "暂无检测记录，",
    "submissions.startNow": "立即开始检测 →",
    "submissions.noName": "未填写学生姓名",
    "submissions.saved": "✓ 已保存",
    "submissions.viewFile": "🔗 查看文件",
    "submissions.clickToEdit": "点击编辑姓名",
    "submissions.aiAssessment": "🤖 AI 综合评价",
    "submissions.frameProgress": "FRAME 审阅进度",
    "submissions.framesRecorded": "{0} / {1} 帧已记录",
    "submissions.reviewComplete": "✓ 审阅完成",
    "submissions.reviewed": "审阅 {0}/{1}",
    "submissions.noFrameAnalysis": "暂无 Frame 级分析（此记录可能由旧版本生成）",
    "submissions.scoreLegend": "评分说明",
    "submissions.score0desc": "原创可信，手工设计特征明显",
    "submissions.score40desc": "部分疑似，建议当面询问",
    "submissions.score70desc": "高度疑似AI生成，需进一步核查",

    // ── FrameReviewCard ───────────────────────────────────────────────────────
    // Action badge text
    "action.confirm_original.text": "确认为原创",
    "action.confirm_partial_ai.text": "确认为部分AI",
    "action.confirm_full_ai.text": "确认为AI生成",
    "action.flag_suspicious.text": "已标记为可疑",
    "action.confirm.text": "已确认",
    "action.override.text": "教师已复核",
    "action.default.text": "未审阅",

    // Button labels (keyed for BUTTONS config)
    "btn.confirmOriginal": "确认原创",
    "btn.flagSuspicious": "我觉得有问题",
    "btn.confirmFullAI": "确认AI生成",
    "btn.iThinkOriginal": "我觉得是原创",
    "btn.confirmPartialAI": "确认部分AI",
    "btn.confirmFullAI2": "确认完全AI生成",

    // Misc card strings
    "frame.evidenceFlags": "📋 证据标记",
    "frame.pleaseExplain": "— 请说明判断依据",
    "frame.flagPlaceholder": "例如：图层命名异常整齐、文字内容为模板占位符，怀疑为 AI 生成…",
    "frame.originalPlaceholder": "例如：该画面有明显手绘草图痕迹，与 AI 风格差异较大…",
    "frame.cancel": "取消",
    "frame.saving": "保存中…",
    "frame.confirmSubmit": "确认提交",
  },

  en: {
    // Header / auth
    "header.signIn": "Sign In",
    "header.signUp": "Sign Up",

    // Sidebar
    "sidebar.collapse": "Collapse",
    "sidebar.expand": "Expand",

    // Shared score badges
    "badge.highlyAI": "Highly Suspected",
    "badge.partialAI": "Partial",
    "badge.original": "Original",
    "badge.highlyAIFull": "⚠ Highly Suspected AI",
    "badge.partialAIFull": "◑ Partially Suspected",
    "badge.originalFull": "✓ Likely Original",

    // Detection type badges
    "dtype.ui_ai": "AI Design",
    "dtype.image_ai": "AI Image",
    "dtype.both": "Dual AI",

    // Name sources
    "nameSource.version_history": "Version History",
    "nameSource.layer": "Layer Text",
    "nameSource.filename": "Filename",

    // ── Dashboard ─────────────────────────────────────────────────────────────
    "dashboard.subtitle": "Detection overview and recent records",
    "dashboard.scanned": "Scanned",
    "dashboard.avgAiRate": "Avg AI Rate",
    "dashboard.highRisk": "High Risk",
    "dashboard.recentDetections": "Recent Detections",
    "dashboard.viewAll": "View All →",
    "dashboard.noRecords": "No records yet. ",
    "dashboard.startNow": "Start scanning →",

    // ── New Scan ──────────────────────────────────────────────────────────────
    "newScan.subtitle": "Three steps: AI detection, teacher review, and save to Submissions",
    "newScan.step1": "Select Source",
    "newScan.step2": "Review Evidence",
    "newScan.step3": "Final Judgment",
    "newScan.figmaTab": "🔗  Figma Link",
    "newScan.uploadTab": "📁  Upload File",
    "newScan.figmaPlaceholder": "Paste Figma share link, e.g.: https://www.figma.com/file/...",
    "newScan.loadingPages": "Loading pages…",
    "newScan.pasteHint": "Page list appears after pasting link",
    "newScan.analyzing": "Analyzing…",
    "newScan.startScan": "Start Scan →",
    "newScan.dropRelease": "Drop to upload",
    "newScan.dropHint": "Drag file here or click to select",
    "newScan.dropFormat": "Supports PDF, PNG, JPG, WEBP · Max 8 MB",
    "newScan.removeFile": "Remove File",
    "newScan.pdfDoc": "PDF Document",
    "newScan.pngImg": "PNG Image",
    "newScan.jpegImg": "JPEG Image",
    "newScan.webpImg": "WEBP Image",
    "newScan.back": "← Re-enter",
    "newScan.reviewedFrames": "Reviewed Frames",
    "newScan.next": "Next →",
    "newScan.overallResult": "Overall Detection Result",
    "newScan.noFrames": "No regions to review",
    "newScan.toFinalJudgment": "Proceed to Final Judgment →",
    "newScan.backToReview": "← Back to Review",
    "newScan.studentName": "👤 Student Name",
    "newScan.autoDetected": "✨ Auto-detected ·",
    "newScan.studentNamePlaceholder": "Enter student name…",
    "newScan.reviewSummary": "📋 Review Summary",
    "newScan.finalJudgment": "⚖️ Final Judgment",
    "newScan.teacherNote": "💬 Note for Student",
    "newScan.optional": "(Optional)",
    "newScan.teacherNotePlaceholder": "e.g.: Please submit original design files or process sketches by next week for verification…",
    "newScan.saving": "Saving…",
    "newScan.saveRecord": "Save Record →",
    "newScan.pleaseSelect": "Please select a final judgment before saving",
    "newScan.savedTitle": "Record Saved",
    "newScan.savedDesc": "Detection results, frame reviews, and final judgment have been saved. View the full record on the Submissions page.",
    "newScan.viewSubmissions": "View Submissions →",
    "newScan.newScan": "New Scan",
    "newScan.uploadedFile": "Uploaded File",
    "newScan.framesReviewed": "Reviewed {0}/{1} frames",
    "newScan.confirmedAI": "· {0} frame(s) AI",
    "newScan.confirmedOriginal": "· {0} frame(s) original",

    // Judgment options
    "judgment.ai.label": "Confirmed AI-Generated",
    "judgment.ai.desc": "The design was generated by an AI tool. Consider requiring a redo or taking action.",
    "judgment.original.label": "Original — False Positive",
    "judgment.original.desc": "AI detection was incorrect. This is the student's genuine original work.",
    "judgment.unclear.label": "Pending — Further Review Needed",
    "judgment.unclear.desc": "Insufficient evidence. Schedule a follow-up with the student before deciding.",

    // ── Submissions ───────────────────────────────────────────────────────────
    "submissions.subtitle": "Review detection evidence, add student names, and record your judgment",
    "submissions.count": "{0} records",
    "submissions.noRecords": "No records yet. ",
    "submissions.startNow": "Start scanning →",
    "submissions.noName": "No student name",
    "submissions.saved": "✓ Saved",
    "submissions.viewFile": "🔗 View File",
    "submissions.clickToEdit": "Click to edit name",
    "submissions.aiAssessment": "🤖 AI Assessment",
    "submissions.frameProgress": "FRAME REVIEW PROGRESS",
    "submissions.framesRecorded": "{0} / {1} frames recorded",
    "submissions.reviewComplete": "✓ Complete",
    "submissions.reviewed": "Reviewed {0}/{1}",
    "submissions.noFrameAnalysis": "No frame-level analysis (record may be from an older version)",
    "submissions.scoreLegend": "Score Legend",
    "submissions.score0desc": "Likely original — strong handmade design traits",
    "submissions.score40desc": "Partially suspected — recommend in-person follow-up",
    "submissions.score70desc": "Highly suspected AI-generated — further investigation required",

    // ── FrameReviewCard ───────────────────────────────────────────────────────
    "action.confirm_original.text": "Confirmed Original",
    "action.confirm_partial_ai.text": "Confirmed Partial AI",
    "action.confirm_full_ai.text": "Confirmed AI",
    "action.flag_suspicious.text": "Flagged Suspicious",
    "action.confirm.text": "Confirmed",
    "action.override.text": "Teacher Reviewed",
    "action.default.text": "Not Reviewed",

    "btn.confirmOriginal": "Confirm Original",
    "btn.flagSuspicious": "Flag as Suspicious",
    "btn.confirmFullAI": "Confirm AI",
    "btn.iThinkOriginal": "I Think It's Original",
    "btn.confirmPartialAI": "Confirm Partial AI",
    "btn.confirmFullAI2": "Confirm Fully AI",

    "frame.evidenceFlags": "📋 Evidence",
    "frame.pleaseExplain": "— Please explain your reasoning",
    "frame.flagPlaceholder": "e.g.: Layer naming suspiciously uniform, text content uses placeholders — suspected AI generation…",
    "frame.originalPlaceholder": "e.g.: Clear hand-drawn sketch traces visible, style differs significantly from AI output…",
    "frame.cancel": "Cancel",
    "frame.saving": "Saving…",
    "frame.confirmSubmit": "Confirm",
  },
};

// ─── t() factory ─────────────────────────────────────────────────────────────
// Returns a translator function bound to a specific language.
// Supports simple positional interpolation: t("key", arg0, arg1) → "{0}" → arg0
export function createT(lang) {
  const dict = translations[lang] ?? translations.zh;
  return (key, ...args) => {
    const str = dict[key] ?? translations.zh[key] ?? key;
    return args.reduce((s, v, i) => s.replace(`{${i}}`, String(v)), str);
  };
}
