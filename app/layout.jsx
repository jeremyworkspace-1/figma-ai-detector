import { ClerkProvider } from "@clerk/nextjs";
import Sidebar from "./components/Sidebar";
import BottomTabBar from "./components/BottomTabBar";
import AuthHeader from "./components/AuthHeader";
import { AppProvider } from "./context/AppContext";

export const metadata = {
  title: "ProofMade",
  description: "检测 Figma 原型是否由 AI 生成",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', 'PingFang SC', sans-serif" }}>
        <ClerkProvider>
          <AppProvider>
            <style>{`
              .bottom-tab-bar { display: none; }
              @media (max-width: 767px) {
                .sidebar-wrapper { display: none; }
                .bottom-tab-bar { display: block; }
                .page-main { padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important; }
              }
            `}</style>
            <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
              <div className="sidebar-wrapper"><Sidebar /></div>
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
                  <AuthHeader />
                </header>

                {/* Main content */}
                <main className="page-main" style={{ flex: 1, background: "#f8fafc", overflowY: "auto", color: "#0f172a" }}>
                  {children}
                </main>
              </div>
            </div>
            <BottomTabBar />
          </AppProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
