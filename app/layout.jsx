import Sidebar from "./components/Sidebar";
import { AppProvider } from "./context/AppContext";

export const metadata = {
  title: "Figma AI 检测器",
  description: "检测 Figma 原型是否由 AI 生成",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', 'PingFang SC', sans-serif" }}>
        <AppProvider>
          <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            <Sidebar />
            <main
              style={{
                flex: 1,
                background: "#f8fafc",
                overflowY: "auto",
                color: "#0f172a",
              }}
            >
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
