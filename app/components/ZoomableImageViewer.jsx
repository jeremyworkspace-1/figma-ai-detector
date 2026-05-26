"use client";

import { useState, useEffect, useRef } from "react";

// Predefined scatter positions for annotation dots (% from top-left of image).
// Scale-compensated: dots stay constant physical size on screen at any zoom level.
export const DOT_POSITIONS = [
  { x: 25, y: 26 },
  { x: 73, y: 33 },
  { x: 50, y: 63 },
  { x: 18, y: 70 },
  { x: 80, y: 68 },
];

// Props:
//  src               — image URL (null → placeholder)
//  alt               — img alt text
//  annotations       — [{x, y, color, label}] — dot descriptors
//  loading           — show spinner instead of image
//  hoveredAnnotation — index of externally hovered annotation (bidirectional)
//  onAnnotationHover — (index|null) => void
export function ZoomableImageViewer({
  src,
  alt,
  annotations = [],
  loading,
  hoveredAnnotation,
  onAnnotationHover,
}) {
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

  // Mouse-wheel zoom — non-passive so we can call preventDefault
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

  // Click-drag pan — window-level listeners so dragging outside the box works
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

  const ctrlBtn = {
    width: 28, height: 28, borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(6px)",
    color: "#f8fafc", fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1,
  };

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      background: "#f1f5f9", borderRadius: 8, overflow: "hidden",
    }}>
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
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}>
            <img src={src} alt={alt} draggable={false}
              style={{ width: "100%", display: "block", pointerEvents: "none" }} />

            {/* Scale-compensated dots
                dot.scale(1/zoom) × parent.scale(zoom) → constant 24 px on screen  */}
            {annotations.map((ann, i) => {
              const isHov = hoveredAnnotation === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => !isDragging && onAnnotationHover(i)}
                  onMouseLeave={() => onAnnotationHover(null)}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    left: `${ann.x}%`, top: `${ann.y}%`,
                    transform: `translate(-50%,-50%) scale(${(isHov ? 1.3 : 1) / scale})`,
                    width: 24, height: 24, borderRadius: "50%",
                    background: ann.color,
                    border: "2.5px solid white",
                    boxShadow: isHov
                      ? `0 2px 6px rgba(0,0,0,.4), 0 0 0 4px ${ann.color}45`
                      : "0 2px 6px rgba(0,0,0,.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 10, fontWeight: 800, fontFamily: "monospace",
                    pointerEvents: "auto", cursor: "default",
                    zIndex: isHov ? 20 : 10,
                    transition: "transform .15s, box-shadow .15s",
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
            { label: "+", fn: handleZoomIn,  title: "放大",    fs: 17 },
            { label: "−", fn: handleZoomOut, title: "缩小",    fs: 17 },
            { label: "↺", fn: handleReset,   title: "重置视图", fs: 14 },
          ].map((b) => (
            <button key={b.label} onClick={b.fn} onMouseDown={(e) => e.stopPropagation()}
              title={b.title} style={{ ...ctrlBtn, fontSize: b.fs }}>
              {b.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Tooltip bar (bottom) ── */}
      {hoveredAnnotation !== null && annotations[hoveredAnnotation] && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "rgba(15,23,42,.84)", backdropFilter: "blur(6px)",
          borderTop: `2px solid ${annotations[hoveredAnnotation].color}`,
          color: "#f1f5f9", padding: "5px 10px", fontSize: 11, lineHeight: 1.5, zIndex: 30,
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
