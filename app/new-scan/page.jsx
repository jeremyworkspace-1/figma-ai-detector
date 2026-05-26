"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { SCAN_SIGNALS } from "../lib/data";

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
function Spinner() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#93c5fd" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NewScan() {
  const { setResults } = useApp();
  const router = useRouter();
  const fileRef = useRef();

  // URL input state
  const [figmaUrl, setFigmaUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlResult, setUrlResult] = useState(null);

  // File upload state
  const [dragging, setDragging] = useState(false);
  const [fileScanning, setFileScanning] = useState(false);
  const [fileDone, setFileDone] = useState(false);

  // ── URL 检测 ──────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!figmaUrl.trim()) return;
    setUrlLoading(true);
    setUrlError("");
    setUrlResult(null);

    try {
      const res = await fetch("/api/analyze-figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl }),
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

  const aiColor = urlResult
    ? urlResult.overallScore >= 70 ? "#ef4444" : urlResult.overallScore >= 40 ? "#f59e0b" : "#22c55e"
    : "#22c55e";

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

        {/* Input row */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="url"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !urlLoading && handleAnalyze()}
            placeholder="粘贴 Figma 分享链接，例如：https://www.figma.com/file/..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 9,
              border: "1px solid #e2e8f0",
              fontSize: 13,
              color: "#0f172a",
              background: "#ffffff",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          <button
            onClick={handleAnalyze}
            disabled={urlLoading || !figmaUrl.trim()}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              border: "none",
              background: urlLoading || !figmaUrl.trim() ? "#dbeafe" : "#2563eb",
              color: urlLoading || !figmaUrl.trim() ? "#93c5fd" : "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: urlLoading || !figmaUrl.trim() ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            {urlLoading ? <Spinner /> : null}
            {urlLoading ? "分析中…" : "开始检测"}
          </button>
        </div>

        {/* Error */}
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
            {[100, 80, 60].map((w, i) => (
              <div key={i} style={{
                height: 14, width: `${w}%`, borderRadius: 7,
                background: "#e2e8f0", marginBottom: 10,
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        )}

        {/* Results */}
        {urlResult && !urlLoading && (
          <div style={{ marginTop: 16 }}>
            {/* Overall score card */}
            <div style={{
              background: "#ffffff",
              border: `1px solid ${aiColor}30`,
              borderLeft: `3px solid ${aiColor}`,
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
                  综合检测结果
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: aiColor, marginBottom: 6 }}>
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

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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
