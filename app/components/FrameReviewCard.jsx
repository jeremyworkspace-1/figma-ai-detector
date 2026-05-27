"use client";

import { useState, useEffect } from "react";
import { ZoomableImageViewer, DOT_POSITIONS } from "./ZoomableImageViewer";
import { useLang } from "../context/AppContext";

// ─── Action metadata (visual properties only — text comes from t()) ────────────
// Exported so new-scan/page.jsx can read icon/bg/color/border for chips.
export const ACTION_META = {
  confirm_original:   { icon: "✅", bg: "#d1fae5", color: "#059669", border: "#a7f3d0" },
  confirm_partial_ai: { icon: "⚠️", bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  confirm_full_ai:    { icon: "🚫", bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  flag_suspicious:    { icon: "⚠️", bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  // Legacy values kept for backwards-compat display
  confirm:            { icon: "✅", bg: "#d1fae5", color: "#059669", border: "#a7f3d0" },
  override:           { icon: "✏️", bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
};

const ACTION_META_DEFAULT = { icon: "—", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };

export function getActionMeta(action) {
  return ACTION_META[action] ?? ACTION_META_DEFAULT;
}

// ─── Button configs per score range (labelKey is an i18n key) ─────────────────
const BUTTONS = {
  // AI said low risk (score < 40)
  low: [
    {
      action: "confirm_original",
      icon: "✅", labelKey: "btn.confirmOriginal",
      bg: "#f0fdf4", color: "#15803d", border: "#a7f3d0",
      requiresNote: false,
    },
    {
      action: "flag_suspicious",
      icon: "⚠️", labelKey: "btn.flagSuspicious",
      bg: "#fffbeb", color: "#d97706", border: "#fde68a",
      requiresNote: true,
    },
  ],
  // AI said high risk (score >= 70)
  high: [
    {
      action: "confirm_full_ai",
      icon: "🚫", labelKey: "btn.confirmFullAI",
      bg: "#fef2f2", color: "#dc2626", border: "#fecaca",
      requiresNote: false,
    },
    {
      action: "confirm_original",
      icon: "✅", labelKey: "btn.iThinkOriginal",
      bg: "#f0fdf4", color: "#15803d", border: "#a7f3d0",
      requiresNote: true,
    },
  ],
  // AI said mid (40 ≤ score < 70)
  mid: [
    {
      action: "confirm_partial_ai",
      icon: "⚠️", labelKey: "btn.confirmPartialAI",
      bg: "#fffbeb", color: "#d97706", border: "#fde68a",
      requiresNote: false,
    },
    {
      action: "confirm_original",
      icon: "✅", labelKey: "btn.iThinkOriginal",
      bg: "#f0fdf4", color: "#15803d", border: "#a7f3d0",
      requiresNote: true,
    },
    {
      action: "confirm_full_ai",
      icon: "🚫", labelKey: "btn.confirmFullAI2",
      bg: "#fef2f2", color: "#dc2626", border: "#fecaca",
      requiresNote: false,
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
export function FrameReviewCard({ frame, thumbnail, thumbLoading, review, onReview }) {
  const { t } = useLang();

  const [pendingAction,     setPendingAction]     = useState(null);
  const [note,              setNote]              = useState("");
  const [saving,            setSaving]            = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);

  // Sync note field when review changes externally
  useEffect(() => {
    if (!review) { setPendingAction(null); setNote(""); }
    else if (review.action && review.note) setNote(review.note);
  }, [review]);

  const fc = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";
  const scoreRange = frame.score >= 70 ? "high" : frame.score >= 40 ? "mid" : "low";
  const buttons    = BUTTONS[scoreRange];

  const reviewMeta = review ? getActionMeta(review.action) : null;
  const cardBorder = reviewMeta ? reviewMeta.border : "#e2e8f0";

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

  // ── Review badge ──────────────────────────────────────────────────────────
  const reviewBadge = review ? (() => {
    const meta = getActionMeta(review.action);
    const actionText = t(`action.${review.action}.text`);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: review.note ? 4 : 0 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: meta.bg, color: meta.color,
          }}>
            {meta.icon} {actionText}
          </span>
          <button onClick={handleClear} disabled={saving} title="×"
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

  // Note textarea config
  const pendingMeta       = pendingAction ? getActionMeta(pendingAction) : null;
  const pendingActionText = pendingAction ? t(`action.${pendingAction}.text`) : null;
  const notePlaceholder   = pendingAction === "flag_suspicious"
    ? t("frame.flagPlaceholder")
    : t("frame.originalPlaceholder");

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      border: `1px solid ${cardBorder}`,
      borderRadius: 10, overflow: "hidden", marginBottom: 10,
      background: "#ffffff", transition: "border-color .2s",
    }}>
      {/* Header: name + score bar */}
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

      {/* Two-column body */}
      <div style={{ display: "flex", minHeight: 220 }}>
        {/* LEFT: flags + action area */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: .8, marginBottom: 7, fontWeight: 600 }}>
              {t("frame.evidenceFlags")}
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
                    background: btn.bg,
                    color: btn.color,
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    transition: "opacity .15s",
                  }}>
                  {btn.icon} {t(btn.labelKey)}
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

      {/* Note textarea */}
      {pendingAction && (
        <div style={{
          padding: "12px 14px",
          borderTop: `1px solid ${pendingMeta?.border ?? "#fde68a"}`,
          background: pendingMeta?.bg ?? "#fffbeb",
        }}>
          <div style={{ fontSize: 12, color: pendingMeta?.color ?? "#92400e", marginBottom: 6, fontWeight: 600 }}>
            {pendingMeta?.icon} {pendingActionText} {t("frame.pleaseExplain")}
          </div>
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={notePlaceholder}
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
              {t("frame.cancel")}
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
              {saving ? t("frame.saving") : t("frame.confirmSubmit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
