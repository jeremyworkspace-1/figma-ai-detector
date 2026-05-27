"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { supabase } from "../lib/supabase";
import { FrameReviewCard } from "../components/FrameReviewCard";
import { useLang } from "../context/AppContext";

// ─── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 60 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset .8s ease" }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.24} fontWeight="800"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontFamily: "monospace" }}>
        {score}%
      </text>
    </svg>
  );
}

// ─── ResultCard ────────────────────────────────────────────────────────────────
function ResultCard({ scan: initialScan, userId }) {
  const { t } = useLang();
  const [expanded,     setExpanded]     = useState(false);
  const [studentName,  setStudentName]  = useState(initialScan.student_name || "");
  const [nameEditing,  setNameEditing]  = useState(false);
  const [nameDirty,    setNameDirty]    = useState(false);
  const [nameSaving,   setNameSaving]   = useState(false);
  const [nameSaved,    setNameSaved]    = useState(false);
  const [thumbnails,   setThumbnails]   = useState({});
  const [thumbLoading, setThumbLoading] = useState(false);
  const [reviews,      setReviews]      = useState(initialScan.teacher_reviews || {});
  const editStartRef = useRef(initialScan.student_name || "");

  const score      = initialScan.ai_score;
  const color      = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const badge      = score >= 70 ? t("badge.highlyAIFull") : score >= 40 ? t("badge.partialAIFull") : t("badge.originalFull");
  const frames     = initialScan.analysis?.frames || [];
  const nameSource = initialScan.analysis?.studentNameSource ?? null;
  const reviewedCount = Object.keys(reviews).length;
  const dateStr = new Date(initialScan.created_at).toLocaleDateString();

  const isUploadScan = initialScan.figma_url?.startsWith("upload://");

  // Lazy-load thumbnails on first expand (skip for upload scans)
  useEffect(() => {
    if (!expanded || !initialScan.figma_url || isUploadScan) return;
    const nodeIds = frames.map((f) => f.nodeId).filter(Boolean);
    if (!nodeIds.length || Object.keys(thumbnails).length > 0) return;
    setThumbLoading(true);
    fetch("/api/figma-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ figmaUrl: initialScan.figma_url, nodeIds }),
    })
      .then((r) => r.json())
      .then((data) => setThumbnails(data.images || {}))
      .catch(console.error)
      .finally(() => setThumbLoading(false));
  }, [expanded]);

  const saveName = async (nameToSave = studentName) => {
    setNameSaving(true);
    await supabase.from("scans").update({ student_name: nameToSave })
      .eq("id", initialScan.id)
      .eq("user_id", userId);
    setNameSaving(false);
    setNameDirty(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const commitNameEdit = () => {
    setNameEditing(false);
    if (nameDirty) saveName();
  };

  const cancelNameEdit = () => {
    setStudentName(editStartRef.current);
    setNameDirty(false);
    setNameEditing(false);
  };

  const handleReview = async (frameName, action, note) => {
    let updated;
    if (action === null) {
      updated = { ...reviews };
      delete updated[frameName];
    } else {
      updated = { ...reviews, [frameName]: { action, note, reviewedAt: new Date().toISOString() } };
    }
    setReviews(updated);
    await supabase.from("scans").update({ teacher_reviews: updated })
      .eq("id", initialScan.id)
      .eq("user_id", userId);
  };

  // Detection-type badges (used in expanded AI assessment)
  const DTYPE = {
    ui_ai:    { label: t("dtype.ui_ai"),    color: "#7c3aed", bg: "#ede9fe" },
    image_ai: { label: t("dtype.image_ai"), color: "#ea580c", bg: "#fff7ed" },
    both:     { label: t("dtype.both"),     color: "#dc2626", bg: "#fee2e2" },
  };

  // Name source labels
  const nameSourceLabel = {
    version_history: t("nameSource.version_history"),
    layer:           t("nameSource.layer"),
    filename:        t("nameSource.filename"),
  };

  return (
    <div style={{
      background: expanded ? "#f8fafc" : "#ffffff",
      border: `1px solid ${expanded ? color + "35" : "#e2e8f0"}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 12, marginBottom: 10, overflow: "hidden", transition: "all .2s",
    }}>
      {/* Collapsed header */}
      <div onClick={() => !nameEditing && setExpanded(!expanded)}
        style={{ padding: "14px 20px", cursor: nameEditing ? "default" : "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Row 1: name + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            {nameEditing ? (
              <input
                autoFocus
                value={studentName}
                onChange={(e) => { setStudentName(e.target.value); setNameDirty(true); setNameSaved(false); }}
                onBlur={commitNameEdit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter")  commitNameEdit();
                  if (e.key === "Escape") cancelNameEdit();
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder={t("submissions.noName")}
                style={{
                  fontSize: 15, fontWeight: 700, color: "#0f172a",
                  border: "1px solid #93c5fd", borderRadius: 6,
                  padding: "2px 8px", outline: "none", background: "#fff",
                  fontFamily: "inherit", minWidth: 120,
                }}
              />
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  editStartRef.current = studentName;
                  setNameEditing(true);
                  setNameDirty(false);
                }}
                title={t("submissions.clickToEdit")}
                style={{
                  fontSize: 15, fontWeight: 700,
                  color: studentName ? "#0f172a" : "#cbd5e1",
                  cursor: "text",
                  borderBottom: "1px dashed transparent",
                }}
                onMouseEnter={(e) => (e.target.style.borderBottomColor = "#cbd5e1")}
                onMouseLeave={(e) => (e.target.style.borderBottomColor = "transparent")}
              >
                {studentName || t("submissions.noName")}
              </span>
            )}

            {nameSaved && !nameEditing && (
              <span style={{ fontSize: 11, color: "#16a34a", flexShrink: 0 }}>{t("submissions.saved")}</span>
            )}

            {nameSource && studentName && !nameEditing && (
              <span style={{
                fontSize: 9, padding: "1px 7px", borderRadius: 20, flexShrink: 0,
                background: "#e0f2fe", color: "#0284c7", fontWeight: 700, letterSpacing: .2,
              }}>
                ✨ {nameSourceLabel[nameSource] || nameSource}
              </span>
            )}

            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
              background: color + "18", color, fontWeight: 700, letterSpacing: .4,
            }}>{badge}</span>

            {reviewedCount > 0 && (
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                background: reviewedCount === frames.length ? "#d1fae5" : "#dbeafe",
                color: reviewedCount === frames.length ? "#059669" : "#2563eb", fontWeight: 600,
              }}>
                {reviewedCount === frames.length
                  ? t("submissions.reviewComplete")
                  : t("submissions.reviewed", reviewedCount, frames.length)}
              </span>
            )}
          </div>

          {/* Row 2: page name · date · file link */}
          <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span>{[initialScan.page_name, dateStr].filter(Boolean).join(" · ")}</span>
            {!isUploadScan && initialScan.figma_url && (
              <>
                <span>·</span>
                <a
                  href={initialScan.figma_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  {t("submissions.viewFile")}
                </a>
              </>
            )}
          </div>
        </div>

        <ScoreRing score={score} size={56} />
        <span style={{ color: "#94a3b8", fontSize: 12, transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▾</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "16px 20px 20px" }}>

          {/* AI summary */}
          {initialScan.analysis?.summary && (
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, padding: "10px 14px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: .8 }}>{t("submissions.aiAssessment")}</span>
                {isUploadScan && initialScan.analysis.detectionType && initialScan.analysis.detectionType !== "original" && (() => {
                  const d = DTYPE[initialScan.analysis.detectionType];
                  return d ? (
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: d.bg, color: d.color, fontWeight: 700 }}>
                      🔍 {d.label}
                    </span>
                  ) : null;
                })()}
              </div>
              {initialScan.analysis.summary}
            </div>
          )}

          {/* Review progress */}
          {frames.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: .6 }}>{t("submissions.frameProgress")}</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{t("submissions.framesRecorded", reviewedCount, frames.length)}</span>
              </div>
              <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: frames.length > 0 ? `${(reviewedCount / frames.length) * 100}%` : "0%",
                  background: reviewedCount === frames.length ? "#22c55e" : "#3b82f6",
                  borderRadius: 2, transition: "width .4s ease",
                }} />
              </div>
            </div>
          )}

          {/* Frame cards */}
          {frames.length > 0 ? (
            frames.map((frame) => (
              <FrameReviewCard
                key={frame.name}
                frame={frame}
                thumbnail={thumbnails[frame.nodeId] ?? null}
                thumbLoading={thumbLoading}
                review={reviews[frame.name] ?? null}
                onReview={(action, note) => handleReview(frame.name, action, note)}
              />
            ))
          ) : (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
              {t("submissions.noFrameAnalysis")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "3px solid #e2e8f0", borderRadius: 12, padding: "14px 20px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ flex: 1 }}>
        {[45, 30].map((w, i) => (
          <div key={i} style={{ height: i === 0 ? 14 : 11, width: `${w}%`, borderRadius: 7, background: "#e2e8f0", marginBottom: 7, animation: `pulse 1.4s ease-in-out ${i * .15}s infinite` }} />
        ))}
      </div>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e2e8f0", flexShrink: 0, animation: "pulse 1.4s ease-in-out infinite" }} />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Submissions() {
  const { user, isLoaded } = useUser();
  const { t } = useLang();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;
    supabase.from("scans").select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setScans(data || []);
        setLoading(false);
      });
  }, [isLoaded, user]);

  return (
    <div style={{ padding: "28px 28px 48px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -.5 }}>Submissions</h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>{t("submissions.subtitle")}</p>
      </div>

      {!loading && scans.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "#64748b", padding: "3px 10px", border: "1px solid #cbd5e1", borderRadius: 20 }}>
            {t("submissions.count", scans.length)}
          </span>
        </div>
      )}

      {loading ? [1, 2, 3].map((i) => <SkeletonCard key={i} />) :
        scans.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 13 }}>
            {t("submissions.noRecords")}
            <Link href="/new-scan" style={{ color: "#2563eb", textDecoration: "none" }}>{t("submissions.startNow")}</Link>
          </div>
        ) : scans.map((scan) => <ResultCard key={scan.id} scan={scan} userId={user?.id} />)
      }

      {!loading && scans.length > 0 && (
        <div style={{ marginTop: 24, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, letterSpacing: .8, fontWeight: 600 }}>{t("submissions.scoreLegend")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { color: "#22c55e", range: "0–39%",   descKey: "submissions.score0desc" },
              { color: "#f59e0b", range: "40–69%",  descKey: "submissions.score40desc" },
              { color: "#ef4444", range: "70–100%", descKey: "submissions.score70desc" },
            ].map((l) => (
              <div key={l.range} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: l.color, fontWeight: 700, fontFamily: "monospace" }}>{l.range} </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{t(l.descKey)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
