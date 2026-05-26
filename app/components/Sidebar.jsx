"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const NAV_ITEMS = [
  { href: "/",            label: "Dashboard",   icon: "📊" },
  { href: "/new-scan",    label: "New Scan",    icon: "🔍" },
  { href: "/submissions", label: "Submissions", icon: "📋" },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();

  return (
    <div
      style={{
        width: expanded ? 220 : 64,
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "18px 15px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          minHeight: 64,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <Logo size={34} />
        </div>
        <div
          style={{
            opacity: expanded ? 1 : 0,
            transition: "opacity 0.15s ease",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", letterSpacing: -0.4 }}>
            ProofMade
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, letterSpacing: 0.5 }}>
            第一期上线
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 10px",
                  borderRadius: 8,
                  marginBottom: 2,
                  background: active ? "#dbeafe" : "transparent",
                  color: active ? "#2563eb" : "#64748b",
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 0.15s ease" }}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid #e2e8f0", flexShrink: 0 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "收起" : "展开"}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "#94a3b8",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: expanded ? "flex-end" : "center",
            gap: 5,
          }}
        >
          {expanded ? (
            <>
              <span style={{ fontSize: 11 }}>收起</span>
              <span>◀</span>
            </>
          ) : (
            <span>▶</span>
          )}
        </button>
      </div>
    </div>
  );
}
