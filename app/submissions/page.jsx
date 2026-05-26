"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

// ─── Constants ─────────────────────────────────────────────────────────────────
// Scattered positions for annotation dots (% from top-left of image)
const DOT_POSITIONS = [
  { x: 25, y: 26 },
  { x: 73, y: 33 },
  { x: 50, y: 63 },
  { x: 18, y: 70 },
  { x: 80, y: 68 },
];

const NAME_SOURCE_LABEL = {
  version_history: "版本历史",
  layer:           "图层文字识别",
  filename:        "文件名提取",
};

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

// ─── ZoomableImageViewer ───────────────────────────────────────────────────────
// Pan with click-drag, zoom with mouse wheel (centered on cursor).
// Annotation dots are scale-compensated: they stay the same physical size on
// screen regardless of zoom level.  Bidirectional hover highlight: hovering a
// dot highlights the corresponding flag in the left panel and vice-versa.
function ZoomableImageViewer({ src, alt, annotations = [], loading, hoveredAnnotation, onAnnotationHover }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Reset view whenever the image source changes
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  // Mouse-wheel zoom — must be non-passive to call preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setScale((prev) => {
        const ns = Math.min(Math.max(prev * factor, 0.2), 10);
        const ratio = ns / prev;
        setOffset((off) => ({
          x: mx - ratio * (mx - off.x),
          y: my - ratio * (my - off.y),
        }));
        return ns;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Click-drag pan — attach global listeners only while dragging
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      if (!dragRef.current) return;
      const { mx, my, ox, oy } = dragRef.current;
      setOffset({ x: ox + e.clientX - mx, y: oy + e.clientY - my });
    };
    const onUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const handleZoomIn  = (e) => { e.stopPropagation(); setScale((s) => Math.min(s * 1.3, 10)); };
  const handleZoomOut = (e) => { e.stopPropagation(); setScale((s) => Math.max(s / 1.3, 0.2)); };
  const handleReset   = (e) => { e.stopPropagation(); setScale(1); setOffset({ x: 0, y: 0 }); };

  const controlBtnStyle = {
    width: 28, height: 28, borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(6px)",
    color: "#f8fafc",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1,
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#f1f5f9", borderRadius: 8, overflow: "hidden" }}>

      {/* ── Pan / zoom viewport ── */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        style={{
          width: "100%", height: "100%",
          overflow: "hidden", position: "relative",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 8, color: "#94a3b8" }}>
            <div style={{ fontSize: 20 }}>⏳</div>
            <div style={{ fontSize: 11 }}>加载预览图…</div>
          </div>
        ) : src ? (
          /* Transformed layer: image + scale-compensated dots */
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}>
            <img src={src} alt={alt} draggable={false}
              style={{ width: "100%", display: "block", pointerEvents: "none" }} />

            {/* Annotation dots
                Math: dot has transform scale(1/zoom).
                CSS size 24px → in screen space: 24 * (1/zoom) * zoom = 24px  ✓
                box-shadow 4px → in screen space: 4 * (1/zoom) * zoom  = 4px  ✓
                So dots always appear constant-size regardless of zoom level. */}
            {annotations.map((ann, i) => {
              const isHovered = hoveredAnnotation === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => !isDragging && onAnnotationHover(i)}
                  onMouseLeave={() => onAnnotationHover(null)}
                  onMouseDown={(e) => e.stopPropagation()} // don't start drag on dot click
                  style={{
                    position: "absolute",
                    left: `${ann.x}%`,
                    top:  `${ann.y}%`,
                    transform: `translate(-50%, -50%) scale(${(isHovered ? 1.3 : 1) / scale})`,
                    width: 24, height: 24, borderRadius: "50%",
                    background: ann.color,
                    border: "2.5px solid white",
                    boxShadow: isHovered
                      ? `0 2px 6px rgba(0,0,0,0.4), 0 0 0 4px ${ann.color}45`
                      : "0 2px 6px rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 10, fontWeight: 800, fontFamily: "monospace",
                    pointerEvents: "auto",
                    cursor: "default",
                    zIndex: isHovered ? 20 : 10,
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 6, color: "#cbd5e1" }}>
            <div style={{ fontSize: 28 }}>🖼️</div>
            <div style={{ fontSize: 11 }}>无预览图</div>
          </div>
        )}
      </div>

      {/* ── Controls (top-right) ── */}
      {!loading && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 3, zIndex: 20 }}>
          {[
            { label: "+", fn: handleZoomIn,  title: "放大",   fontSize: 17 },
            { label: "−", fn: handleZoomOut, title: "缩小",   fontSize: 17 },
            { label: "↺", fn: handleReset,   title: "重置视图", fontSize: 14 },
          ].map((b) => (
            <button
              key={b.label}
              onClick={b.fn}
              onMouseDown={(e) => e.stopPropagation()}
              title={b.title}
              style={{ ...controlBtnStyle, fontSize: b.fontSize }}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Tooltip bar (bottom) — shown when a dot or flag is hovered ── */}
      {hoveredAnnotation !== null && annotations[hoveredAnnotation] && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "rgba(15,23,42,0.84)",
          backdropFilter: "blur(6px)",
          borderTop: `2px solid ${annotations[hoveredAnnotation].color}`,
          color: "#f1f5f9",
          padding: "5px 10px",
          fontSize: 11, lineHeight: 1.5,
          zIndex: 30,
        }}>
          <span style={{ fontWeight: 700, color: annotations[hoveredAnnotation].color, marginRight: 6 }}>
            ⬤ #{hoveredAnnotation + 1}
          </span>
          {annotations[hoveredAnnotation].label}
        </div>
      )}
    </div>
  );
}

