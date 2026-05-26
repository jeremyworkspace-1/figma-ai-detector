import { useState, useRef } from "react";

const SCAN_SIGNALS = [
  { id: "layer_naming", label: "图层命名规律", weight: 15 },
  { id: "component_structure", label: "组件结构复杂度", weight: 20 },
  { id: "color_consistency", label: "色彩一致性", weight: 10 },
  { id: "spacing_patterns", label: "间距规律性", weight: 15 },
  { id: "typography", label: "字体层级设计", weight: 15 },
  { id: "interaction_depth", label: "交互逻辑深度", weight: 25 },
];

const SAMPLE_RESULTS = [
  {
    student: "张同学",
    file: "电商App原型.fig",
    aiScore: 87,
    signals: [88, 92, 70, 95, 80, 90],
    flags: ["图层命名过于规范（Frame1, Frame2）", "间距精确到像素级别", "交互逻辑高度模板化"],
    time: "2025-05-24",
  },
  {
    student: "李同学",
    file: "旅游平台设计.fig",
    aiScore: 34,
    signals: [30, 25, 50, 28, 40, 35],
    flags: ["命名具有个人风格", "存在明显手动调整痕迹"],
    time: "2025-05-24",
  },
  {
    student: "王同学",
    file: "社交媒体原型.fig",
    aiScore: 61,
    signals: [65, 70, 45, 60, 55, 72],
    flags: ["部分组件结构高度规整", "色彩使用接近AI默认配色"],
    time: "2025-05-23",
  },
];

function ScoreRing({ score, size = 80 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const label = score >= 70 ? "高度疑似" : score >= 40 ? "部分疑似" : "原创可信";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text
          x={size / 2} y={size / 2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size * 0.22} fontWeight="700"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontFamily: "monospace" }}
        >
          {score}%
        </text>
      </svg>
      <span style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: 1 }}>{label}</span>
    </div>
  );
}

