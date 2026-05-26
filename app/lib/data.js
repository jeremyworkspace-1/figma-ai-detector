export const SCAN_SIGNALS = [
  { id: "layer_naming",       label: "图层命名规律",   weight: 15 },
  { id: "component_structure",label: "组件结构复杂度", weight: 20 },
  { id: "color_consistency",  label: "色彩一致性",     weight: 10 },
  { id: "spacing_patterns",   label: "间距规律性",     weight: 15 },
  { id: "typography",         label: "字体层级设计",   weight: 15 },
  { id: "interaction_depth",  label: "交互逻辑深度",   weight: 25 },
];

export const SAMPLE_RESULTS = [
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
