"use client";

import Link from "next/link";
import { useApp } from "./context/AppContext";

export default function Dashboard() {
  const { results } = useApp();
  const avgScore = Math.round(results.reduce((a, b) => a + b.aiScore, 0) / results.length);
  const highRisk = results.filter((r) => r.aiScore >= 70).length;
  const recent = results.slice(0, 3);

  const stats = [
    { label: "已扫描", value: results.length, unit: "份", color: "#2563eb", bg: "#eff6ff" },
    {
      label: "平均AI率",
      value: `${avgScore}%`,
      unit: "",
      color: avgScore >= 60 ? "#d97706" : "#16a34a",
      bg: avgScore >= 60 ? "#fffbeb" : "#f0fdf4",
    },
    { label: "高风险", value: highRisk, unit: "份", color: "#dc2626", bg: "#fef2f2" },
  ];

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          检测概览与最近提交记录
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "18px 16px",
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 9, background: s.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>
                {s.value}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>
              {s.value}{s.unit}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>最近提交</div>
          <Link
            href="/submissions"
            style={{ fontSize: 12, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
          >
            查看全部 →
          </Link>
        </div>

        {recent.map((r, i) => {
          const color = r.aiScore >= 70 ? "#ef4444" : r.aiScore >= 40 ? "#f59e0b" : "#22c55e";
          const badge = r.aiScore >= 70 ? "高度疑似" : r.aiScore >= 40 ? "部分疑似" : "原创可信";
          return (
            <div
              key={i}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderLeft: `3px solid ${color}`,
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{r.student}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {r.file} · {r.time}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "monospace" }}>
                  {r.aiScore}%
                </div>
                <div style={{ fontSize: 11, color, fontWeight: 600 }}>{badge}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
