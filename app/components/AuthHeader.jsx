"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { useLang } from "../context/AppContext";
import LangToggle from "./LangToggle";

/**
 * Client component for the top-right header controls:
 *   [🌐 中文 / EN]  [登录]  [注册]   (signed-out)
 *   [🌐 中文 / EN]  [avatar]          (signed-in)
 *
 * Extracted from layout.jsx (server component) so it can consume AppContext.
 */
export default function AuthHeader() {
  const { t } = useLang();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <LangToggle />

      <Show when="signed-out">
        <SignInButton>
          <button
            style={{
              padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0",
              background: "transparent", color: "#475569",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            {t("header.signIn")}
          </button>
        </SignInButton>
        <SignUpButton>
          <button
            style={{
              padding: "6px 14px", borderRadius: 7, border: "none",
              background: "#2563eb", color: "#ffffff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t("header.signUp")}
          </button>
        </SignUpButton>
      </Show>

      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
