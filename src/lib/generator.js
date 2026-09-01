/**
 * Mock "AI engine" that turns the graph configuration into a full script,
 * storyboard and prompt pack. Everything is derived from the node configs
 * currently on the canvas, so editing a node visibly changes the output.
 */

const STYLE_EN = {
  "Luxury Commercial": "luxury commercial photography, premium product lighting, glossy reflections",
  "Cinematic Movie": "cinematic film still, anamorphic lens, shallow depth of field, film grain",
  "Korean Drama": "korean drama visual, soft pastel color grade, dreamy bokeh",
  "3D Animation": "3D Unreal Engine 5 render, octane render, volumetric light, ultra clean geometry",
  "Minimalist Studio": "minimalist studio shot, seamless backdrop, clean negative space",
};

const CAMERA_EN = {
  "Slow Push-in Dolly": "slow dolly push in",
  "Orbit Around": "smooth 180 degree orbit around subject",
  "Pan Left to Right": "slow cinematic pan left to right",
  "Crane Up": "crane up reveal",
  "Static Zoom Out": "static camera slow zoom out",
};

const MOTION_EN = {
  "Product Commercial Motion": "commercial product motion, controlled and elegant",
  "Cinematic Slow Motion": "120fps cinematic slow motion",
  "Dynamic Handheld": "dynamic handheld energy",
  "Static Lockdown": "static locked-off camera",
};

const RATIO_LABEL = {
  "9:16": "9:16 (TikTok / Reels / Shorts)",
  "16:9": "16:9 (YouTube / TVC)",
  "1:1": "1:1 (Feed / Instagram)",
  "4:5": "4:5 (Instagram Portrait)",
};

const ERROR_TOKENS = {
  "Lỗi mặt": "deformed face, asymmetric eyes, bad anatomy",
  "Lỗi sản phẩm": "distorted product shape, warped packaging",
  "Nhiễu hạt": "noisy, grainy artifacts",
  "Biến dạng logo": "distorted brand logo, unreadable text",
  "Thừa ngón tay": "extra fingers, extra limbs",
  "Chuyển động giật": "jittery motion, frame flicker, morphing",
  "Mờ nhòe": "blurry, out of focus",
  "Ánh sáng cháy": "overexposed, blown highlights",
};

