"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { supabase } from "./lib/supabase";
import { useLang } from "./context/AppContext";

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0",
      borderRadius: 14, padding: "18px 16px",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "monospace" }}>
          {value}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0",
      borderRadius: 10, padding: "12px 16px", marginBottom: 8,
    }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {[60, 40].map((w, i) => (
        <div key={i} style={{
          height: 12, width: `${w}%`, borderRadius: 6, background: "#e2e8f0",
          marginBottom: i === 0 ? 8 : 0, animation: "pulse 1.4s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgScore: 0, highRisk: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    async function load() {
      const { data, error } = await supabase
        .from("scans")
        .select("id, student_name, figma_url, page_name, ai_score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      const total = data.length;
      const avgScore = total > 0
        ? Math.round(data.reduce((s, r) => s + r.ai_score, 0) / total)
        : 0;
      const highRisk = data.filter((r) => r.ai_score >= 70).length;

      setStats({ total, avgScore, highRisk });
      setRecent(data.slice(0, 5));
      setLoading(false);
    }
    load();
  }, [isLoaded, user]);

  const avgColor = stats.avgScore >= 60 ? "#d97706" : "#16a34a";
  const avgBg   = stats.avgScore >= 60 ? "#fffbeb" : "#f0fdf4";

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        <StatCard label={t("dashboard.scanned")}   value={loading ? "—" : `${stats.total}`}      color="#2563eb" bg="#eff6ff" />
        <StatCard label={t("dashboard.avgAiRate")} value={loading ? "—" : `${stats.avgScore}%`} color={avgColor} bg={avgBg} />
        <StatCard label={t("dashboard.highRisk")}  value={loading ? "—" : `${stats.highRisk}`}  color="#dc2626" bg="#fef2f2" />
      </div>

      {/* Recent scans */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t("dashboard.recentDetections")}</div>
          <Link href="/submissions" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
            {t("dashboard.viewAll")}
          </Link>
        </div>

        {loading ? (
          [1, 2, 3].map((i) => <SkeletonRow key={i} />)
        ) : recent.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "32px 0",
            color: "#94a3b8", fontSize: 13,
          }}>
            {t("dashboard.noRecords")}
            <Link href="/new-scan" style={{ color: "#2563eb", textDecoration: "none" }}>
              {t("dashboard.startNow")}
            </Link>
          </div>
        ) : (
          recent.map((scan) => {
            const color = scan.ai_score >= 70 ? "#ef4444" : scan.ai_score >= 40 ? "#f59e0b" : "#22c55e";
            const badge = scan.ai_score >= 70 ? t("badge.highlyAI") : scan.ai_score >= 40 ? t("badge.partialAI") : t("badge.original");
            const title = scan.student_name || scan.page_name || "未命名";
            const sub   = [scan.page_name, new Date(scan.created_at).toLocaleDateString("zh-CN")].filter(Boolean).join(" · ");
            return (
              <div key={scan.id} style={{
                background: "#ffffff", border: "1px solid #e2e8f0",
                borderLeft: `3px solid ${color}`, borderRadius: 10,
                padding: "12px 16px", marginBottom: 8,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "monospace" }}>
                    {scan.ai_score}%
                  </div>
                  <div style={{ fontSize: 11, color, fontWeight: 600 }}>{badge}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
