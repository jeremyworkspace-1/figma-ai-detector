"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FrameReviewCard, getActionMeta } from "../components/FrameReviewCard";

const FIGMA_URL_RE = /figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB client-side guard
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

const NAME_SOURCE_LABEL = {
  version_history: "版本历史",
  layer:           "图层文字识别",
  filename:        "文件名提取",
};

const JUDGMENT_OPTIONS = [
  {
    value: "ai",
    icon:  "🚫",
    label: "确认为AI生成内容",
    desc:  "设计稿由 AI 工具生成，建议要求重做或按规处理",
    color: "#ef4444",
    bg:    "#fef2f2",
    border:"#fecaca",
  },
  {
    value: "original",
    icon:  "✅",
    label: "原创作品，误报",
    desc:  "AI 检测误判，该作品为学生原创，正常通过",
    color: "#16a34a",
    bg:    "#f0fdf4",
    border:"#bbf7d0",
  },
  {
    value: "unclear",
    icon:  "❓",
    label: "待定，需进一步核查",
    desc:  "证据不足，需与学生面谈后再作最终判断",
    color: "#d97706",
    bg:    "#fffbeb",
    border:"#fde68a",
  },
];

// ─── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = [
    { label: "选择来源" },
    { label: "审阅证据" },
    { label: "最终判断" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", marginBottom: 32 }}>
      {steps.flatMap((s, i) => {
        const num    = i + 1;
        const done   = num < current;
        const active = num === current;
        const elems  = [
          <div key={`s${num}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 88 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: done || active ? "#2563eb" : "#f1f5f9",
              border: `2px solid ${done || active ? "#2563eb" : "#cbd5e1"}`,
              color: done || active ? "#fff" : "#94a3b8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: done ? 15 : 13, fontWeight: 700,
              transition: "all .3s",
            }}>
              {done ? "✓" : num}
            </div>
            <span style={{
              fontSize: 11, fontWeight: active ? 700 : 400, textAlign: "center", lineHeight: 1.3,
              color: active ? "#2563eb" : done ? "#475569" : "#94a3b8",
            }}>{s.label}</span>
          </div>,
        ];
        if (i < steps.length - 1) {
          elems.push(
            <div key={`l${num}`} style={{
              width: 52, height: 2, marginTop: 15, flexShrink: 0,
              background: done ? "#2563eb" : "#e2e8f0",
              transition: "background .3s",
            }} />
          );
        }
        return elems;
      })}
    </div>
  );
}

// ─── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const label = score >= 70 ? "高度疑似" : score >= 40 ? "部分疑似" : "原创可信";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset .8s ease" }} />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size * 0.22} fontWeight="700"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontFamily: "monospace" }}>
          {score}%
        </text>
      </svg>
      <span style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: .8 }}>{label}</span>
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = "#2563eb", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin .8s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── PDF icon ─────────────────────────────────────────────────────────────────
function IconPDF() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
      stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <text x="6" y="18" fontSize="5" fill="#ef4444" stroke="none" fontWeight="bold">PDF</text>
    </svg>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NewScan() {
  const router = useRouter();

  // ── Step ────────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Input mode (figma | upload) ─────────────────────────────────────────────
  const [inputMode,        setInputMode]        = useState("figma");

  // ── Step 1 – Figma state ────────────────────────────────────────────────────
  const [figmaUrl,       setFigmaUrl]       = useState("");
  const [pages,          setPages]          = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [pagesLoading,   setPagesLoading]   = useState(false);
  const [pagesError,     setPagesError]     = useState("");

  // ── Step 1 – Upload state ────────────────────────────────────────────────────
  const [uploadFile,       setUploadFile]       = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);
  const [isDragOver,       setIsDragOver]       = useState(false);
  const fileInputRef = useRef(null);
  // Track blob URL in a ref so we can revoke without stale-closure issues
  const blobUrlRef = useRef(null);

  // ── Shared analysis state ────────────────────────────────────────────────────
  const [analyzing,    setAnalyzing]    = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // ── Step 2 state ─────────────────────────────────────────────────────────────
  const [result,       setResult]       = useState(null);
  const [thumbnails,   setThumbnails]   = useState({});
  const [thumbLoading, setThumbLoading] = useState(false);
  const [frameReviews, setFrameReviews] = useState({});

  // ── Step 3 state ─────────────────────────────────────────────────────────────
  const [studentName,   setStudentName]   = useState("");
  const [finalJudgment, setFinalJudgment] = useState("");
  const [teacherNote,   setTeacherNote]   = useState("");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [savedId,       setSavedId]       = useState(null);

  // Revoke blob URL when component unmounts
  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  // ── Auto-fetch Figma pages when URL looks valid ───────────────────────────────
  useEffect(() => {
    if (!FIGMA_URL_RE.test(figmaUrl)) {
      setPages([]); setSelectedPageId(""); setPagesError(""); return;
    }
    const timer = setTimeout(async () => {
      setPagesLoading(true); setPagesError(""); setPages([]); setSelectedPageId("");
      try {
        const res  = await fetch("/api/figma-pages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ figmaUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "获取页面失败");
        setPages(data.pages || []);
        if (data.pages?.length > 0) setSelectedPageId(data.pages[0].id);
      } catch (err) {
        setPagesError(err.message);
      } finally {
        setPagesLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [figmaUrl]);

  // ── Upload: process a chosen File ────────────────────────────────────────────
  const processFile = (f) => {
    setAnalyzeError("");
    if (!ALLOWED_MIME.includes(f.type)) {
      setAnalyzeError("仅支持 PDF、PNG、JPG、WEBP 格式");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setAnalyzeError(`文件超过 8 MB，请压缩后重试（当前 ${(f.size / 1024 / 1024).toFixed(1)} MB）`);
      return;
    }
    // Revoke previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setUploadFile(f);
    if (f.type !== "application/pdf") {
      const url = URL.createObjectURL(f);
      blobUrlRef.current = url;
      setUploadPreviewUrl(url);
    } else {
      setUploadPreviewUrl(null);
    }
  };

  const clearUpload = () => {
    setUploadFile(null);
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setUploadPreviewUrl(null);
    setAnalyzeError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ── After analysis: shared setup ─────────────────────────────────────────────
  const applyResult = (data) => {
    setResult(data);
    setFrameReviews({});
    setStudentName(data.studentName || "");
    setFinalJudgment(data.overallScore >= 70 ? "ai" : data.overallScore < 40 ? "original" : "");
    setStep(2);
  };

  // ── Step 1 → Step 2: Figma analysis ──────────────────────────────────────────
  const handleAnalyzeFigma = async () => {
    if (!figmaUrl.trim() || !selectedPageId || analyzing) return;
    setAnalyzing(true); setAnalyzeError("");
    try {
      const res  = await fetch("/api/analyze-figma", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl, pageId: selectedPageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");

      applyResult(data);
      setThumbnails({});

      // Fetch Figma frame thumbnails in the background
      const nodeIds = (data.frames || []).map((f) => f.nodeId).filter(Boolean);
      if (nodeIds.length > 0) {
        setThumbLoading(true);
        fetch("/api/figma-images", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ figmaUrl, nodeIds }),
        })
          .then((r) => r.json())
          .then((d) => setThumbnails(d.images || {}))
          .catch(console.error)
          .finally(() => setThumbLoading(false));
      }
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 1 → Step 2: Upload analysis ─────────────────────────────────────────
  const handleAnalyzeUpload = async () => {
    if (!uploadFile || analyzing) return;
    setAnalyzing(true); setAnalyzeError("");
    try {
      const body = new FormData();
      body.append("file", uploadFile);
      const res  = await fetch("/api/analyze-upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");

      applyResult(data);
      setThumbnails({});
      setThumbLoading(false);
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Frame review handler (local state only, saved at Step 3) ──────────────────
  const handleFrameReview = (frameName, action, note) => {
    setFrameReviews((prev) => {
      if (action === null) {
        const next = { ...prev }; delete next[frameName]; return next;
      }
      return { ...prev, [frameName]: { action, note, reviewedAt: new Date().toISOString() } };
    });
  };

  // ── Step 3: save to DB ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!finalJudgment) return;
    setSaving(true); setSaveError("");
    try {
      const isUpload   = result?.sourceType === "upload";
      const selectedPage = pages.find((p) => p.id === selectedPageId);
      const res = await fetch("/api/save-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl:     isUpload ? null : figmaUrl,
          fileName:     isUpload ? (uploadFile?.name || result.fileName) : null,
          pageName:     isUpload ? (result.fileName || "") : (selectedPage?.name || ""),
          result,
          studentName,
          frameReviews,
          finalJudgment,
          teacherNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setSavedId(data.id);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Reset everything ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep(1); setResult(null); setThumbnails({}); setFrameReviews({});
    setStudentName(""); setFinalJudgment(""); setTeacherNote("");
    setSavedId(null); setSaveError(""); setAnalyzeError("");
    setFigmaUrl(""); setPages([]); setSelectedPageId("");
    setInputMode("figma");
    clearUpload();
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const canAnalyzeFigma = figmaUrl.trim() && selectedPageId && !analyzing && !pagesLoading;
  const frames          = result?.frames || [];
  const reviewCount     = Object.keys(frameReviews).length;
  const resultColor     = result
    ? result.overallScore >= 70 ? "#ef4444" : result.overallScore >= 40 ? "#f59e0b" : "#22c55e"
    : "#94a3b8";
  const isUpload        = result?.sourceType === "upload";

  // For uploaded images, use the blob URL as the thumbnail for every frame card
  const getThumbnail = (frame) => {
    if (isUpload) return uploadPreviewUrl || null;
    return thumbnails[frame.nodeId] ?? null;
  };

  // Source label shown in Step 2/3 (page name for Figma, filename for upload)
  const sourceLabel = isUpload
    ? (result?.fileName || "上传文件")
    : (pages.find((p) => p.id === selectedPageId)?.name || "");

  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: "28px 28px 64px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -.5 }}>New Scan</h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          三步完成 AI 检测与教师审阅，最终保存到 Submissions
        </p>
      </div>

      {/* Step indicator */}
      {!savedId && <StepIndicator current={step} />}

      {/* ════════ STEP 1 ════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={{ maxWidth: 560 }}>

          {/* Mode toggle */}
          <div style={{
            display: "flex", marginBottom: 20,
            border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden",
          }}>
            {[
              { key: "figma",  label: "🔗  Figma 链接" },
              { key: "upload", label: "📁  上传文件" },
            ].map((m) => {
              const active = inputMode === m.key;
              return (
                <button key={m.key}
                  onClick={() => { setInputMode(m.key); setAnalyzeError(""); }}
                  style={{
                    flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: active ? 700 : 400,
                    background: active ? "#2563eb" : "#fff",
                    color: active ? "#fff" : "#64748b",
                    transition: "all .18s",
                  }}>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* ─── Figma URL mode ─────────────────────────────────────── */}
          {inputMode === "figma" && (
            <>
              <input type="url" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="粘贴 Figma 分享链接，例如：https://www.figma.com/file/..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 9,
                  border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a",
                  background: "#fff", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box", marginBottom: 8,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
                onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")} />

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Page dropdown */}
                <div style={{ flex: 1 }}>
                  {pagesLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, color: "#94a3b8" }}>
                      <Spinner color="#94a3b8" /> 正在读取页面…
                    </div>
                  ) : pages.length > 0 ? (
                    <select value={selectedPageId} onChange={(e) => setSelectedPageId(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
                        fontSize: 13, color: "#0f172a", background: "#fff", fontFamily: "inherit",
                        outline: "none", cursor: "pointer", appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
                      onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                    >
                      {pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ padding: "10px 14px", borderRadius: 9, border: "1px dashed #e2e8f0", background: "#f8fafc", fontSize: 13, color: "#cbd5e1" }}>
                      粘贴链接后自动显示页面列表
                    </div>
                  )}
                </div>

                <button onClick={handleAnalyzeFigma} disabled={!canAnalyzeFigma} style={{
                  padding: "10px 18px", borderRadius: 9, border: "none",
                  background: canAnalyzeFigma ? "#2563eb" : "#dbeafe",
                  color: canAnalyzeFigma ? "#fff" : "#93c5fd",
                  fontSize: 13, fontWeight: 600,
                  cursor: canAnalyzeFigma ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 6,
                  flexShrink: 0, whiteSpace: "nowrap", transition: "all .15s",
                }}>
                  {analyzing ? <><Spinner color="#fff" /> 分析中…</> : "开始检测 →"}
                </button>
              </div>

              {pagesError && (
                <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#dc2626" }}>
                  ⚠ {pagesError}
                </div>
              )}
            </>
          )}

          {/* ─── Upload mode ──────────────────────────────────────────── */}
          {inputMode === "upload" && (
            <>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileInputChange}
                style={{ display: "none" }}
              />

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={uploadFile ? undefined : () => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragOver ? "#2563eb" : uploadFile ? "#22c55e" : "#e2e8f0"}`,
                  borderRadius: 14,
                  padding: uploadFile ? "20px" : "36px 20px",
                  textAlign: "center",
                  cursor: uploadFile ? "default" : "pointer",
                  background: isDragOver ? "#eff6ff" : uploadFile ? "#f0fdf4" : "#f8fafc",
                  transition: "all .2s",
                  marginBottom: 12,
                }}>
                {uploadFile ? (
                  /* File selected state */
                  <div>
                    {/* Image preview */}
                    {uploadPreviewUrl && (
                      <img
                        src={uploadPreviewUrl}
                        alt="preview"
                        style={{
                          maxHeight: 160, maxWidth: "100%",
                          borderRadius: 8, marginBottom: 12,
                          objectFit: "contain", display: "block", margin: "0 auto 12px",
                        }}
                      />
                    )}
                    {/* PDF icon */}
                    {!uploadPreviewUrl && (
                      <div style={{ marginBottom: 8 }}><IconPDF /></div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
                      {uploadFile.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      &nbsp;·&nbsp;
                      {uploadFile.type === "application/pdf" ? "PDF 文档" :
                       uploadFile.type === "image/png" ? "PNG 图片" :
                       uploadFile.type === "image/jpeg" ? "JPEG 图片" : "WEBP 图片"}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                      style={{
                        padding: "4px 14px", borderRadius: 6,
                        border: "1px solid #fecaca", background: "#fef2f2",
                        color: "#dc2626", fontSize: 12, cursor: "pointer",
                      }}>
                      移除文件
                    </button>
                  </div>
                ) : (
                  /* Empty state */
                  <div>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>
                      {isDragOver ? "📂" : "☁️"}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      {isDragOver ? "松开以上传" : "拖拽文件到此处，或点击选择"}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      支持 PDF、PNG、JPG、WEBP · 最大 8 MB
                    </div>
                  </div>
                )}
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyzeUpload}
                disabled={!uploadFile || analyzing}
                style={{
                  width: "100%", padding: "10px 18px", borderRadius: 9, border: "none",
                  background: uploadFile && !analyzing ? "#2563eb" : "#dbeafe",
                  color: uploadFile && !analyzing ? "#fff" : "#93c5fd",
                  fontSize: 13, fontWeight: 600,
                  cursor: uploadFile && !analyzing ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, transition: "all .15s",
                }}>
                {analyzing ? <><Spinner color="#fff" /> 分析中…</> : "开始检测 →"}
              </button>

              {/* Supported format badges */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {["PDF", "PNG", "JPG", "WEBP"].map((fmt) => (
                  <span key={fmt} style={{
                    padding: "2px 10px", borderRadius: 20, border: "1px solid #e2e8f0",
                    fontSize: 11, color: "#94a3b8", background: "#f8fafc",
                  }}>{fmt}</span>
                ))}
              </div>
            </>
          )}

          {/* Shared error + skeleton */}
          {analyzeError && (
            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#dc2626" }}>
              ⚠ {analyzeError}
            </div>
          )}

          {analyzing && (
            <div style={{ marginTop: 16 }}>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
              {[100, 75, 55].map((w, i) => (
                <div key={i} style={{ height: 13, width: `${w}%`, borderRadius: 7, background: "#e2e8f0", marginBottom: 10, animation: `pulse 1.4s ease-in-out ${i * .15}s infinite` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════ STEP 2: Frame review ════════════════════════════════════════ */}
      {step === 2 && result && (
        <div>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <button
              onClick={() => { setStep(1); setResult(null); setThumbnails({}); setFrameReviews({}); }}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              ← 重新输入
            </button>

            {/* Review progress */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>已审阅帧</span>
                <span style={{ fontFamily: "monospace", color: reviewCount === frames.length && frames.length > 0 ? "#16a34a" : "#64748b" }}>
                  {reviewCount} / {frames.length}
                  {reviewCount === frames.length && frames.length > 0 && " ✓"}
                </span>
              </div>
              <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: frames.length > 0 ? `${(reviewCount / frames.length) * 100}%` : "0%",
                  background: reviewCount === frames.length && frames.length > 0 ? "#22c55e" : "#3b82f6",
                  borderRadius: 3, transition: "width .4s ease",
                }} />
              </div>
            </div>

            <button onClick={() => setStep(3)}
              style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              下一步 →
            </button>
          </div>

          {/* Overall score summary */}
          <div style={{
            background: "#fff", border: `1px solid ${resultColor}30`,
            borderLeft: `3px solid ${resultColor}`, borderRadius: 12,
            padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, marginBottom: 20,
          }}>
            <ScoreRing score={result.overallScore} size={74} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: .5, marginBottom: 3, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                <span>综合检测结果</span>
                {sourceLabel && <span style={{ color: "#cbd5e1" }}>·</span>}
                {sourceLabel && (
                  <span style={{ padding: "1px 7px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", fontSize: 10 }}>
                    {isUpload ? "📁" : "🔗"} {sourceLabel}
                  </span>
                )}
                {result.studentName && (
                  <span style={{ padding: "1px 7px", borderRadius: 20, background: "#e0f2fe", color: "#0284c7", fontWeight: 600, fontSize: 10 }}>
                    👤 {result.studentName}
                    {result.studentNameSource && ` · ${NAME_SOURCE_LABEL[result.studentNameSource] || ""}`}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: resultColor, marginBottom: 5 }}>{result.label}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          </div>

          {/* Frame cards */}
          {frames.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "32px 0" }}>
              没有可审阅的区域
            </div>
          ) : (
            frames.map((frame) => (
              <FrameReviewCard
                key={frame.name}
                frame={frame}
                thumbnail={getThumbnail(frame)}
                thumbLoading={isUpload ? false : thumbLoading}
                review={frameReviews[frame.name] ?? null}
                onReview={(action, note) => handleFrameReview(frame.name, action, note)}
              />
            ))
          )}

          {/* Bottom next button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => setStep(3)}
              style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              进入最终判断 →
            </button>
          </div>
        </div>
      )}

      {/* ════════ STEP 3: Final judgment + save ══════════════════════════════ */}
      {step === 3 && result && !savedId && (
        <div style={{ maxWidth: 640 }}>
          <button onClick={() => setStep(2)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
            ← 返回审阅
          </button>

          {/* Summary card */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20 }}>
            <ScoreRing score={result.overallScore} size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: resultColor, marginBottom: 4 }}>{result.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sourceLabel && (
                  <span style={{ padding: "1px 7px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", fontSize: 11 }}>
                    {isUpload ? "📁" : "🔗"} {sourceLabel}
                  </span>
                )}
                <span>已审阅 {reviewCount}/{frames.length} 帧</span>
                {reviewCount > 0 && (() => {
                  const vals = Object.values(frameReviews);
                  const aiCount = vals.filter((r) =>
                    r.action === "confirm_full_ai" || r.action === "confirm_partial_ai" || r.action === "confirm"
                  ).length;
                  const origCount = vals.filter((r) =>
                    r.action === "confirm_original"
                  ).length;
                  return aiCount > 0 || origCount > 0 ? (
                    <span>
                      {aiCount > 0 && `· ${aiCount} 帧确认AI`}
                      {origCount > 0 && `· ${origCount} 帧确认原创`}
                    </span>
                  ) : null;
                })()}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          </div>

          {/* Student name */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>👤 学生姓名</div>
            {result.studentName && result.studentNameSource && (
              <div style={{ fontSize: 11, color: "#0284c7", marginBottom: 7 }}>
                <span style={{ padding: "2px 8px", borderRadius: 20, background: "#e0f2fe", fontWeight: 600 }}>
                  ✨ 自动识别 · {NAME_SOURCE_LABEL[result.studentNameSource] || result.studentNameSource}
                </span>
              </div>
            )}
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="输入学生姓名…"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8,
                border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          {/* Frame review summary (compact chips) */}
          {frames.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>📋 审阅汇总</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {frames.map((frame) => {
                  const rev  = frameReviews[frame.name];
                  const fc   = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";
                  const meta = getActionMeta(rev?.action);
                  return (
                    <div key={frame.name} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 20, fontSize: 11,
                      background: rev ? meta.bg     : "#f1f5f9",
                      color:      rev ? meta.color  : "#64748b",
                      border:     `1px solid ${rev ? meta.border : "#e2e8f0"}`,
                      fontWeight: 500,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: fc, flexShrink: 0 }} />
                      {frame.name}
                      <span style={{ marginLeft: 2 }}>{rev ? meta.icon : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final judgment */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 12 }}>
              ⚖️ 最终判断 <span style={{ color: "#ef4444" }}>*</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {JUDGMENT_OPTIONS.map((opt) => {
                const selected = finalJudgment === opt.value;
                return (
                  <label key={opt.value} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${selected ? opt.color : "#e2e8f0"}`,
                    background: selected ? opt.bg : "#fafafa",
                    transition: "all .15s",
                  }}>
                    <input type="radio" name="judgment" value={opt.value}
                      checked={selected} onChange={() => setFinalJudgment(opt.value)}
                      style={{ marginTop: 2, accentColor: opt.color }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selected ? opt.color : "#374151", marginBottom: 2 }}>
                        {opt.icon} {opt.label}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Teacher note */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
              💬 给学生的备注 <span style={{ color: "#94a3b8", fontWeight: 400 }}>（可选）</span>
            </div>
            <textarea
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder="例如：请于下周前提交原创设计稿，或附上设计过程草图供核查…"
              rows={3}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8,
                border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a",
                fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
                outline: "none", lineHeight: 1.6,
              }}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          {/* Save button */}
          {saveError && (
            <div style={{ padding: "8px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#dc2626", marginBottom: 12 }}>
              ⚠ {saveError}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !finalJudgment}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none",
              background: finalJudgment && !saving ? "#2563eb" : "#dbeafe",
              color: finalJudgment && !saving ? "#fff" : "#93c5fd",
              fontSize: 15, fontWeight: 700,
              cursor: finalJudgment && !saving ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .15s",
            }}>
            {saving ? <><Spinner color="#fff" /> 保存中…</> : "确认保存 →"}
          </button>
          {!finalJudgment && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
              请先选择最终判断再保存
            </div>
          )}
        </div>
      )}

      {/* ════════ SUCCESS screen ═══════════════════════════════════════════════ */}
      {savedId && (
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>记录已保存</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32, lineHeight: 1.7 }}>
            检测结果、帧审阅记录和最终判断已写入数据库，<br />可在 Submissions 页面查看完整记录。
          </p>

          {/* Summary chips */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
            {studentName && (
              <span style={{ padding: "5px 14px", borderRadius: 20, background: "#f1f5f9", color: "#475569", fontSize: 13, fontWeight: 600 }}>
                👤 {studentName}
              </span>
            )}
            <span style={{ padding: "5px 14px", borderRadius: 20, background: resultColor + "18", color: resultColor, fontSize: 13, fontWeight: 600 }}>
              {result?.overallScore}% · {result?.label}
            </span>
            {finalJudgment && (() => {
              const opt = JUDGMENT_OPTIONS.find((o) => o.value === finalJudgment);
              return opt ? (
                <span style={{ padding: "5px 14px", borderRadius: 20, background: opt.bg, color: opt.color, fontSize: 13, fontWeight: 600, border: `1px solid ${opt.border}` }}>
                  {opt.icon} {opt.label}
                </span>
              ) : null;
            })()}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => router.push("/submissions")}
              style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              查看 Submissions →
            </button>
            <button onClick={handleReset}
              style={{ padding: "10px 22px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" }}>
              新建检测
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
