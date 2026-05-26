export const metadata = {
  title: "Figma AI 检测器",
  description: "检测 Figma 原型是否由 AI 生成",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
