"use client";

import { useState } from "react";
import { useApp } from "../context/AppContext";
import { SCAN_SIGNALS } from "../lib/data";

function ScoreRing({ score, size = 70 }) {
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
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x={size / 2} y={size / 2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size * 0.22} fontWeight="700"
          style={{
            transform: `rotate(90deg)`,
            transformOrigin: `${size / 2}px ${size / 2}px`,
            fontFamily: "monospace",
          }}
        >
          {score}%
        </text>
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 600, letterSpacing: 0.8 }}>{label}</span>
    </div>
  );
}

function SignalBar({ label, value, index }) {
  const color = value >= 70 ? "#ef4444" : value >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: color,
            borderRadius: 3,
            transition: `width 0.8s ease ${index * 0.08}s`,
          }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result, expanded, onExpand }) {
  const aiColor = result.aiScore >= 70 ? "#ef4444" : result.aiScore >= 40 ? "#f59e0b" : "#22c55e";
  const badge =
    result.aiScore >= 70 ? "⚠ 高度疑似AI" : result.aiScore >= 40 ? "◑ 部分疑似" : "✓ 原创可信";

  return (
    <div
      onClick={onExpand}
      style={{
        background: expanded ? "#f1f5f9" : "#ffffff",
        border: `1px solid ${expanded ? aiColor + "40" : "#e2e8f0"}`,
        borderLeft: `3px solid ${aiColor}`,
        borderRadius: 12,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {result.student}
            </span>
            <span
              style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 20,
                background: aiColor + "20", color: aiColor, fontWeight: 600, letterSpacing: 0.5,
              }}
            >
              {badge}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            {result.file} · {result.time}
          </div>
        </div>
        <ScoreRing score={result.aiScore} />
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ marginBottom: 14 }}>
            {SCAN_SIGNALS.map((sig, i) => (
              <SignalBar key={sig.id} label={sig.label} value={result.signals[i]} index={i} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, letterSpacing: 1 }}>
              检测标记
            </div>
            {result.flags.map((f, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12, color: "#64748b", padding: "5px 10px", marginBottom: 4,
                  background: "#f8fafc", borderRadius: 6, borderLeft: "2px solid #e2e8f0",
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Submissions() {
  const { results } = useApp();
  const [expanded, setExpanded] = useState(null);

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          Submissions
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          点击卡片查看详细分析报告
        </p>
      </div>

      {/* Count badge */}
      <div style={{ marginBottom: 14 }}>
        <span
          style={{
            fontSize: 11, color: "#64748b", padding: "3px 10px",
            border: "1px solid #cbd5e1", borderRadius: 20,
          }}
        >
          共 {results.length} 份
        </span>
      </div>

      {/* Cards */}
      {results.map((r, i) => (
        <ResultCard
          key={i}
          result={r}
          expanded={expanded === i}
          onExpand={() => setExpanded(expanded === i ? null : i)}
        />
      ))}

      {/* Legend */}
      <div
        style={{
          marginTop: 24, background: "#ffffff",
          border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px",
        }}
      >
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, letterSpacing: 1 }}>
          评分说明
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { color: "#22c55e", range: "0–39%",   desc: "原创可信，手工设计特征明显" },
            { color: "#f59e0b", range: "40–69%",  desc: "部分疑似，建议当面询问" },
            { color: "#ef4444", range: "70–100%", desc: "高度疑似AI生成，需进一步核查" },
          ].map((l) => (
            <div key={l.range} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div
                style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: l.color, marginTop: 2, flexShrink: 0,
                }}
              />
              <div>
                <span style={{ fontSize: 12, color: l.color, fontWeight: 700, fontFamily: "monospace" }}>
                  {l.range}{" "}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{l.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
