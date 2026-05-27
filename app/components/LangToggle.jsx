"use client";

import { useLang } from "../context/AppContext";

/**
 * Globe toggle button: shows "🌐 中文 / EN" with the active language highlighted.
 * Clicking flips between zh and en, persisting to localStorage via AppContext.
 */
export default function LangToggle() {
  const { lang, setLang } = useLang();

  const isZh = lang === "zh";

  return (
    <button
      onClick={() => setLang(isZh ? "en" : "zh")}
      title={isZh ? "Switch to English" : "切换为中文"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 11px",
        borderRadius: 7,
        border: "1px solid #e2e8f0",
        background: "transparent",
        color: "#64748b",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "border-color .15s, color .15s",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#93c5fd";
        e.currentTarget.style.color = "#2563eb";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.color = "#64748b";
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>🌐</span>
      <span style={{ color: isZh ? "#0f172a" : "#94a3b8", fontWeight: isZh ? 700 : 400 }}>中文</span>
      <span style={{ color: "#cbd5e1", margin: "0 1px" }}>/</span>
      <span style={{ color: isZh ? "#94a3b8" : "#0f172a", fontWeight: isZh ? 400 : 700 }}>EN</span>
    </button>
  );
}
