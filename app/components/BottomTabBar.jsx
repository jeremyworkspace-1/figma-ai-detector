"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── SVG icons (Feather-style, stroke="currentColor") ─────────────────────────
function IconDashboard() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3"  y="3"  width="7" height="7" rx="1.5" />
      <rect x="14" y="3"  width="7" height="7" rx="1.5" />
      <rect x="3"  y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconNewScan() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21"   y1="21"    x2="16.65" y2="16.65" />
      <line x1="11"   y1="8"     x2="11"    y2="14" />
      <line x1="8"    y1="11"    x2="14"    y2="11" />
    </svg>
  );
}

function IconSubmissions() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9"  x2="8" y2="9"  />
    </svg>
  );
}

const TABS = [
  { href: "/",            label: "Dashboard",   Icon: IconDashboard   },
  { href: "/new-scan",    label: "New Scan",    Icon: IconNewScan     },
  { href: "/submissions", label: "Submissions", Icon: IconSubmissions },
];

// ─── Bottom Tab Bar ────────────────────────────────────────────────────────────
// Shown only on mobile (≤ 767 px) via CSS class; hidden on desktop.
export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="bottom-tab-bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        // Frosted-glass background — native mobile feel
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(226, 232, 240, 0.8)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: 56,
          // Push content up above iPhone home-indicator
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{ flex: 1, textDecoration: "none" }}>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 3,
                  color: active ? "#2563eb" : "#94a3b8",
                  transition: "color 0.15s",
                }}
              >
                {/* Active indicator — thin line at the very top of the tab */}
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "28%",
                      right: "28%",
                      height: 2.5,
                      background: "#2563eb",
                      borderRadius: "0 0 3px 3px",
                    }}
                  />
                )}

                <Icon />

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: active ? 700 : 400,
                    letterSpacing: 0.2,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
