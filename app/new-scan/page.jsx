"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FrameReviewCard } from "../components/FrameReviewCard";

const FIGMA_URL_RE = /figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/;

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
    { label: "输入链接" },
    { label: "审阅证据" },
    { label: "最终判断" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", marginBottom: 32 }}>
      {steps.flatMap((s, i) => {
        const num  = i + 1;
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NewScan() {
  const router = useRouter();

  // ── Step ────────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [figmaUrl,      setFigmaUrl]      = useState("");
  const [pages,         setPages]         = useState([]);
  const [selectedPageId,setSelectedPageId]= useState("");
  const [pagesLoading,  setPagesLoading]  = useState(false);
  const [pagesError,    setPagesError]    = useState("");
  const [analyzing,     setAnalyzing]     = useState(false);
  const [analyzeError,  setAnalyzeError]  = useState("");

  // ── Step 2 state ────────────────────────────────────────────────────────────
  const [result,       setResult]       = useState(null);
  const [thumbnails,   setThumbnails]   = useState({});
  const [thumbLoading, setThumbLoading] = useState(false);
  const [frameReviews, setFrameReviews] = useState({});

  // ── Step 3 state ────────────────────────────────────────────────────────────
  const [studentName,   setStudentName]   = useState("");
  const [finalJudgment, setFinalJudgment] = useState("");
  const [teacherNote,   setTeacherNote]   = useState("");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [savedId,       setSavedId]       = useState(null);

  // ── Auto-fetch pages when URL looks valid ────────────────────────────────────
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

  // ── Step 1 → Step 2: run analysis ───────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!figmaUrl.trim() || !selectedPageId) return;
    setAnalyzing(true); setAnalyzeError("");
    try {
      const res  = await fetch("/api/analyze-figma", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl, pageId: selectedPageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");

      setResult(data);
      setFrameReviews({});
      setStudentName(data.studentName || "");
      // Pre-select final judgment based on AI score
      setFinalJudgment(data.overallScore >= 70 ? "ai" : data.overallScore < 40 ? "original" : "");
      setStep(2);

      // Fetch thumbnails in background (non-blocking)
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

  // ── Frame review handler (local state only, saved at Step 3) ─────────────────
  const handleFrameReview = (frameName, action, note) => {
    setFrameReviews((prev) => {
      if (action === null) {
        const next = { ...prev }; delete next[frameName]; return next;
      }
      return { ...prev, [frameName]: { action, note, reviewedAt: new Date().toISOString() } };
    });
  };

  // ── Step 3: save to DB ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!finalJudgment) return;
    setSaving(true); setSaveError("");
    try {
      const selectedPage = pages.find((p) => p.id === selectedPageId);
      const res = await fetch("/api/save-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl,
          pageName:      selectedPage?.name || "",
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

  // ── Reset everything ─────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep(1); setResult(null); setThumbnails({}); setFrameReviews({});
    setStudentName(""); setFinalJudgment(""); setTeacherNote("");
    setSavedId(null); setSaveError(""); setAnalyzeError("");
    setFigmaUrl(""); setPages([]); setSelectedPageId("");
  };

  const canAnalyze  = figmaUrl.trim() && selectedPageId && !analyzing && !pagesLoading;
  const frames      = result?.frames || [];
  const reviewCount = Object.keys(frameReviews).length;
  const resultColor = result
    ? result.overallScore >= 70 ? "#ef4444" : result.overallScore >= 40 ? "#f59e0b" : "#22c55e"
    : "#94a3b8";

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: "28px 28px 64px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -.5 }}>New Scan</h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          三步完成 AI 检测与教师审阅，最终保存到 Submissions
        </p>
      </div>

      {/* Step indicator (hide on success screen) */}
      {!savedId && <StepIndicator current={step} />}

      {/* ════════ STEP 1: URL input ════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 10 }}>通过链接检测</div>

          <input type="url" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)}
            placeholder="粘贴 Figma 分享链接，例如：https://www.figma.com/file/..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 9,
              border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a",
              background: "#fff", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8,
            }}
            onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
            onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")} />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Page dropdown */}
            <div style={{ flex: 1, position: "relative" }}>
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

            <button onClick={handleAnalyze} disabled={!canAnalyze} style={{
              padding: "10px 18px", borderRadius: 9, border: "none",
              background: canAnalyze ? "#2563eb" : "#dbeafe",
              color: canAnalyze ? "#fff" : "#93c5fd",
              fontSize: 13, fontWeight: 600, cursor: canAnalyze ? "pointer" : "default",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap", transition: "all .15s",
            }}>
              {analyzing ? <><Spinner color="#fff" /> 分析中…</> : "开始检测 →"}
            </button>
          </div>

          {pagesError && (
            <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#dc2626" }}>
              ⚠ {pagesError}
            </div>
          )}
          {analyzeError && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#dc2626" }}>
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
            <button onClick={() => { setStep(1); setResult(null); setThumbnails({}); setFrameReviews({}); }}
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
              style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
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
              <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: .5, marginBottom: 3 }}>
                综合检测结果 · {pages.find((p) => p.id === selectedPageId)?.name}
                {result.studentName && (
                  <span style={{ marginLeft: 8, padding: "1px 7px", borderRadius: 20, background: "#e0f2fe", color: "#0284c7", fontWeight: 600 }}>
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
              没有可审阅的 Frame
            </div>
          ) : (
            frames.map((frame) => (
              <FrameReviewCard
                key={frame.name}
                frame={frame}
                thumbnail={thumbnails[frame.nodeId] ?? null}
                thumbLoading={thumbLoading}
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

          {/* ── Summary card ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20 }}>
            <ScoreRing score={result.overallScore} size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: resultColor, marginBottom: 4 }}>{result.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                {pages.find((p) => p.id === selectedPageId)?.name}
                {" · "}已审阅 {reviewCount}/{frames.length} 帧
                {reviewCount > 0 && ` · ${Object.values(frameReviews).filter((r) => r.action === "confirm").length} 帧确认AI`}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          </div>

          {/* ── Student name ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>👤 学生姓名</div>
            {result.studentName && !studentName.trim() && (
              <div style={{ fontSize: 11, color: "#0284c7", marginBottom: 7 }}>
                <span style={{ padding: "2px 8px", borderRadius: 20, background: "#e0f2fe", fontWeight: 600 }}>
                  ✨ 自动识别 · {NAME_SOURCE_LABEL[result.studentNameSource] || result.studentNameSource || ""}
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

          {/* ── Frame review summary (compact) ── */}
          {frames.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>📋 审阅汇总</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {frames.map((frame) => {
                  const rev = frameReviews[frame.name];
                  const fc  = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";
                  return (
                    <div key={frame.name} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 20, fontSize: 11,
                      background: rev?.action === "confirm" ? "#d1fae5" : rev?.action === "override" ? "#fef3c7" : "#f1f5f9",
                      color:      rev?.action === "confirm" ? "#059669"  : rev?.action === "override" ? "#d97706"  : "#64748b",
                      border: `1px solid ${rev?.action === "confirm" ? "#a7f3d0" : rev?.action === "override" ? "#fde68a" : "#e2e8f0"}`,
                      fontWeight: 500,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: fc, flexShrink: 0 }} />
                      {frame.name}
                      <span style={{ marginLeft: 2 }}>
                        {rev?.action === "confirm" ? "✅" : rev?.action === "override" ? "✏️" : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Final judgment ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 12 }}>⚖️ 最终判断 <span style={{ color: "#ef4444" }}>*</span></div>
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

          {/* ── Teacher note ── */}
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

          {/* ── Save button ── */}
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
              fontSize: 15, fontWeight: 700, cursor: finalJudgment && !saving ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .15s",
            }}
          >
            {saving ? <><Spinner color="#fff" /> 保存中…</> : "确认保存 →"}
          </button>
          {!finalJudgment && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
              请先选择最终判断再保存
            </div>
          )}
        </div>
      )}

      {/* ════════ SUCCESS screen ══════════════════════════════════════════════ */}
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
            {finalJudgment && (
              <span style={{ padding: "5px 14px", borderRadius: 20, background: JUDGMENT_OPTIONS.find((o) => o.value === finalJudgment)?.bg, color: JUDGMENT_OPTIONS.find((o) => o.value === finalJudgment)?.color, fontSize: 13, fontWeight: 600, border: `1px solid ${JUDGMENT_OPTIONS.find((o) => o.value === finalJudgment)?.border}` }}>
                {JUDGMENT_OPTIONS.find((o) => o.value === finalJudgment)?.icon}{" "}
                {JUDGMENT_OPTIONS.find((o) => o.value === finalJudgment)?.label}
              </span>
            )}
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
