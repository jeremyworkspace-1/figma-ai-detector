"use client";

import { useState, useEffect } from "react";
import { ZoomableImageViewer, DOT_POSITIONS } from "./ZoomableImageViewer";

// ─── Action metadata ──────────────────────────────────────────────────────────
// Shared by FrameReviewCard (badge) and New Scan Step 3 (chips).
// Covers both new semantic actions and legacy "confirm"/"override" values.
export const ACTION_META = {
  confirm_original:   { icon: "✅", text: "确认为原创",      bg: "#d1fae5", color: "#059669", border: "#a7f3d0" },
  confirm_partial_ai: { icon: "⚠️", text: "确认为部分AI",    bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  confirm_full_ai:    { icon: "🚫", text: "确认为AI生成",    bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  flag_suspicious:    { icon: "⚠️", text: "已标记为可疑",    bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  // Legacy values kept for backwards-compat display
  confirm:            { icon: "✅", text: "已确认",           bg: "#d1fae5", color: "#059669", border: "#a7f3d0" },
  override:           { icon: "✏️", text: "教师已复核",       bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
};

// Default when action is unrecognised or absent
const ACTION_META_DEFAULT = { icon: "—", text: "未审阅", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };

export function getActionMeta(action) {
  return ACTION_META[action] ?? ACTION_META_DEFAULT;
}

// ─── Button configs per score range ──────────────────────────────────────────
// requiresNote: true → clicking opens the note textarea first
const BUTTONS = {
  // AI said "原创可信" (score < 40)
  low: [
    {
      action: "confirm_original",
      icon: "✅", label: "确认原创",
      bg: "#f0fdf4", color: "#15803d", border: "#a7f3d0",
      requiresNote: false,
    },
    {
      action: "flag_suspicious",
      icon: "⚠️", label: "我觉得有问题",
      bg: "#fffbeb", color: "#d97706", border: "#fde68a",
      requiresNote: true,
    },
  ],
  // AI said "高度疑似AI" (score >= 70)
  high: [
    {
      action: "confirm_full_ai",
      icon: "🚫", label: "确认AI生成",
      bg: "#fef2f2", color: "#dc2626", border: "#fecaca",
      requiresNote: false,
    },
    {
      action: "confirm_original",
      icon: "✅", label: "我觉得是原创",
      bg: "#f0fdf4", color: "#15803d", border: "#a7f3d0",
      requiresNote: true,
    },
  ],
  // AI said "部分疑似" (40 ≤ score < 70)
  mid: [
    {
      action: "confirm_partial_ai",
      icon: "⚠️", label: "确认部分AI",
      bg: "#fffbeb", color: "#d97706", border: "#fde68a",
      requiresNote: false,
    },
    {
      action: "confirm_original",
      icon: "✅", label: "我觉得是原创",
      bg: "#f0fdf4", color: "#15803d", border: "#a7f3d0",
      requiresNote: true,
    },
    {
      action: "confirm_full_ai",
      icon: "🚫", label: "确认完全AI生成",
      bg: "#fef2f2", color: "#dc2626", border: "#fecaca",
      requiresNote: false,
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
// Props:
//  frame        — { name, score, flags, nodeId }
//  thumbnail    — image URL or null
//  thumbLoading — bool
//  review       — { action, note } | null
//  onReview     — (action, note) => void | Promise<void>
//                 action: one of the ACTION_META keys, or null (= clear)
export function FrameReviewCard({ frame, thumbnail, thumbLoading, review, onReview }) {
  const [pendingAction,     setPendingAction]     = useState(null); // action awaiting a note, or null
  const [note,              setNote]              = useState("");
  const [saving,            setSaving]            = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);

  // Sync note field when review changes externally
  useEffect(() => {
    if (!review) { setPendingAction(null); setNote(""); }
    else if (review.action && review.note) setNote(review.note);
  }, [review]);

  // Frame colour based on AI score
  const fc = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";

  // Which button set to show
  const scoreRange = frame.score >= 70 ? "high" : frame.score >= 40 ? "mid" : "low";
  const buttons    = BUTTONS[scoreRange];

  // Card border reflects current review verdict
  const reviewMeta   = review ? getActionMeta(review.action) : null;
  const cardBorder   = reviewMeta ? reviewMeta.border : "#e2e8f0";

  const annotations = (frame.flags || []).slice(0, DOT_POSITIONS.length).map((flag, i) => ({
    ...DOT_POSITIONS[i],
    color: fc,
    label: flag,
  }));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleButton = async (btn) => {
    if (btn.requiresNote) {
      setPendingAction(btn.action);
      setNote("");
      return;
    }
    setSaving(true);
    await onReview(btn.action, "");
    setSaving(false);
  };

  const handleSaveWithNote = async () => {
    if (!pendingAction) return;
    setSaving(true);
    await onReview(pendingAction, note);
    setPendingAction(null);
    setSaving(false);
  };

  const handleCancelNote = () => {
    setPendingAction(null);
    setNote(review?.note || "");
  };

  const handleClear = async () => {
    setSaving(true);
    await onReview(null, "");
    setPendingAction(null);
    setNote("");
    setSaving(false);
  };

  // ── Review badge (shown once a verdict is saved) ──────────────────────────
  const reviewBadge = review ? (() => {
    const meta = getActionMeta(review.action);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: review.note ? 4 : 0 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: meta.bg, color: meta.color,
          }}>
            {meta.icon} {meta.text}
          </span>
          <button onClick={handleClear} disabled={saving} title="撤销"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: 0, lineHeight: 1 }}>
            ×
          </button>
        </div>
        {review.note && (
          <div style={{
            fontSize: 12, color: "#78350f", background: "#fffbeb",
            border: "1px solid #fde68a", borderRadius: 6, padding: "5px 10px", lineHeight: 1.5,
          }}>
            💬 {review.note}
          </div>
        )}
      </div>
    );
  })() : null;

  // ─── Note textarea config based on pending action ────────────────────────
  const pendingMeta = pendingAction ? getActionMeta(pendingAction) : null;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      border: `1px solid ${cardBorder}`,
      borderRadius: 10, overflow: "hidden", marginBottom: 10,
      background: "#ffffff", transition: "border-color .2s",
    }}>
      {/* Full-width header: name + score bar */}
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
          <div style={{ height: "100%", width: `${frame.score}%`, background: fc, borderRadius: 2, transition: "width .7s ease" }} />
        </div>
      </div>

      {/* Two-column body: text (50%) | image viewer (50%) */}
      <div style={{ display: "flex", minHeight: 220 }}>

        {/* LEFT: numbered flags + action area */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          {/* Evidence flags */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: .8, marginBottom: 7, fontWeight: 600 }}>
              📋 证据标记
            </div>
            {(frame.flags || []).map((flag, j) => {
              const isHov = hoveredAnnotation === j;
              return (
                <div key={j}
                  onMouseEnter={() => setHoveredAnnotation(j)}
                  onMouseLeave={() => setHoveredAnnotation(null)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "5px 8px", marginBottom: 4,
                    background: isHov ? fc + "12" : "#f8fafc",
                    borderRadius: 5,
                    borderLeft: `2px solid ${isHov ? fc : "#e2e8f0"}`,
                    cursor: "default",
                    transition: "background .15s, border-color .15s",
                  }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    background: isHov ? fc : fc + "70",
                    color: "white", fontSize: 9, fontWeight: 800, fontFamily: "monospace",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background .15s",
                  }}>{j + 1}</span>
                  <span style={{ fontSize: 12, color: isHov ? "#334155" : "#64748b", lineHeight: 1.5, flex: 1, transition: "color .15s" }}>
                    {flag}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action area: badge | buttons */}
          {reviewBadge ? (
            <div>{reviewBadge}</div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {buttons.map((btn) => (
                <button key={btn.action}
                  onClick={() => handleButton(btn)}
                  disabled={saving || pendingAction === btn.action}
                  style={{
                    padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${btn.border}`,
                    background: pendingAction === btn.action ? btn.bg : btn.bg,
                    color: btn.color,
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    transition: "opacity .15s",
                  }}>
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: "#e2e8f0", flexShrink: 0 }} />

        {/* RIGHT: zoomable image viewer */}
        <div style={{ flex: 1, position: "relative", minHeight: 220 }}>
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

      {/* Note textarea — shown when a button with requiresNote was clicked */}
      {pendingAction && (
        <div style={{
          padding: "12px 14px",
          borderTop: `1px solid ${pendingMeta?.border ?? "#fde68a"}`,
          background: pendingMeta?.bg ?? "#fffbeb",
        }}>
          <div style={{ fontSize: 12, color: pendingMeta?.color ?? "#92400e", marginBottom: 6, fontWeight: 600 }}>
            {pendingMeta?.icon} {pendingMeta?.text} — 请说明判断依据
          </div>
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              pendingAction === "flag_suspicious"
                ? "例如：图层命名异常整齐、文字内容为模板占位符，怀疑为 AI 生成…"
                : "例如：该画面有明显手绘草图痕迹，与 AI 风格差异较大…"
            }
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 7,
              border: `1px solid ${pendingMeta?.border ?? "#fde68a"}`,
              fontSize: 12, color: "#0f172a",
              background: "#ffffff", fontFamily: "inherit",
              resize: "vertical", minHeight: 64, boxSizing: "border-box",
              outline: "none", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
            <button
              onClick={handleCancelNote}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
              取消
            </button>
            <button
              onClick={handleSaveWithNote}
              disabled={saving}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none",
                background: pendingMeta?.color ?? "#f59e0b",
                color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: saving ? "default" : "pointer",
              }}>
              {saving ? "保存中…" : "确认提交"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
