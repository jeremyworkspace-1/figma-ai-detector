import { NextResponse } from "next/server";

function parseFigmaKey(url) {
  const match = url.match(/figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error("无效的 Figma 链接，请检查格式");
  return match[2];
}

export async function POST(request) {
  try {
    const { figmaUrl } = await request.json();

    if (!figmaUrl?.trim()) {
      return NextResponse.json({ error: "请提供 Figma 链接" }, { status: 400 });
    }

    let fileKey;
    try {
      fileKey = parseFigmaKey(figmaUrl);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    if (!process.env.FIGMA_TOKEN) {
      return NextResponse.json({ error: "服务端未配置 FIGMA_TOKEN" }, { status: 500 });
    }

    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { "X-Figma-Token": process.env.FIGMA_TOKEN },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Figma API 错误: ${err.err || res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const pages = (data.document?.children || []).map((p) => ({
      id: p.id,
      name: p.name,
    }));

    return NextResponse.json({ pages, fileName: data.name });
  } catch (err) {
    console.error("[figma-pages]", err);
    return NextResponse.json({ error: err.message || "获取页面列表失败" }, { status: 500 });
  }
}
