"use client";

import { useState, useEffect } from "react";
import { ZoomableImageViewer, DOT_POSITIONS } from "./ZoomableImageViewer";

// Props:
//  frame       — { name, score, flags, nodeId }
//  thumbnail   — image URL or null
//  thumbLoading — bool
//  review      — { action, note } | null
//  onReview    — (action, note) => void | Promise<void>
//               action: "confirm" | "override" | null (null = clear)
export function FrameReviewCard({ frame, thumbnail, thumbLoading, review, onReview }) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [note, setNote] = useState(review?.note || "");
  const [saving, setSaving] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);

  useEffect(() => {
    if (!review) { setOverrideOpen(false); setNote(""); }
    else if (review.action === "override") setNote(review.note || "");
  }, [review]);

  const fc = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f59e0b" : "#22c55e";

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
        }}>✅ 已确认为AI生成</span>
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
          }}>✏️ 教师已复核</span>
          <button onClick={handleClear} disabled={saving} title="撤销"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>
            ×
          </button>
        </div>
        {review.note && (
          <div style={{
            fontSize: 12, color: "#78350f", background: "#fffbeb",
            border: "1px solid #fde68a", borderRadius: 6, padding: "5px 10px", marginTop: 4, lineHeight: 1.5,
          }}>💬 {review.note}</div>
        )}
      </div>
    )
  ) : null;

  return (
    <div style={{
      border: `1px solid ${review?.action === "confirm" ? "#a7f3d0" : review?.action === "override" ? "#fde68a" : "#e2e8f0"}`,
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

        {/* LEFT: numbered flags + review */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
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
                  }}
                >
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

          {/* Review badge or action buttons */}
          {reviewBadge ? (
            <div>{reviewBadge}</div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={handleConfirm} disabled={saving} style={{
                padding: "5px 12px", borderRadius: 6,
                border: "1px solid #a7f3d0", background: "#f0fdf4",
                color: "#15803d", fontSize: 12, fontWeight: 600,
                cursor: saving ? "default" : "pointer",
              }}>✅ 确认AI判断</button>
              <button onClick={() => setOverrideOpen(true)} disabled={saving} style={{
                padding: "5px 12px", borderRadius: 6,
                border: "1px solid #fde68a", background: "#fff7ed",
                color: "#c2410c", fontSize: 12, fontWeight: 600,
                cursor: saving ? "default" : "pointer",
              }}>✏️ 我有不同意见</button>
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

      {/* Override textarea (full-width) */}
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
              width: "100%", padding: "8px 10px", borderRadius: 7,
              border: "1px solid #fde68a", fontSize: 12, color: "#0f172a",
              background: "#ffffff", fontFamily: "inherit",
              resize: "vertical", minHeight: 64, boxSizing: "border-box",
              outline: "none", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => { setOverrideOpen(false); setNote(review?.note || ""); }}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer" }}
            >取消</button>
            <button onClick={handleSaveOverride} disabled={saving} style={{
              padding: "5px 14px", borderRadius: 6, border: "none",
              background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: saving ? "default" : "pointer",
            }}>{saving ? "保存中…" : "确认提交备注"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