/* Scene library — each scene carries visuals + dialogue per script style. */
const SCENE_LIBRARY = [
  {
    shot: "Macro / Cận cảnh",
    visual: "Cận cảnh giọt serum trong suốt đọng trên đầu nắp mạ vàng 18K. Ánh sáng vàng dịu phản chiếu lung linh.",
    action: "Giọt serum từ từ rơi xuống bề mặt nước lóng lánh, tạo hiệu ứng gợn sóng phát sáng nhẹ.",
    dialogue: {
      "Quảng cáo TVC": "Mỗi giọt serum — chìa khóa đánh thức làn da thanh xuân.",
      "Viral TikTok": "Khoan đã... nhìn giọt này rơi mà xem!",
      "Review sản phẩm": "Mình thử lắc nhẹ, chất serum đặc nhưng không hề bết rít.",
      "Lookbook Thời trang": "Ánh sáng chạm vào chất liệu — và mọi chi tiết bắt đầu kể chuyện.",
      "Kể chuyện Cảm xúc": "Có những thay đổi rất nhỏ, nhưng đủ làm cả một ngày sáng lên.",
    },
    imagePrompt:
      "macro shot of a clear glowing serum drop resting on a golden cap, translucent liquid surface, golden sunlight flare",
    videoPrompt: "slow motion drop falling, subtle ripple, soft volumetric light, cinematic depth of field",
  },
  {
    shot: "Medium / Chân dung",
    visual: "Người mẫu nữ Châu Á với làn da căng bóng mịn màng, mỉm cười nhẹ nhàng trước gương.",
    action: "Người mẫu đưa đầu ngón tay chạm nhẹ lên má, dưỡng chất thẩm thấu tức thì tạo lớp nền bóng khỏe.",
    dialogue: {
      "Quảng cáo TVC": "Công thức độc quyền từ thảo dược tự nhiên, thẩm thấu tức thì sau 3 giây.",
      "Viral TikTok": "3 giây thôi — nhìn lớp nền căng bóng này nè!",
      "Review sản phẩm": "Thấm cực nhanh, không để lại màng trắng hay nhờn dính.",
      "Lookbook Thời trang": "Làn da cũng là một chất liệu thời trang — và nó toả sáng theo cách riêng.",
      "Kể chuyện Cảm xúc": "Từ hôm chăm lại làn da, mình tự tin nhìn thẳng vào gương hơn.",
    },
    imagePrompt:
      "asian female model with glass skin texture, gentle smile, elegant robe, ultra clean beauty retouch, vogue cover style",
    videoPrompt: "gentle pan across the face, fingertips touching cheek, natural skin motion, soft breeze",
  },
  {
    shot: "3D / Mô phỏng khoa học",
    visual: "Góc quay 3D mô phỏng phân tử dưỡng chất thấm sâu qua từng tầng biểu bì da.",
    action: "Các phân tử phát sáng màu vàng kim kết nối với nhau, khôi phục cấu trúc da đang tổn thương.",
    dialogue: {
      "Quảng cáo TVC": "Tái tạo hàng rào bảo vệ da, cấp ẩm chuyên sâu suốt 24 giờ.",
      "Viral TikTok": "Đây là lý do da bạn được phục hồi sau một đêm.",
      "Review sản phẩm": "Thành phần có peptide và HA — đúng những gì da thiếu nước cần.",
      "Lookbook Thời trang": "Vẻ đẹp bền vững luôn bắt đầu từ lớp nền khoẻ mạnh.",
      "Kể chuyện Cảm xúc": "Da cũng cần được sửa lành, giống như những cảm xúc trong ta.",
    },
    imagePrompt:
      "3D scientific visualization of golden glowing molecules penetrating skin layers, clean blue ambience, sleek medical aesthetic",
    videoPrompt: "3D camera fly through epidermal layers, animated particle network, smooth depth transition",
  },
  {
    shot: "Full / Ứng dụng thực tế",
    visual: "Cảnh tay cầm chai serum nhỏ giọt lên lòng bàn tay, ánh sáng ban mai tràn qua khung cửa sổ.",
    action: "Làn chất lỏng chảy chậm, sau đó hai bàn tay xoa nhẹ và áp lên má theo chuyển động tròn.",
    dialogue: {
      "Quảng cáo TVC": "Một giọt mỗi sáng — làn da ẩm mượt suốt cả ngày dài.",
      "Viral TikTok": "Cứu tinh cho da khô mỗi sáng thức dậy, nghiêm túc đấy!",
      "Review sản phẩm": "Mình dùng 2 giọt cho cả mặt và cổ, tiết kiệm mà hiệu quả.",
      "Lookbook Thời trang": "Quy trình skincare tối giản — nhưng hiệu ứng thì rất xa xỉ.",
      "Kể chuyện Cảm xúc": "Mỗi sáng, mình dành 10 giây để chăm cho chính mình.",
    },
    imagePrompt:
      "hands holding a glass serum dropper above a palm, morning window light, warm skin tones, lifestyle beauty photography",
    videoPrompt: "top-down slow tilt down, droplet release, hands massaging in circular motion, warm flares",
  },
  {
    shot: "Split / So sánh",
    visual: "Khung hình chia đôi: một bên làn da khô ráp xỉn màu, một bên căng mướt phản chiếu ánh sáng.",
    action: "Đường chia chuyển động mượt mà từ trái sang phải, làm nổi bật sự khác biệt rõ rệt.",
    dialogue: {
      "Quảng cáo TVC": "Trước và sau 7 ngày — sự khác biệt bạn có thể nhìn thấy.",
      "Viral TikTok": "Trái vs phải: bạn đoán bên nào dùng serum?",
      "Review sản phẩm": "Sau 1 tuần, vùng da khô căng rõ rệt, lớp nền bám tốt hơn hẳn.",
      "Lookbook Thời trang": "Chạm vào bề mặt hoàn hảo — đó là tiêu chuẩn mới.",
      "Kể chuyện Cảm xúc": "Có những thay đổi, chỉ cần đủ kiên nhẫn để nhìn thấy.",
    },
    imagePrompt:
      "split frame comparison of rough dry skin versus hydrated glowing skin, dramatic side lighting, high detail skin texture",
    videoPrompt: "smooth wipe transition left to right revealing the after side, subtle light sweep",
  },
  {
    shot: "Lifestyle / Đời thường",
    visual: "Nhân vật bước ra ban công ngập nắng, mái tóc bay nhẹ, làn da bắt sáng tự nhiên.",
    action: "Cô hít một hơi sâu, mỉm cười và quay mặt về phía ánh nắng, khung hình rực sáng.",
    dialogue: {
      "Quảng cáo TVC": "Tỏa sáng theo cách rất riêng, mỗi ngày đều mới.",
      "Viral TikTok": "Rạng rỡ tự nhiên thế này, không cần filter luôn!",
      "Review sản phẩm": "Điểm mình thích nhất: da bóng khoẻ chứ không bóng dầu.",
      "Lookbook Thời trang": "Phong cách là khi bạn bước ra ánh sáng mà không cần che giấu gì.",
      "Kể chuyện Cảm xúc": "Hôm nay, mình chọn rạng rỡ — dù chỉ là một chút thôi.",
    },
    imagePrompt:
      "young woman on a sunlit balcony, hair blowing softly, natural glowing skin, lifestyle fashion editorial, golden hour",
    videoPrompt: "slow tracking shot following the subject, hair and fabric motion, sun flare bloom",
  },
  {
    shot: "Hero / Packshot",
    visual: "Sản phẩm đặt ở trung tâm trên bệ đá cẩm thạch trắng, xung quanh là cánh hoa nhài tươi.",
    action: "Hạt bụi vàng lơ lửng trong không khí, logo thương hiệu hiện ra mềm mại cùng thông điệp.",
    dialogue: {
      "Quảng cáo TVC": "PureGlow — tỏa sáng khí chất thanh xuân của riêng bạn.",
      "Viral TikTok": "Chai này đẹp đến mức để trang trí cũng đáng!",
      "Review sản phẩm": "Thiết kế thuỷ tinh mờ, nắp vàng — cầm rất chắc tay.",
      "Lookbook Thời trang": "Một vật phẩm đủ đẹp để trở thành điểm nhấn trên bàn trang điểm.",
      "Kể chuyện Cảm xúc": "Một món quà nhỏ, nhưng đủ để ai đó mỉm cười.",
    },
    imagePrompt:
      "luxury product photography, frosted glass serum bottle with gold cap on white marble pedestal, jasmine petals, soft backlight, copy space",
    videoPrompt: "static camera slow zoom out revealing the full setup, floating gold dust, elegant fade-in CTA text",
  },
  {
    shot: "CTA / Kết thúc",
    visual: "Khung hình tối giản với sản phẩm lệch phải, không gian trống bên trái cho tiêu đề kêu gọi hành động.",
    action: "Dòng chữ thương hiệu và CTA xuất hiện theo hiệu ứng đánh máy, sản phẩm xoay nhẹ 5 độ.",
    dialogue: {
      "Quảng cáo TVC": "Đặt hàng ngay hôm nay — ưu đãi 20% cho 500 khách đầu tiên.",
      "Viral TikTok": "Link ở phần bình luận, săn ngay kẻo lỡ nhé!",
      "Review sản phẩm": "Mình để link chính hãng ở phần mô tả, mọi người tham khảo nha.",
      "Lookbook Thời trang": "Bộ sưu tập mới đã có mặt tại cửa hàng và online.",
      "Kể chuyện Cảm xúc": "Bắt đầu từ hôm nay, bạn nhé.",
    },
    imagePrompt:
      "minimal product on dark gradient background with generous copy space, subtle rim light, premium advertising layout",
    videoPrompt: "slow 5 degree product rotation, text typing reveal animation, soft gradient fade",
  },
];