function SignalBar({ label, value, index }) {
  const color = value >= 70 ? "#ef4444" : value >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: `${value}%`, background: color,
            borderRadius: 3, transition: `width 1s ease ${index * 0.1}s`,
          }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result, onExpand, expanded }) {
  const aiColor = result.aiScore >= 70 ? "#ef4444" : result.aiScore >= 40 ? "#f59e0b" : "#22c55e";
  const badge = result.aiScore >= 70 ? "⚠ 高度疑似AI" : result.aiScore >= 40 ? "◑ 部分疑似" : "✓ 原创可信";

  return (
    <div
      onClick={onExpand}
      style={{
        background: expanded ? "#0f172a" : "#0d1b2a",
        border: `1px solid ${expanded ? aiColor + "60" : "#1e3a5f"}`,
        borderLeft: `3px solid ${aiColor}`,
        borderRadius: 12,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", fontFamily: "'Noto Serif SC', serif" }}>
              {result.student}
            </span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20,
              background: aiColor + "20", color: aiColor, fontWeight: 600, letterSpacing: 0.5
            }}>
              {badge}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#475569" }}>{result.file} · {result.time}</div>
        </div>
        <ScoreRing score={result.aiScore} size={70} />
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e3a5f" }}>
          <div style={{ marginBottom: 14 }}>
            {SCAN_SIGNALS.map((sig, i) => (
              <SignalBar key={sig.id} label={sig.label} value={result.signals[i]} index={i} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>检测标记</div>
            {result.flags.map((f, i) => (
              <div key={i} style={{
                fontSize: 12, color: "#94a3b8", padding: "4px 10px", marginBottom: 4,
                background: "#0f172a", borderRadius: 6, borderLeft: "2px solid #334155"
              }}>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadZone({ onUpload, scanning }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onUpload(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#3b82f6" : "#1e3a5f"}`,
        borderRadius: 16,
        padding: "36px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "#0c1a2e" : "transparent",
        transition: "all 0.2s",
        marginBottom: 24,
      }}
    >
      <input ref={ref} type="file" multiple accept=".fig,.pdf,.png,.jpg" style={{ display: "none" }}
        onChange={(e) => onUpload([...e.target.files])} />
      {scanning ? (
        <div>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <div style={{ color: "#3b82f6", fontSize: 14, fontWeight: 600 }}>正在扫描分析中…</div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>AI特征检测运行中</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ color: "#94a3b8", fontSize: 14 }}>拖拽上传学生 Figma 文件</div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>.fig · .pdf · 截图均可识别</div>
          <div style={{
            marginTop: 14, display: "inline-block", padding: "8px 20px",
            background: "#1e3a5f", borderRadius: 8, color: "#60a5fa", fontSize: 13, fontWeight: 600
          }}>
            选择文件
          </div>
        </div>
      )}
    </div>
  );
}

export default function FigmaAIDetector() {
  const [results, setResults] = useState(SAMPLE_RESULTS);
  const [expanded, setExpanded] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState("results");

  const handleUpload = async (files) => {
    setScanning(true);
    setTab("results");
    await new Promise((r) => setTimeout(r, 2200));
    const newResults = files.map((f, i) => ({
      student: `新上传·${f.name.split(".")[0]}`,
      file: f.name,
      aiScore: Math.floor(Math.random() * 80 + 10),
      signals: SCAN_SIGNALS.map(() => Math.floor(Math.random() * 80 + 10)),
      flags: ["自动检测完成，请人工复核"],
      time: new Date().toISOString().slice(0, 10),
    }));
    setResults([...newResults, ...results]);
    setScanning(false);
  };

  const avgScore = Math.round(results.reduce((a, b) => a + b.aiScore, 0) / results.length);
  const highRisk = results.filter((r) => r.aiScore >= 70).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060e1a",
      fontFamily: "'Inter', 'PingFang SC', sans-serif",
      color: "#e2e8f0",
      padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)",
        borderBottom: "1px solid #1e3a5f",
        padding: "20px 28px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 2 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🔬</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>Figma AI 检测器</div>
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: 1 }}>PROTOTYPE AUTHENTICITY SCANNER</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "已扫描", value: results.length, unit: "份", color: "#60a5fa" },
            { label: "平均AI率", value: `${avgScore}%`, unit: "", color: avgScore >= 60 ? "#f59e0b" : "#22c55e" },
            { label: "高风险", value: highRisk, unit: "份", color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#0d1b2a", border: "1px solid #1e3a5f",
              borderRadius: 12, padding: "14px 12px", textAlign: "center"
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>
                {s.value}{s.unit}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["results", "检测结果"], ["upload", "上传文件"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === id ? "#1e3a5f" : "transparent",
              color: tab === id ? "#60a5fa" : "#475569",
              fontSize: 13, fontWeight: 600,
            }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "upload" && (
          <UploadZone onUpload={handleUpload} scanning={scanning} />
        )}

        {tab === "results" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#475569" }}>点击卡片查看详细分析</div>
              <div style={{ fontSize: 11, color: "#334155", padding: "3px 10px", border: "1px solid #1e3a5f", borderRadius: 20 }}>
                共 {results.length} 份
              </div>
            </div>
            {results.map((r, i) => (
              <ResultCard
                key={i} result={r}
                expanded={expanded === i}
                onExpand={() => setExpanded(expanded === i ? null : i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: "0 20px", marginTop: 20 }}>
        <div style={{
          background: "#0d1b2a", border: "1px solid #1e3a5f",
          borderRadius: 12, padding: "14px 16px"
        }}>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, letterSpacing: 1 }}>评分说明</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { color: "#22c55e", range: "0–39%", desc: "原创可信，手工设计特征明显" },
              { color: "#f59e0b", range: "40–69%", desc: "部分疑似，建议当面询问" },
              { color: "#ef4444", range: "70–100%", desc: "高度疑似AI生成，需进一步核查" },
            ].map((l) => (
              <div key={l.range} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 12, color: l.color, fontWeight: 700, fontFamily: "monospace" }}>{l.range} </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{l.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
