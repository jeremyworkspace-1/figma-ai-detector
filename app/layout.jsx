import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Sidebar from "./components/Sidebar";
import { AppProvider } from "./context/AppContext";

export const metadata = {
  title: "ProofMade",
  description: "检测 Figma 原型是否由 AI 生成",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', 'PingFang SC', sans-serif" }}>
        <ClerkProvider>
          <AppProvider>
            <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
              <Sidebar />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Auth header */}
                <header
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    padding: "10px 20px",
                    background: "#ffffff",
                    borderBottom: "1px solid #e2e8f0",
                    flexShrink: 0,
                  }}
                >
                  {/* Auth controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Show when="signed-out">
                    <SignInButton>
                      <button
                        style={{
                          padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0",
                          background: "transparent", color: "#475569",
                          fontSize: 13, fontWeight: 500, cursor: "pointer",
                        }}
                      >
                        登录
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
                        注册
                      </button>
                    </SignUpButton>
                  </Show>
                  <Show when="signed-in">
                    <UserButton />
                  </Show>
                  </div>
                </header>

                {/* Main content */}
                <main style={{ flex: 1, background: "#f8fafc", overflowY: "auto", color: "#0f172a" }}>
                  {children}
                </main>
              </div>
            </div>
          </AppProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