const pickByType = (nodes, type) => nodes.find((n) => n.type === type);
const cfg = (node, key, fallback = "") => (node?.config?.[key] ?? fallback);

function parseSeconds(value, fallback = 15) {
  const match = String(value ?? "").match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : fallback;
}

function pickDialogue(scene, scriptType) {
  return scene.dialogue[scriptType] || scene.dialogue["Quảng cáo TVC"];
}

/**
 * @param {Array} nodes current graph nodes
 * @param {Array} connections current graph connections
 * @returns {Object} master script result rendered by the bottom panel
 */
export function generateWorkflowResult(nodes, connections) {
  const imageNode = pickByType(nodes, "image_node");
  const textNode = pickByType(nodes, "text_input");
  const characterNode = pickByType(nodes, "character_info");
  const styleNode = pickByType(nodes, "style_node");
  const scriptNode = pickByType(nodes, "script_gen");
  const storyboardNode = pickByType(nodes, "storyboard_gen");
  const videoNode = pickByType(nodes, "video_prompt");
  const negativeNode = pickByType(nodes, "negative_prompt");
  const ratioNode = pickByType(nodes, "aspect_ratio");
  const durationNode = pickByType(nodes, "duration_node");
  const voiceNode = pickByType(nodes, "voice_node");
  const cameraNode = pickByType(nodes, "camera_style");
  const motionNode = pickByType(nodes, "motion_style");
  const promptNode = pickByType(nodes, "prompt_gen");

  const scriptType = cfg(scriptNode, "scriptType", "Quảng cáo TVC");
  const sceneCount = Math.min(12, Math.max(1, Number(cfg(scriptNode, "scenesCount", 4)) || 4));
  const totalSeconds = parseSeconds(cfg(durationNode, "total", cfg(scriptNode, "duration", "15s")), 15);
  const perScene = Math.round((totalSeconds / sceneCount) * 10) / 10;

  const style = cfg(styleNode, "style", "Luxury Commercial");
  const lighting = cfg(styleNode, "lighting", "Studio Soft Light");
  const camera = cfg(cameraNode, "camera", cfg(videoNode, "camera", "Slow Push-in Dolly"));
  const motionMode = cfg(videoNode, "motionMode", "Product Commercial Motion");
  const ratio = cfg(ratioNode, "ratio", cfg(storyboardNode, "ratio", "9:16"));
  const voice = cfg(voiceNode, "voice", cfg(scriptNode, "voice", "Nữ miền Nam"));
  const language = cfg(voiceNode, "language", cfg(scriptNode, "language", "Tiếng Việt"));
  const detailLevel = cfg(promptNode, "detailLevel", "Siêu chi tiết");
  const extraPrompt = cfg(promptNode, "extraPrompt", "");
  const subject = cfg(imageNode, "description", "") || cfg(characterNode, "name", "Sản phẩm của bạn");

  const styleEn = STYLE_EN[style] || STYLE_EN["Luxury Commercial"];
  const cameraEn = CAMERA_EN[camera] || "slow cinematic camera move";
  const motionEn = MOTION_EN[motionMode] || "smooth controlled motion";

  const detailSuffix =
    detailLevel === "Ngắn gọn"
      ? "clean composition"
      : detailLevel === "Siêu chi tiết"
      ? "ultra detailed, 8k resolution, intricate micro detail"
      : "highly detailed, 4k resolution";

  const scenes = Array.from({ length: sceneCount }, (_, i) => {
    const base = SCENE_LIBRARY[i % SCENE_LIBRARY.length];
    const isLast = i === sceneCount - 1;
    const imagePrompt = [
      base.imagePrompt,
      styleEn,
      `${lighting} lighting`,
      extraPrompt,
      detailSuffix,
    ]
      .filter(Boolean)
      .join(", ");

    const videoPrompt = [base.videoPrompt, `${cameraEn}, ${motionEn}`, ratio === "9:16" ? "vertical 9:16 framing" : ""]
      .filter(Boolean)
      .join(", ");

    return {
      sceneNumber: i + 1,
      shotType: base.shot,
      ratio,
      seconds: perScene,
      visual: base.visual,
      action: base.action,
      dialogue: isLast && sceneCount > 2 ? SCENE_LIBRARY[7].dialogue[scriptType] || pickDialogue(base, scriptType) : pickDialogue(base, scriptType),
      camera,
      imagePrompt,
      videoPrompt,
    };
  });

  const tokens = (negativeNode?.config?.errorTypes || ["Lỗi mặt", "Nhiễu hạt"]).map((t) => ERROR_TOKENS[t]).filter(Boolean);
  const negativePrompt = [
    "(worst quality, low quality:1.4)",
    ...tokens,
    cfg(negativeNode, "extra", ""),
  ]
    .filter(Boolean)
    .join(", ");

  const title = textNode?.config?.idea
    ? String(textNode.config.idea).slice(0, 90)
    : `${scriptType} — ${String(subject).slice(0, 70)}`;

  return {
    title,
    concept:
      cfg(textNode, "idea", "") ||
      `Tạo cảm giác ${String(scriptType).toLowerCase()} với ${String(subject)}, giữ ánh sáng ${lighting.toLowerCase()} xuyên suốt các cảnh.`,
    audience: cfg(textNode, "audience", ""),
    tone: cfg(textNode, "tone", ""),
    aspectRatio: RATIO_LABEL[ratio] || ratio,
    duration: `${totalSeconds} Giây`,
    style: `${style}, ${lighting}`,
    camera,
    motion: `${motionMode} (${cfg(motionNode, "motion", "Chậm rãi, mượt mà")})`,
    voice: `${voice} · ${language}`,
    language,
    subject,
    scenes,
    negativePrompt,
    consistencyRules: [
      `Giữ nguyên chủ thể: ${String(subject)}.`,
      `Thống nhất phong cách "${style}" và ánh sáng "${lighting}" ở mọi scene.`,
      `Tỷ lệ khung hình ${ratio} cho toàn bộ storyboard.`,
      cameraNode || videoNode ? `Chuyển động máy chính: ${cameraEn}.` : "Giữ máy ổn định, hạn chế rung lắc.",
    ]
      .filter(Boolean)
      .join(" "),
    exportFormat: cfg(pickByType(nodes, "export_node"), "format", "All-in-One"),
    meta: {
      nodes: nodes.length,
      connections: connections.length,
      generatedAt: new Date().toLocaleString(),
      engine: "Workflow Engine · mock mode",
    },
  };
}

