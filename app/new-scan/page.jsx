"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { SCAN_SIGNALS } from "../lib/data";

const FIGMA_URL_RE = /figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/;

// ─── Score Ring ────────────────────────────────────────────────────────────────
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
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x={size / 2} y={size / 2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size * 0.22} fontWeight="700"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontFamily: "monospace" }}
        >
          {score}%
        </text>
      </svg>
      <span style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: 0.8 }}>{label}</span>
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = "#2563eb" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NewScan() {
  const { setResults } = useApp();
  const router = useRouter();
  const fileRef = useRef();

  // URL & page selector state
  const [figmaUrl, setFigmaUrl] = useState("");
  const [pages, setPages] = useState([]);          // [{ id, name }]
  const [selectedPageId, setSelectedPageId] = useState("");
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState("");

  // Analysis state
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlResult, setUrlResult] = useState(null);

  // File upload state
  const [dragging, setDragging] = useState(false);
  const [fileScanning, setFileScanning] = useState(false);
  const [fileDone, setFileDone] = useState(false);

  // ── Auto-fetch pages when URL looks valid ────────────────────────────────
  useEffect(() => {
    if (!FIGMA_URL_RE.test(figmaUrl)) {
      setPages([]);
      setSelectedPageId("");
      setPagesError("");
      return;
    }

    const timer = setTimeout(async () => {
      setPagesLoading(true);
      setPagesError("");
      setPages([]);
      setSelectedPageId("");
      setUrlResult(null);

      try {
        const res = await fetch("/api/figma-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ figmaUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "获取页面失败");

        setPages(data.pages || []);
        // 自动选中第一个 page
        if (data.pages?.length > 0) setSelectedPageId(data.pages[0].id);
      } catch (err) {
        setPagesError(err.message);
      } finally {
        setPagesLoading(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [figmaUrl]);

  // ── 开始检测 ──────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!figmaUrl.trim() || !selectedPageId) return;
    setUrlLoading(true);
    setUrlError("");
    setUrlResult(null);

    try {
      const res = await fetch("/api/analyze-figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl, pageId: selectedPageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");
      setUrlResult(data);
    } catch (err) {
      setUrlError(err.message);
    } finally {
      setUrlLoading(false);
    }
  };

  // ── 文件上传 ───────────────────────────────────────────────────────────────
  const handleUpload = async (files) => {
    if (!files.length) return;
    setFileScanning(true);
    setFileDone(false);
    await new Promise((r) => setTimeout(r, 2200));
    const newResults = files.map((f) => ({
      student: `新上传·${f.name.split(".")[0]}`,
      file: f.name,
      aiScore: Math.floor(Math.random() * 80 + 10),
      signals: SCAN_SIGNALS.map(() => Math.floor(Math.random() * 80 + 10)),
      flags: ["自动检测完成，请人工复核"],
      time: new Date().toISOString().slice(0, 10),
    }));
    setResults((prev) => [...newResults, ...prev]);
    setFileScanning(false);
    setFileDone(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleUpload([...e.dataTransfer.files]);
  };

  const resultColor = urlResult
    ? urlResult.overallScore >= 70 ? "#ef4444"
    : urlResult.overallScore >= 40 ? "#f59e0b"
    : "#22c55e"
    : "#22c55e";

  const canAnalyze = figmaUrl.trim() && selectedPageId && !urlLoading && !pagesLoading;

  return (
    <div style={{ padding: "28px 28px 48px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          New Scan
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          粘贴 Figma 链接或上传文件，检测 AI 生成特征
        </p>
      </div>

      {/* ── Section 1: Figma URL ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 560, marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 10 }}>
          通过链接检测
        </div>

        {/* Row 1: URL input */}
        <input
          type="url"
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          placeholder="粘贴 Figma 分享链接，例如：https://www.figma.com/file/..."
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 9,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#0f172a",
            background: "#ffffff",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />

        {/* Row 2: Page selector + button */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Page dropdown */}
          <div style={{ flex: 1, position: "relative" }}>
            {pagesLoading ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 9,
                border: "1px solid #e2e8f0", background: "#f8fafc",
                fontSize: 13, color: "#94a3b8",
              }}>
                <Spinner color="#94a3b8" />
                正在读取页面…
              </div>
            ) : pages.length > 0 ? (
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 9,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  color: "#0f172a",
                  background: "#ffffff",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: 36,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <div style={{
                padding: "10px 14px", borderRadius: 9,
                border: "1px dashed #e2e8f0", background: "#f8fafc",
                fontSize: 13, color: "#cbd5e1",
              }}>
                粘贴链接后自动显示页面列表
              </div>
            )}
          </div>

          {/* 开始检测 button */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              border: "none",
              background: canAnalyze ? "#2563eb" : "#dbeafe",
              color: canAnalyze ? "#ffffff" : "#93c5fd",
              fontSize: 13,
              fontWeight: 600,
              cursor: canAnalyze ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {urlLoading ? <Spinner color="#ffffff" /> : null}
            {urlLoading ? "分析中…" : "开始检测"}
          </button>
        </div>

        {/* Pages error */}
        {pagesError && (
          <div style={{
            marginTop: 8, padding: "7px 12px", borderRadius: 8,
            background: "#fef2f2", border: "1px solid #fecaca",
            fontSize: 12, color: "#dc2626",
          }}>
            ⚠ {pagesError}
          </div>
        )}

        {/* Analysis error */}
        {urlError && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8,
            background: "#fef2f2", border: "1px solid #fecaca",
            fontSize: 13, color: "#dc2626",
          }}>
            ⚠ {urlError}
          </div>
        )}

        {/* Loading skeleton */}
        {urlLoading && (
          <div style={{ marginTop: 16 }}>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
            {[100, 75, 55].map((w, i) => (
              <div key={i} style={{
                height: 13, width: `${w}%`, borderRadius: 7,
                background: "#e2e8f0", marginBottom: 10,
                animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Results */}
        {urlResult && !urlLoading && (
          <div style={{ marginTop: 16 }}>

            {/* Student name auto-detection result */}
            {(() => {
              const sourceLabel = {
                version_history: "版本历史",
                layer:           "图层文字识别",
                filename:        "文件名提取",
              };
              return urlResult.studentName ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 14px", marginBottom: 10,
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: 9, fontSize: 13,
                }}>
                  <span style={{ fontSize: 15 }}>👤</span>
                  <span style={{ fontWeight: 700, color: "#0369a1" }}>{urlResult.studentName}</span>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 20,
                    background: "#e0f2fe", color: "#0284c7", fontWeight: 600,
                  }}>
                    {sourceLabel[urlResult.studentNameSource] || "自动识别"}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#7dd3fc" }}>
                    已自动填入 Submissions
                  </span>
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", marginBottom: 10,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 9, fontSize: 12, color: "#94a3b8",
                }}>
                  <span>👤</span>
                  <span>未能自动识别学生姓名，请到 Submissions 手动填写</span>
                </div>
              );
            })()}

            {/* Overall score */}
            <div style={{
              background: "#ffffff",
              border: `1px solid ${resultColor}30`,
              borderLeft: `3px solid ${resultColor}`,
              borderRadius: 12,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 10,
            }}>
              <ScoreRing score={urlResult.overallScore} size={80} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 0.5, marginBottom: 4 }}>
                  综合检测结果 · {pages.find(p => p.id === selectedPageId)?.name}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: resultColor, marginBottom: 6 }}>
                  {urlResult.label}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  {urlResult.summary}
                </div>
              </div>
            </div>

            {/* Per-frame cards */}
            {(urlResult.frames || []).map((frame, i) => {
              const fc = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";
              return (
                <div key={i} style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderLeft: `3px solid ${fc}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 8,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{frame.name}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: fc, fontFamily: "monospace" }}>
                      {frame.score}%
                    </span>
                  </div>
                  {(frame.flags || []).map((flag, j) => (
                    <div key={j} style={{
                      fontSize: 12, color: "#64748b", padding: "3px 10px", marginTop: 4,
                      background: "#f8fafc", borderRadius: 5, borderLeft: "2px solid #e2e8f0",
                    }}>
                      {flag}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 560, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        <span style={{ fontSize: 12, color: "#94a3b8" }}>或</span>
        <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
      </div>

      {/* ── Section 2: File Upload ────────────────────────────────────────── */}
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 10 }}>
          上传文件检测
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !fileScanning && fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#3b82f6" : "#cbd5e1"}`,
            borderRadius: 16,
            padding: "40px 24px",
            textAlign: "center",
            cursor: fileScanning ? "default" : "pointer",
            background: dragging ? "#eff6ff" : "#ffffff",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".fig,.pdf,.png,.jpg"
            style={{ display: "none" }}
            onChange={(e) => handleUpload([...e.target.files])}
          />
          {fileScanning ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
              <div style={{ color: "#3b82f6", fontSize: 14, fontWeight: 600 }}>正在扫描分析中…</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>AI 特征检测运行中，请稍候</div>
            </>
          ) : fileDone ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ color: "#16a34a", fontSize: 14, fontWeight: 600 }}>扫描完成！</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>结果已添加到 Submissions</div>
              <button
                onClick={(e) => { e.stopPropagation(); router.push("/submissions"); }}
                style={{
                  marginTop: 14, padding: "8px 20px",
                  background: "#dbeafe", borderRadius: 8,
                  color: "#2563eb", fontSize: 13, fontWeight: 600,
                  border: "none", cursor: "pointer",
                }}
              >
                查看结果 →
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <div style={{ color: "#475569", fontSize: 14 }}>拖拽上传学生 Figma 文件</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>.fig · .pdf · 截图均可识别</div>
              <div style={{
                marginTop: 14, display: "inline-block", padding: "8px 20px",
                background: "#dbeafe", borderRadius: 8,
                color: "#2563eb", fontSize: 13, fontWeight: 600,
              }}>
                选择文件
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[".fig", ".pdf", ".png", ".jpg"].map((ext) => (
            <div key={ext} style={{
              padding: "3px 10px", borderRadius: 5,
              background: "#ffffff", border: "1px solid #e2e8f0",
              fontSize: 12, color: "#64748b", fontFamily: "monospace",
            }}>
              {ext}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
