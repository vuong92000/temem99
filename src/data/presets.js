import { Sparkles, Video, Shirt, Layers } from "lucide-react";
import { INITIAL_NODES, INITIAL_CONNECTIONS } from "./nodeTemplates.js";

/* Helpers keep the preset definitions short and readable. */
const n = (id, type, label, x, y, config = {}, inputs = [], outputs = []) => ({
  id,
  type,
  label,
  x,
  y,
  status: "idle",
  config,
  inputs,
  outputs,
});

const link = (prefix) => (i, fromNode, fromPort, toNode, toPort) => ({
  id: `${prefix}-c${i}`,
  fromNode,
  fromPort,
  toNode,
  toPort,
});

/* ------------------------------------------------------------------ *
 * 1. Luxury TVC (the original demo pipeline)
 * ------------------------------------------------------------------ */
const tvcNodes = INITIAL_NODES.map((node) => ({ ...node, status: "idle" }));
const tvcConnections = INITIAL_CONNECTIONS.map((c) => ({ ...c }));

/* ------------------------------------------------------------------ *
 * 2. TikTok / Shorts UGC review
 * ------------------------------------------------------------------ */
const l = link("tt");
const tiktokNodes = [
  n("tt-1", "image_node", "Ảnh sản phẩm thực tế", 60, 120, {
    imageType: "Sản phẩm",
    description: "Chai xịt khoáng 100ml, vỏ nhựa mờ pastel, nắp trắng",
  }, [], ["image_data"]),
  n("tt-2", "text_input", "Brief TikTok", 60, 430, {
    idea: "Review chân thực 30s: cảm nhận sau 7 ngày dùng xịt khoáng, cực nghiện vì nhẹ mặt",
    audience: "Gen Z, 18-25 tuổi, hay xem beauty review",
    tone: "Gần gũi",
  }, [], ["idea_text"]),
  n("tt-3", "image_analysis", "Phân tích packaging", 380, 120, {
    detailLevel: "Chi tiết",
    focus: ["Màu sắc", "Chất liệu", "Thương hiệu"],
  }, ["image_data"], ["analysis_result"]),
  n("tt-4", "style_node", "Style UGC", 380, 430, {
    style: "Minimalist Studio",
    lighting: "Natural Window Light",
  }, [], ["style_config"]),
  n("tt-5", "prompt_gen", "Prompt Pack", 700, 240, {
    detailLevel: "Chi tiết",
    language: "English",
    extraPrompt: "handheld phone camera look, authentic bedroom background, no over-retouch",
  }, ["analysis_result", "style_config"], ["main_prompt"]),
  n("tt-6", "script_gen", "Kịch bản TikTok", 1020, 240, {
    scriptType: "Viral TikTok",
    scenesCount: 5,
    duration: "30s",
    language: "Tiếng Việt",
    voice: "Nữ miền Bắc",
  }, ["main_prompt"], ["script_data"]),
  n("tt-7", "storyboard_gen", "Storyboard 9:16", 1340, 90, {
    ratio: "9:16",
    frames: 5,
    shotStyle: "Quay tay",
  }, ["script_data"], ["storyboard_data"]),
  n("tt-8", "video_prompt", "Motion Prompt", 1340, 430, {
    motionMode: "Dynamic Handheld",
    camera: "Pan Left to Right",
  }, ["script_data"], ["video_prompts"]),
  n("tt-9", "negative_prompt", "Chống lỗi AI", 1020, 580, {
    errorTypes: ["Lỗi mặt", "Thừa ngón tay", "Chuyển động giật", "Mờ nhòe"],
    extra: "",
  }, [], ["negative_prompt"]),
  n("tt-10", "export_node", "Export TikTok Pack", 1660, 250, { format: "Prompt Pack" }, [
    "storyboard_data",
    "video_prompts",
    "negative_prompt",
  ], []),
];
const tiktokConnections = [
  l(1, "tt-1", "image_data", "tt-3", "image_data"),
  l(2, "tt-3", "analysis_result", "tt-5", "analysis_result"),
  l(3, "tt-4", "style_config", "tt-5", "style_config"),
  l(4, "tt-5", "main_prompt", "tt-6", "main_prompt"),
  l(5, "tt-6", "script_data", "tt-7", "script_data"),
  l(6, "tt-6", "script_data", "tt-8", "script_data"),
  l(7, "tt-7", "storyboard_data", "tt-10", "storyboard_data"),
  l(8, "tt-8", "video_prompts", "tt-10", "video_prompts"),
  l(9, "tt-9", "negative_prompt", "tt-10", "negative_prompt"),
];

