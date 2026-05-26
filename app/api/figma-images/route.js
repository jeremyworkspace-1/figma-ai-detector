import { NextResponse } from "next/server";

function parseFigmaKey(url) {
  const match = url.match(/figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error("无效的 Figma 链接");
  return match[2];
}

export async function POST(request) {
  try {
    const { figmaUrl, nodeIds } = await request.json();

    if (!figmaUrl || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return NextResponse.json({ images: {} });
    }

    if (!process.env.FIGMA_TOKEN) {
      return NextResponse.json({ error: "服务端未配置 FIGMA_TOKEN", images: {} }, { status: 500 });
    }

    const fileKey = parseFigmaKey(figmaUrl);
    // Figma Images API: ids are colon-separated, joined by commas
    const ids = nodeIds.join(",");

    const res = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=jpg&scale=0.5`,
      { headers: { "X-Figma-Token": process.env.FIGMA_TOKEN } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.err || res.statusText, images: {} },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ images: data.images || {} });
  } catch (err) {
    console.error("[figma-images]", err);
    return NextResponse.json({ error: err.message, images: {} }, { status: 500 });
  }
}
