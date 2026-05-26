"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

// ─── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 60 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.24} fontWeight="800"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontFamily: "monospace" }}
      >
        {score}%
      </text>
    </svg>
  );
}

// ─── FrameReviewCard ───────────────────────────────────────────────────────────
function FrameReviewCard({ frame, thumbnail, thumbLoading, review, onReview }) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [note, setNote] = useState(review?.note || "");
  const [saving, setSaving] = useState(false);

  // Sync override panel & note when review prop changes
  useEffect(() => {
    if (!review) { setOverrideOpen(false); setNote(""); }
    else if (review.action === "override") setNote(review.note || "");
  }, [review]);

  const fc = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";

  const handleConfirm = async () => {
    setSaving(true);
    await onReview("confirm", "");
    setOverrideOpen(false);
    setSaving(false);
  };

  const handleSaveOverride = async () => {
    setSaving(true);
    await onReview("override", note);
    setOverrideOpen(false);
    setSaving(false);
  };

  const handleClear = async () => {
    setSaving(true);
    await onReview(null, "");
    setSaving(false);
  };

  const reviewBadge = review ? (
    review.action === "confirm" ? (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 20,
          background: "#d1fae5", color: "#059669", fontSize: 11, fontWeight: 700,
        }}>
          ✅ 已确认为AI生成
        </span>
        <button onClick={handleClear} disabled={saving} title="撤销"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>
          ×
        </button>
      </div>
    ) : (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: review.note ? 4 : 0 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 20,
            background: "#fef3c7", color: "#d97706", fontSize: 11, fontWeight: 700,
          }}>
            ✏️ 教师已复核
          </span>
          <button onClick={handleClear} disabled={saving} title="撤销"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>
            ×
          </button>
        </div>
        {review.note && (
          <div style={{
            fontSize: 12, color: "#78350f", background: "#fffbeb",
            border: "1px solid #fde68a", borderRadius: 6, padding: "5px 10px", marginTop: 4,
            lineHeight: 1.5,
          }}>
            💬 {review.note}
          </div>
        )}
      </div>
    )
  ) : null;

  return (
    <div style={{
      border: `1px solid ${review?.action === "confirm" ? "#a7f3d0" : review?.action === "override" ? "#fde68a" : "#e2e8f0"}`,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
      background: "#ffffff",
      transition: "border-color 0.2s",
    }}>
      {/* Main row: thumbnail + analysis */}
      <div style={{ display: "flex" }}>
        {/* Thumbnail */}
        <div style={{
          width: 160, minHeight: 100, flexShrink: 0,
          background: "#f1f5f9",
          borderRight: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          {thumbLoading ? (
            <div style={{ textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
              <div style={{ fontSize: 11 }}>加载中</div>
            </div>
          ) : thumbnail ? (
            <img
              src={thumbnail}
              alt={frame.name}
              style={{ width: "100%", display: "block", objectFit: "cover" }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#cbd5e1" }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>🖼️</div>
              <div style={{ fontSize: 11 }}>无预览图</div>
            </div>
          )}
        </div>

        {/* Analysis */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          {/* Frame name + score */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {frame.name}
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: fc, fontFamily: "monospace", flexShrink: 0, marginLeft: 8 }}>
              {frame.score}%
            </span>
          </div>

          {/* Score bar */}
          <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, marginBottom: 10 }}>
            <div style={{
              height: "100%", width: `${frame.score}%`, background: fc,
              borderRadius: 2, transition: "width 0.7s ease",
            }} />
          </div>

          {/* Flags / evidence */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 5, fontWeight: 600 }}>
              📋 证据标记
            </div>
            {(frame.flags || []).map((flag, j) => (
              <div key={j} style={{
                fontSize: 12, color: "#64748b", padding: "3px 8px", marginBottom: 3,
                background: "#f8fafc", borderRadius: 4, borderLeft: "2px solid #fbbf24",
                display: "flex", alignItems: "baseline", gap: 5,
              }}>
                <span style={{ color: "#f59e0b", fontSize: 10, flexShrink: 0 }}>▲</span>
                {flag}
              </div>
            ))}
          </div>

          {/* Review section */}
          {reviewBadge ? (
            <div>{reviewBadge}</div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  border: "1px solid #a7f3d0", background: "#f0fdf4",
                  color: "#15803d", fontSize: 12, fontWeight: 600,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                ✅ 确认AI判断
              </button>
              <button
                onClick={() => setOverrideOpen(true)}
                disabled={saving}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  border: "1px solid #fde68a", background: "#fff7ed",
                  color: "#c2410c", fontSize: 12, fontWeight: 600,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                ✏️ 我有不同意见
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Override input panel */}
      {overrideOpen && (
        <div style={{
          padding: "12px 14px", borderTop: "1px solid #fde68a",
          background: "#fffbeb",
        }}>
          <div style={{ fontSize: 12, color: "#92400e", marginBottom: 6, fontWeight: 600 }}>
            ✏️ 请说明你的判断依据
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：该画面是学生课堂手绘原型，命名习惯是个人风格，有明显手动调整痕迹…"
            style={{
              width: "100%", padding: "8px 10px",
              borderRadius: 7, border: "1px solid #fde68a",
              fontSize: 12, color: "#0f172a",
              background: "#ffffff", fontFamily: "inherit",
              resize: "vertical", minHeight: 64, boxSizing: "border-box",
              outline: "none", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => { setOverrideOpen(false); setNote(review?.note || ""); }}
              style={{
                padding: "5px 12px", borderRadius: 6,
                border: "1px solid #e2e8f0", background: "#ffffff",
                color: "#64748b", fontSize: 12, cursor: "pointer",
              }}
            >
              取消
            </button>
            <button
              onClick={handleSaveOverride}
              disabled={saving}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none",
                background: "#f59e0b", color: "#ffffff",
                fontSize: 12, fontWeight: 600, cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "保存中…" : "确认提交备注"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ResultCard ────────────────────────────────────────────────────────────────
function ResultCard({ scan: initialScan }) {
  const [expanded, setExpanded] = useState(false);
  const [studentName, setStudentName] = useState(initialScan.student_name || "");
  const [nameDirty, setNameDirty] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbLoading, setThumbLoading] = useState(false);
  const [reviews, setReviews] = useState(initialScan.teacher_reviews || {});

  const score  = initialScan.ai_score;
  const color  = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const badge  = score >= 70 ? "⚠ 高度疑似AI" : score >= 40 ? "◑ 部分疑似" : "✓ 原创可信";
  const frames = initialScan.analysis?.frames || [];
  const reviewedCount = Object.keys(reviews).length;
  const dateStr = new Date(initialScan.created_at).toLocaleDateString("zh-CN");

  // Fetch thumbnails once when expanded
  useEffect(() => {
    if (!expanded || !initialScan.figma_url) return;
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

  const saveName = async () => {
    setNameSaving(true);
    await supabase.from("scans").update({ student_name: studentName }).eq("id", initialScan.id);
    setNameSaving(false);
    setNameDirty(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
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
    await supabase.from("scans").update({ teacher_reviews: updated }).eq("id", initialScan.id);
  };

  return (
    <div style={{
      background: expanded ? "#f8fafc" : "#ffffff",
      border: `1px solid ${expanded ? color + "35" : "#e2e8f0"}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      marginBottom: 10,
      overflow: "hidden",
      transition: "all 0.2s",
    }}>
      {/* Collapsed header — click to expand */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: studentName ? "#0f172a" : "#cbd5e1" }}>
              {studentName || "未填写学生姓名"}
            </span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
              background: color + "18", color, fontWeight: 700, letterSpacing: 0.4,
            }}>
              {badge}
            </span>
            {reviewedCount > 0 && (
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                background: reviewedCount === frames.length ? "#d1fae5" : "#dbeafe",
                color: reviewedCount === frames.length ? "#059669" : "#2563eb",
                fontWeight: 600,
              }}>
                {reviewedCount === frames.length ? "✓ 审阅完成" : `审阅 ${reviewedCount}/${frames.length}`}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            {[initialScan.page_name, dateStr].filter(Boolean).join(" · ")}
          </div>
        </div>
        <ScoreRing score={score} size={56} />
        <span style={{
          color: "#94a3b8", fontSize: 12,
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
          flexShrink: 0,
        }}>▾</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "16px 20px 20px" }}>

          {/* ── Student name editor ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            padding: "10px 12px", background: "#ffffff",
            border: "1px solid #e2e8f0", borderRadius: 9,
          }}>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, flexShrink: 0 }}>
              👤 学生姓名
            </span>
            <input
              value={studentName}
              onChange={(e) => { setStudentName(e.target.value); setNameDirty(true); setNameSaved(false); }}
              onKeyDown={(e) => e.key === "Enter" && nameDirty && saveName()}
              placeholder="填写学生姓名…"
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1, padding: "5px 8px", borderRadius: 6,
                border: nameDirty ? "1px solid #93c5fd" : "1px solid transparent",
                background: nameDirty ? "#ffffff" : "transparent",
                fontSize: 13, color: "#0f172a", fontFamily: "inherit",
                outline: "none", transition: "all 0.15s",
              }}
            />
            {nameSaved && <span style={{ fontSize: 12, color: "#16a34a", flexShrink: 0 }}>✓ 已保存</span>}
            {nameDirty && (
              <button
                onClick={(e) => { e.stopPropagation(); saveName(); }}
                disabled={nameSaving}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none",
                  background: "#2563eb", color: "#ffffff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                }}
              >
                {nameSaving ? "保存中…" : "保存"}
              </button>
            )}
          </div>

          {/* ── AI summary ── */}
          {initialScan.analysis?.summary && (
            <div style={{
              fontSize: 13, color: "#475569", lineHeight: 1.7,
              padding: "10px 14px", background: "#ffffff",
              borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8, marginBottom: 5 }}>
                🤖 AI 综合评价
              </div>
              {initialScan.analysis.summary}
            </div>
          )}

          {/* ── Review progress ── */}
          {frames.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 0.6 }}>
                  FRAME 审阅进度
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {reviewedCount} / {frames.length} 帧已记录
                </span>
              </div>
              <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: frames.length > 0 ? `${(reviewedCount / frames.length) * 100}%` : "0%",
                  background: reviewedCount === frames.length ? "#22c55e" : "#3b82f6",
                  borderRadius: 2, transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}

          {/* ── Frame cards ── */}
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
              暂无 Frame 级分析（此记录可能由旧版本生成）
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
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0",
      borderLeft: "3px solid #e2e8f0", borderRadius: 12,
      padding: "14px 20px", marginBottom: 10,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ flex: 1 }}>
        {[45, 30].map((w, i) => (
          <div key={i} style={{
            height: i === 0 ? 14 : 11, width: `${w}%`, borderRadius: 7,
            background: "#e2e8f0", marginBottom: 7,
            animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: "#e2e8f0",
        flexShrink: 0, animation: "pulse 1.4s ease-in-out infinite",
      }} />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Submissions() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setScans(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: "28px 28px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          Submissions
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          审阅每份设计稿的检测证据，填写学生姓名，记录你的判断
        </p>
      </div>

      {/* Count */}
      {!loading && scans.length > 0 && (
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
        scans.map((scan) => <ResultCard key={scan.id} scan={scan} />)
      )}

      {/* Legend */}
      {!loading && scans.length > 0 && (
        <div style={{
          marginTop: 24, background: "#ffffff",
          border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, letterSpacing: 0.8, fontWeight: 600 }}>
            评分说明
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { color: "#22c55e", range: "0–39%",   desc: "原创可信，手工设计特征明显" },
              { color: "#f59e0b", range: "40–69%",  desc: "部分疑似，建议当面询问" },
              { color: "#ef4444", range: "70–100%", desc: "高度疑似AI生成，需进一步核查" },
            ].map((l) => (
              <div key={l.range} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: l.color, fontWeight: 700, fontFamily: "monospace" }}>{l.range} </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{l.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
