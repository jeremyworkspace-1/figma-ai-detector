"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { SCAN_SIGNALS } from "../lib/data";

export default function NewScan() {
  const { setResults } = useApp();
  const router = useRouter();
  const ref = useRef();
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);

  const handleUpload = async (files) => {
    if (!files.length) return;
    setScanning(true);
    setDone(false);
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
    setScanning(false);
    setDone(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleUpload([...e.dataTransfer.files]);
  };

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          New Scan
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          上传学生 Figma 文件进行 AI 特征检测
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !scanning && ref.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#3b82f6" : "#cbd5e1"}`,
          borderRadius: 16,
          padding: "52px 24px",
          textAlign: "center",
          cursor: scanning ? "default" : "pointer",
          background: dragging ? "#eff6ff" : "#ffffff",
          transition: "all 0.2s",
          maxWidth: 500,
        }}
      >
        <input
          ref={ref}
          type="file"
          multiple
          accept=".fig,.pdf,.png,.jpg"
          style={{ display: "none" }}
          onChange={(e) => handleUpload([...e.target.files])}
        />

        {scanning ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <div style={{ color: "#3b82f6", fontSize: 15, fontWeight: 600 }}>正在扫描分析中…</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>AI 特征检测运行中，请稍候</div>
          </>
        ) : done ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ color: "#16a34a", fontSize: 15, fontWeight: 600 }}>扫描完成！</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>结果已添加到 Submissions</div>
            <button
              onClick={(e) => { e.stopPropagation(); router.push("/submissions"); }}
              style={{
                marginTop: 18, padding: "9px 22px",
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
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
            <div style={{ color: "#475569", fontSize: 15, fontWeight: 500 }}>
              拖拽上传学生 Figma 文件
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
              .fig · .pdf · 截图均可识别
            </div>
            <div
              style={{
                marginTop: 18, display: "inline-block", padding: "8px 22px",
                background: "#dbeafe", borderRadius: 8,
                color: "#2563eb", fontSize: 13, fontWeight: 600,
              }}
            >
              选择文件
            </div>
          </>
        )}
      </div>

      {/* Supported formats */}
      <div style={{ marginTop: 20, maxWidth: 500 }}>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, letterSpacing: 0.5 }}>
          支持格式
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[".fig", ".pdf", ".png", ".jpg"].map((ext) => (
            <div
              key={ext}
              style={{
                padding: "4px 12px", borderRadius: 6,
                background: "#ffffff", border: "1px solid #e2e8f0",
                fontSize: 12, color: "#64748b", fontFamily: "monospace",
              }}
            >
              {ext}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