// ─── FrameReviewCard ───────────────────────────────────────────────────────────
function FrameReviewCard({ frame, thumbnail, thumbLoading, review, onReview }) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [note, setNote] = useState(review?.note || "");
  const [saving, setSaving] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);

  useEffect(() => {
    if (!review) { setOverrideOpen(false); setNote(""); }
    else if (review.action === "override") setNote(review.note || "");
  }, [review]);

  const fc = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";

  // Build annotation objects from flags (up to 5)
  const annotations = (frame.flags || []).slice(0, DOT_POSITIONS.length).map((flag, i) => ({
    ...DOT_POSITIONS[i],
    color: fc,
    label: flag,
  }));

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
            border: "1px solid #fde68a", borderRadius: 6, padding: "5px 10px", marginTop: 4, lineHeight: 1.5,
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
      borderRadius: 10, overflow: "hidden", marginBottom: 10, background: "#ffffff",
      transition: "border-color 0.2s",
    }}>

      {/* ── Full-width header: frame name + score bar ── */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {frame.name}
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: fc, fontFamily: "monospace", flexShrink: 0, marginLeft: 10 }}>
            {frame.score}%
          </span>
        </div>
        <div style={{ height: 3, background: "#e2e8f0", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${frame.score}%`, background: fc, borderRadius: 2, transition: "width 0.7s ease" }} />
        </div>
      </div>

      {/* ── Two-column body: text analysis (50%) | image viewer (50%) ── */}
      <div style={{ display: "flex", minHeight: 220 }}>

        {/* LEFT: flags + review section */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          {/* Evidence flags with numbered badges */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 7, fontWeight: 600 }}>
              📋 证据标记
            </div>
            {(frame.flags || []).map((flag, j) => {
              const isHov = hoveredAnnotation === j;
              return (
                <div
                  key={j}
                  onMouseEnter={() => setHoveredAnnotation(j)}
                  onMouseLeave={() => setHoveredAnnotation(null)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "5px 8px", marginBottom: 4,
                    background: isHov ? fc + "12" : "#f8fafc",
                    borderRadius: 5,
                    borderLeft: `2px solid ${isHov ? fc : "#e2e8f0"}`,
                    cursor: "default",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {/* Numbered circle */}
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    background: isHov ? fc : fc + "70",
                    color: "white", fontSize: 9, fontWeight: 800, fontFamily: "monospace",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}>
                    {j + 1}
                  </span>
                  <span style={{
                    fontSize: 12, color: isHov ? "#334155" : "#64748b",
                    lineHeight: 1.5, flex: 1, transition: "color 0.15s",
                  }}>
                    {flag}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Review badge or action buttons */}
          {reviewBadge ? (
            <div>{reviewBadge}</div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={handleConfirm} disabled={saving}
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
                onClick={() => setOverrideOpen(true)} disabled={saving}
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

        {/* Vertical divider */}
        <div style={{ width: 1, background: "#e2e8f0", flexShrink: 0 }} />

        {/* RIGHT: zoomable / pannable image viewer */}
        <div style={{ flex: 1, position: "relative", minHeight: 220 }}>
          {/* Use absolute inset so the viewer fills the full column height */}
          <div style={{ position: "absolute", top: 8, left: 8, right: 8, bottom: 8 }}>
            <ZoomableImageViewer
              src={thumbnail}
              alt={frame.name}
              annotations={annotations}
              loading={thumbLoading}
              hoveredAnnotation={hoveredAnnotation}
              onAnnotationHover={setHoveredAnnotation}
            />
          </div>
        </div>
      </div>

      {/* ── Override textarea (full-width, shown when open) ── */}
      {overrideOpen && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #fde68a", background: "#fffbeb" }}>
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
              onClick={handleSaveOverride} disabled={saving}
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

  const score      = initialScan.ai_score;
  const color      = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const badge      = score >= 70 ? "⚠ 高度疑似AI" : score >= 40 ? "◑ 部分疑似" : "✓ 原创可信";
  const frames     = initialScan.analysis?.frames || [];
  const nameSource = initialScan.analysis?.studentNameSource ?? null;
  const reviewedCount = Object.keys(reviews).length;
  const dateStr = new Date(initialScan.created_at).toLocaleDateString("zh-CN");

  // Lazy-load thumbnails when the card is first expanded
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
      {/* Collapsed header */}
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

          {/* Student name editor */}
          <div style={{ marginBottom: 16, padding: "10px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 9 }}>
            {nameSource && !nameDirty && studentName && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, fontSize: 11, color: "#0284c7" }}>
                <span style={{ padding: "2px 8px", borderRadius: 20, background: "#e0f2fe", fontWeight: 600 }}>
                  ✨ 自动识别 · {NAME_SOURCE_LABEL[nameSource] || nameSource}
                </span>
                <span style={{ color: "#94a3b8" }}>点击下方输入框可修改</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, flexShrink: 0 }}>👤 学生姓名</span>
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
          </div>

          {/* AI summary */}
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

          {/* Review progress bar */}
          {frames.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 0.6 }}>FRAME 审阅进度</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{reviewedCount} / {frames.length} 帧已记录</span>
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
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          Submissions
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
          审阅每份设计稿的检测证据，填写学生姓名，记录你的判断
        </p>
      </div>

      {!loading && scans.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "#64748b", padding: "3px 10px", border: "1px solid #cbd5e1", borderRadius: 20 }}>
            共 {scans.length} 条记录
          </span>
        </div>
      )}

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
