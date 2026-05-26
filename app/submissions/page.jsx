"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

// ─── Score Ring ────────────────────────────────────────────────────────────────
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
      <span style={{ fontSize: 10, color, fontWeight: 600, letterSpacing: 0.8 }}>{label}</span>
    </div>
  );
}

// ─── Result Card ───────────────────────────────────────────────────────────────
function ResultCard({ scan, expanded, onExpand }) {
  const score   = scan.ai_score;
  const color   = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const badge   = score >= 70 ? "⚠ 高度疑似AI" : score >= 40 ? "◑ 部分疑似" : "✓ 原创可信";
  const title   = scan.student_name || scan.page_name || "未命名";
  const frames  = scan.analysis?.frames || [];
  const dateStr = new Date(scan.created_at).toLocaleDateString("zh-CN");

  return (
    <div
      onClick={onExpand}
      style={{
        background: expanded ? "#f1f5f9" : "#ffffff",
        border: `1px solid ${expanded ? color + "40" : "#e2e8f0"}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 10,
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{title}</span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20,
              background: color + "20", color, fontWeight: 600, letterSpacing: 0.5, flexShrink: 0,
            }}>
              {badge}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            {[scan.page_name, dateStr].filter(Boolean).join(" · ")}
          </div>
          {scan.figma_url && (
            <div style={{
              fontSize: 11, color: "#cbd5e1", marginTop: 3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260,
            }}>
              {scan.figma_url}
            </div>
          )}
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
          {/* Summary */}
          {scan.analysis?.summary && (
            <div style={{
              fontSize: 13, color: "#64748b", lineHeight: 1.6,
              marginBottom: 14, padding: "10px 12px",
              background: "#f8fafc", borderRadius: 8,
            }}>
              {scan.analysis.summary}
            </div>
          )}

          {/* Per-frame breakdown */}
          {frames.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, letterSpacing: 1 }}>
                FRAME 分析
              </div>
              {frames.map((f, i) => {
                const fc = f.score >= 70 ? "#ef4444" : f.score >= 40 ? "#f59e0b" : "#22c55e";
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    {/* Frame score bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{f.name}</span>
                      <span style={{ fontSize: 12, color: fc, fontWeight: 700, fontFamily: "monospace" }}>
                        {f.score}%
                      </span>
                    </div>
                    <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
                      <div style={{
                        height: "100%", width: `${f.score}%`, background: fc, borderRadius: 3,
                        transition: `width 0.7s ease ${i * 0.08}s`,
                      }} />
                    </div>
                    {(f.flags || []).map((flag, j) => (
                      <div key={j} style={{
                        fontSize: 11, color: "#64748b", padding: "3px 10px", marginBottom: 3,
                        background: "#ffffff", borderRadius: 5, borderLeft: "2px solid #e2e8f0",
                      }}>
                        {flag}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {frames.length === 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>暂无详细 Frame 分析数据</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0", borderLeft: "3px solid #e2e8f0",
      borderRadius: 12, padding: "16px 20px", marginBottom: 10,
    }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          {[50, 35].map((w, i) => (
            <div key={i} style={{
              height: i === 0 ? 14 : 11, width: `${w}%`, borderRadius: 7,
              background: "#e2e8f0", marginBottom: 8,
              animation: "pulse 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#e2e8f0",
          animation: "pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Submissions() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      else setScans(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          Submissions
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          点击卡片查看详细分析报告
        </p>
      </div>

      {/* Count */}
      {!loading && (
        <div style={{ marginBottom: 14 }}>
          <span style={{
            fontSize: 11, color: "#64748b", padding: "3px 10px",
            border: "1px solid #cbd5e1", borderRadius: 20,
          }}>
            共 {scans.length} 条记录
          </span>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        [1, 2, 3].map((i) => <SkeletonCard key={i} />)
      ) : scans.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 13 }}>
          暂无检测记录，{" "}
          <Link href="/new-scan" style={{ color: "#2563eb", textDecoration: "none" }}>
            立即开始检测 →
          </Link>
        </div>
      ) : (
        scans.map((scan, i) => (
          <ResultCard
            key={scan.id}
            scan={scan}
            expanded={expanded === i}
            onExpand={() => setExpanded(expanded === i ? null : i)}
          />
        ))
      )}

      {/* Legend */}
      {!loading && scans.length > 0 && (
        <div style={{
          marginTop: 24, background: "#ffffff",
          border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, letterSpacing: 1 }}>评分说明</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { color: "#22c55e", range: "0–39%",   desc: "原创可信，手工设计特征明显" },
              { color: "#f59e0b", range: "40–69%",  desc: "部分疑似，建议当面询问" },
              { color: "#ef4444", range: "70–100%", desc: "高度疑似AI生成，需进一步核查" },
            ].map((l) => (
              <div key={l.range} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, marginTop: 2, flexShrink: 0 }} />
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
      )}
    </div>
  );
}