/* ------------------------------------------------------------------ *
 * 3. Fashion lookbook
 * ------------------------------------------------------------------ */
const k = link("lb");
const lookbookNodes = [
  n("lb-1", "character_info", "Model Profile", 60, 120, {
    name: "Người mẫu nữ Châu Á",
    age: "25-30",
    appearance: "Tóc đen dài, da nâu khoẻ, gò má cao",
    outfit: "Blazer be + quần tây ống rộng",
  }, [], ["character_data"]),
  n("lb-2", "image_node", "Bộ sưu tập Thu Đông", 60, 430, {
    imageType: "Trang phục",
    description: "Blazer be, váy lụa champagne, boots da lộn nâu",
  }, [], ["image_data"]),
  n("lb-3", "style_node", "Visual Lookbook", 380, 120, {
    style: "Korean Drama",
    lighting: "Golden Hour Backlight",
  }, [], ["style_config"]),
  n("lb-4", "image_analysis", "Phân tích chất liệu", 380, 430, {
    detailLevel: "Rất chi tiết",
    focus: ["Chất liệu", "Bố cục", "Ánh sáng"],
  }, ["image_data"], ["analysis_result"]),
  n("lb-5", "prompt_gen", "Prompt thời trang", 700, 240, {
    detailLevel: "Siêu chi tiết",
    language: "English",
    extraPrompt: "editorial fashion film, fabric movement, soft wind, muted earthy palette",
  }, ["analysis_result", "style_config"], ["main_prompt"]),
  n("lb-6", "script_gen", "Kịch bản Lookbook", 1020, 240, {
    scriptType: "Lookbook Thời trang",
    scenesCount: 6,
    duration: "30s",
    language: "Tiếng Việt",
    voice: "Nữ miền Nam",
  }, ["main_prompt"], ["script_data"]),
  n("lb-7", "camera_style", "Camera quay", 1020, 580, {
    camera: "Orbit Around",
    lens: "85mm Prime",
  }, [], ["camera_config"]),
  n("lb-8", "storyboard_gen", "Storyboard 4:5", 1340, 90, {
    ratio: "4:5",
    frames: 6,
    shotStyle: "Điện ảnh",
  }, ["script_data"], ["storyboard_data"]),
  n("lb-9", "video_prompt", "Motion Prompt", 1340, 430, {
    motionMode: "Cinematic Slow Motion",
    camera: "Orbit Around",
  }, ["script_data"], ["video_prompts"]),
  n("lb-10", "export_node", "Export Lookbook", 1660, 250, { format: "Markdown" }, [
    "storyboard_data",
    "video_prompts",
  ], []),
];
const lookbookConnections = [
  k(1, "lb-2", "image_data", "lb-4", "image_data"),
  k(2, "lb-4", "analysis_result", "lb-5", "analysis_result"),
  k(3, "lb-3", "style_config", "lb-5", "style_config"),
  k(4, "lb-5", "main_prompt", "lb-6", "main_prompt"),
  k(5, "lb-6", "script_data", "lb-8", "script_data"),
  k(6, "lb-6", "script_data", "lb-9", "script_data"),
  k(7, "lb-8", "storyboard_data", "lb-10", "storyboard_data"),
  k(8, "lb-9", "video_prompts", "lb-10", "video_prompts"),
];

export const WORKFLOW_PRESETS = [
  {
    id: "tvc",
    name: "TVC Serum Cao Cấp",
    tag: "9 node",
    desc: "Pipeline đầy đủ: ảnh gốc → phân tích → prompt → kịch bản → storyboard → motion → negative → export.",
    icon: Sparkles,
    nodes: tvcNodes,
    connections: tvcConnections,
  },
  {
    id: "tiktok",
    name: "TikTok Review UGC",
    tag: "10 node",
    desc: "Review sản phẩm 30s giọng tự nhiên, 5 cảnh quay tay, style tối giản, chống lỗi AI khi upscale.",
    icon: Video,
    nodes: tiktokNodes,
    connections: tiktokConnections,
  },
  {
    id: "lookbook",
    name: "Lookbook Thời Trang",
    tag: "10 node",
    desc: "6 cảnh 4:5, ánh sáng golden hour, camera orbit quanh model, nhịp chuyển động chậm.",
    icon: Shirt,
    nodes: lookbookNodes,
    connections: lookbookConnections,
  },
  {
    id: "blank",
    name: "Canvas trống",
    tag: "0 node",
    desc: "Bắt đầu từ đầu và tự kéo node từ thư viện bên trái.",
    icon: Layers,
    nodes: [],
    connections: [],
  },
];

export const DEFAULT_PRESET_ID = "tvc";