/* ------------------------------- Exporters ------------------------------- */

const sceneBlock = (s) =>
  [
    `### SCENE ${s.sceneNumber} — ${s.shotType} · ${s.seconds}s`,
    `**Visual:** ${s.visual}`,
    `**Hành động:** ${s.action}`,
    `**Lời thoại (VO):** ${s.dialogue}`,
    `**Image Prompt:** ${s.imagePrompt}`,
    `**Video Prompt:** ${s.videoPrompt}`,
  ].join("\n\n");

export function toMarkdown(result) {
  return [
    `# ${result.title}`,
    "",
    `> ${result.concept}`,
    "",
    `| Thông tin | Giá trị |`,
    `| --- | --- |`,
    `| Tỷ lệ | ${result.aspectRatio} |`,
    `| Thời lượng | ${result.duration} |`,
    `| Phong cách | ${result.style} |`,
    `| Giọng đọc | ${result.voice} |`,
    `| Camera | ${result.camera} |`,
    "",
    "## Phân cảnh",
    "",
    ...result.scenes.map(sceneBlock),
    "",
    "## Negative Prompt",
    "```",
    result.negativePrompt,
    "```",
    "",
    "## Quy tắc nhất quán",
    result.consistencyRules,
    "",
    `_Được tạo bởi AI Video Workflow Builder · ${result.meta.generatedAt}_`,
  ].join("\n");
}

export function toPlainText(result) {
  return [
    result.title,
    result.concept,
    "",
    `Tỷ lệ: ${result.aspectRatio} | Thời lượng: ${result.duration} | Style: ${result.style}`,
    "",
    ...result.scenes.map(
      (s) =>
        `SCENE ${s.sceneNumber} (${s.seconds}s)\nVisual: ${s.visual}\nAction: ${s.action}\nVO: ${s.dialogue}\nImage Prompt: ${s.imagePrompt}\nVideo Prompt: ${s.videoPrompt}\n`
    ),
    `Negative prompt: ${result.negativePrompt}`,
    `Consistency: ${result.consistencyRules}`,
  ].join("\n");
}

export function toPromptPack(result) {
  return result.scenes
    .map((s) => `# Scene ${s.sceneNumber}\nIMAGE: ${s.imagePrompt}\nVIDEO: ${s.videoPrompt}\nNEGATIVE: ${result.negativePrompt}`)
    .join("\n\n");
}
