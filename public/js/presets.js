'use strict';
/* ════════════════════════════════════════════════════════════════════
 * PhotoAI Studio — Preset dữ liệu & trình dựng prompt cho các công cụ.
 * Prompt dựng bằng tiếng Anh (model ảnh AI hiểu tốt nhất), giao diện
 * hiển thị tiếng Việt. Tất cả prompt chỉnh sửa đều có điều khoản GIỮ
 * NGUYÊN KHUÔN MẶT / DANH TÍNH để ảnh thẻ & phục hồi không bị "đổi mặt".
 * ════════════════════════════════════════════════════════════════════ */
window.PhotoAI = window.PhotoAI || {};

PhotoAI.PRESETS = {

  /* ── ẢNH THẺ: phông nền ─────────────────────────────────────────── */
  idBackgrounds: [
    { id: 'white',   vi: 'Trắng tinh',      hex: '#ffffff', en: 'clean pure-white seamless studio backdrop (#FFFFFF), evenly lit, edge to edge' },
    { id: 'blue',    vi: 'Xanh dương thẻ',  hex: '#2f6fed', en: 'solid Vietnamese ID-card blue studio backdrop (#2F6FED), evenly lit, edge to edge' },
    { id: 'graylt',  vi: 'Xám nhạt',        hex: '#c9ccd3', en: 'solid light-gray studio backdrop, evenly lit, edge to edge' },
    { id: 'graygr',  vi: 'Xám gradient',    hex: '#8e939e', en: 'elegant gray gradient studio backdrop (lighter in center, darker at edges), professional portrait studio look' },
    { id: 'office',  vi: 'Văn phòng mờ',    hex: '#7c8aa5', en: 'softly blurred modern office background, shallow depth of field, bright and clean' },
    { id: 'outdoor', vi: 'Ngoại cảnh mờ',   hex: '#6fa287', en: 'softly blurred green park background, creamy bokeh, daylight, shallow depth of field' },
    { id: 'custom',  vi: 'Màu tùy chọn…',   hex: null,      en: null }, // dùng bgColor
    { id: 'keep',    vi: 'Giữ nền gốc',      hex: null,      en: 'keep the original background but clean it up, even lighting, remove distractions' },
  ],

  /* ── ẢNH THẺ: trang phục (g: all = cả 2 giới) ───────────────────── */
  idOutfits: [
    { id: 'suit-black', vi: 'Vest đen + Sơ mi trắng + Cà vạt', g: 'all', en: 'black business suit jacket, crisp white dress shirt, dark formal tie, perfectly fitted' },
    { id: 'suit-navy',  vi: 'Vest xanh navy + Sơ mi trắng',    g: 'all', en: 'navy-blue business suit, white dress shirt, no tie, top button closed, perfectly fitted' },
    { id: 'shirt-white', vi: 'Sơ mi trắng lịch sự',            g: 'all', en: 'plain crisp white dress shirt with neat collar, no tie, formal look' },
    { id: 'suit-gray',  vi: 'Vest xám + Sơ mi xanh nhạt',      g: 'all', en: 'light-gray business suit, light-blue dress shirt, no tie, perfectly fitted' },
    { id: 'aodai',      vi: 'Áo dài truyền thống',             g: 'all', en: 'elegant traditional Vietnamese ao dai with mandarin collar, modest and refined' },
    { id: 'polo',       vi: 'Áo polo công sở',                g: 'all', en: 'smart neat polo shirt, office casual formal look' },
    { id: 'blouse',     vi: 'Áo blouse nữ thanh lịch',         g: 'f',   en: "elegant women's blouse with modest neckline, refined office look" },
    { id: 'vest-cream', vi: 'Vest kem nữ + Sơ mi trắng',       g: 'f',   en: "women's cream blazer, white blouse underneath, tailored fit" },
    { id: 'vest-male',  vi: 'Vest đen nam không cà vạt',       g: 'm',   en: "men's black suit jacket, white shirt with open collar, no tie, sharp formal look" },
    { id: 'custom',     vi: 'Tự mô tả trang phục…',           g: 'all', en: null },
  ],

  /* ── ẢNH THẺ: kiểu tóc ──────────────────────────────────────────── */
  idHair: [
    { id: 'keep',     vi: 'Giữ nguyên tóc',        g: 'all', en: null },
    { id: 'm-neat',   vi: 'Nam: Tóc ngắn gọn gàng', g: 'm',  en: "neat short men's haircut, clean and tidy, natural hairline" },
    { id: 'm-side',   vi: 'Nam: Rẽ ngôi lệch 7/3',  g: 'm',  en: "men's classic 7/3 side-part haircut, neat and professional" },
    { id: 'm-under',  vi: 'Nam: Undercut gọn',      g: 'm',  en: "tidy men's undercut, short faded sides, neat top" },
    { id: 'm-layer',  vi: 'Nam: Layer tự nhiên',    g: 'm',  en: "natural men's layered haircut, soft texture, professional look" },
    { id: 'f-long',   vi: 'Nữ: Tóc dài thẳng',      g: 'f',  en: "long straight women's hair over shoulders, neat and glossy" },
    { id: 'f-bob',    vi: 'Nữ: Tóc bob ngang vai',  g: 'f',  en: "elegant shoulder-length bob haircut, neat and professional" },
    { id: 'f-bun',    vi: 'Nữ: Búi thấp gọn',       g: 'f',  en: 'neat low bun hairstyle, tidy and formal, a few soft strands framing the face' },
    { id: 'f-wave',   vi: 'Nữ: Uốn nhẹ ngang vai',  g: 'f',  en: 'soft shoulder-length wavy hair, natural volume, professional look' },
    { id: 'custom',   vi: 'Tự mô tả kiểu tóc…',     g: 'all', en: null },
  ],

  /* ── ÁNH SÁNG: 10 preset chuyên nghiệp ──────────────────────────── */
  lighting: [
    { id: 'rembrandt', icon: '◐', name: 'Rembrandt', desc: 'Tam giác sáng trên má — kinh điển, chiều sâu, quyền lực.',
      en: 'classic Rembrandt portrait lighting: key light 45° creating a small triangle of light on the shadow-side cheek, dramatic but flattering, dark elegant background falloff' },
    { id: 'butterfly', icon: '🦋', name: 'Butterfly / Paramount', desc: 'Sáng đối xứng từ trên — glamour, tôn gò má, thời trang.',
      en: 'Paramount butterfly glamour lighting: soft key light directly above and in front, symmetrical illumination, subtle shadow under the nose, luminous skin, fashion-magazine look' },
    { id: 'loop', icon: '🌙', name: 'Loop', desc: 'Bóng mũi vòng cung — tự nhiên nhất, hợp mọi khuôn mặt.',
      en: 'soft loop lighting: key light slightly off-axis creating a small loop-shaped nose shadow on the cheek, natural dimensional portrait, gentle shadow transition' },
    { id: 'split', icon: '◑', name: 'Split', desc: 'Nửa sáng nửa tối — cá tính, nghệ thuật, bí ẩn.',
      en: 'dramatic split lighting: exactly half of the face lit and half in deep shadow, light at 90° to the side, bold artistic character portrait, dark background' },
    { id: 'golden', icon: '🌅', name: 'Golden Hour', desc: 'Nắng vàng giờ hoàng hôn — ấm áp, mơ màng, điện ảnh.',
      en: 'warm golden-hour sunlight: low sun glow wrapping the face with warm amber tones, soft lens warmth, dreamy cinematic outdoor feel' },
    { id: 'softbox', icon: '💡', name: 'Studio Softbox', desc: 'Mềm mại đều khắp mặt — sạch, chuyên nghiệp, ảnh profile.',
      en: 'large softbox studio lighting: big diffused key light plus soft fill, even flattering illumination, minimal shadows, clean bright professional headshot look' },
    { id: 'cinematic', icon: '🎬', name: 'Cinematic Teal & Orange', desc: 'Phim điện ảnh — da cam ấm trên nền teal lạnh.',
      en: 'cinematic teal-and-orange grade portrait: warm orange key light on the skin against cool teal-toned shadows and background, movie-poster atmosphere, gentle rim light' },
    { id: 'neon', icon: '🌃', name: 'Neon Cyberpunk', desc: 'Neon đô thị đêm — cá tính, hiện đại, nổi bật.',
      en: 'cyberpunk neon night portrait: magenta and cyan neon rim lights sculpting the face, dark urban night background with glowing bokeh signs, futuristic mood' },
    { id: 'lowkey', icon: '🎩', name: 'Low-key Noir', desc: 'Tối bí ẩn — tương phản mạnh, sang trọng, nam tính.',
      en: 'low-key noir portrait: mostly dark frame with one sculpted shaft of light across the face, deep blacks, strong contrast, mysterious elegant mood' },
    { id: 'highkey', icon: '☀️', name: 'High-key Trắng sáng', desc: 'Trắng sáng rực rỡ — tươi mới, beauty, quảng cáo.',
      en: 'bright high-key beauty lighting: airy white surroundings, soft shadowless illumination, glowing radiant skin, fresh commercial beauty look' },
  ],

  intensity: {
    subtle: 'Keep the effect SUBTLE and natural, gentle relighting only.',
    normal: 'Apply a balanced, clearly visible lighting transformation.',
    strong: 'Apply a STRONG dramatic lighting transformation with bold contrast.',
  },

  /* ── PHỤC HỒI: chế độ nền ───────────────────────────────────────── */
  restoreBg: [
    { id: 'keep',    vi: 'Giữ nguyên nền (chỉ làm sạch)', en: 'keep the original background and setting, only clean damage and rebalance tone' },
    { id: 'clean',   vi: 'Làm sạch + mờ nhẹ',            en: 'clean the background, gently defocus distractions, keep the same scene' },
    { id: 'studio',  vi: 'Vẽ lại nền studio',            en: 'rebuild a clean timeless neutral studio-style background that matches the era and lighting of the photo' },
    { id: 'outdoor', vi: 'Vẽ lại nền ngoại cảnh',        en: 'rebuild a natural outdoor background with soft daylight that matches the era and mood of the photo' },
  ],

  restoreStrength: {
    light: 'Apply GENTLE restoration: subtle cleanup, keep the vintage character and film grain feel.',
    moderate: 'Apply BALANCED restoration: clearly cleaner and sharper while staying natural and faithful.',
    strong: 'Apply STRONG full restoration: maximum cleanup, sharpness and detail recovery, like a fresh modern photograph.',
  },
};

/* ── Dựng prompt ẢNH THẺ ──────────────────────────────────────────── */
PhotoAI.buildIdPrompt = function (o) {
  const P = PhotoAI.PRESETS;
  const bg = P.idBackgrounds.find(b => b.id === o.bg) || P.idBackgrounds[0];
  const outfit = P.idOutfits.find(x => x.id === o.outfit);
  const hair = P.idHair.find(x => x.id === o.hair);

  const bgText = o.bg === 'custom'
    ? `solid studio backdrop in color ${o.bgColor || '#2f6fed'} (exact flat color), evenly lit, edge to edge`
    : bg.en;
  const outfitText = o.outfit === 'custom' ? (o.outfitCustom || 'formal business attire') : (outfit ? outfit.en : 'formal business attire');
  const genderText = o.gender === 'm' ? 'The subject is male. ' : o.gender === 'f' ? 'The subject is female. ' : '';

  const lines = [
    'Transform this photo into a professional ID / passport portrait photo.',
    'CRITICAL: keep the EXACT same face — same facial features, face shape, eyes, nose, mouth, skin tone and identity. Do not beautify or change who the person is.',
    genderText + 'The person faces the camera directly, neutral gentle expression, eyes open looking at camera, head-and-shoulders composition, head centered with comfortable headroom.',
    `Change the clothing to: ${outfitText}. Render realistic fabric, natural shoulders and collar, seamless blend at the neck.`,
  ];
  if (o.hair && o.hair !== 'keep') {
    const hairText = o.hair === 'custom' ? (o.hairCustom || 'neat professional hairstyle') : (hair ? hair.en : 'neat hairstyle');
    lines.push(`Change the hairstyle to: ${hairText}. Keep it realistic with natural hairline and matching hair color.`);
  } else {
    lines.push('Keep the original hairstyle, only tidy it slightly so it looks neat for an ID photo.');
  }
  lines.push(`Replace the background with: ${bgText}.`);
  lines.push('Even professional studio lighting on the face, no harsh shadows, sharp focus on the eyes, photorealistic, ultra clean, high resolution.');
  if (o.smooth) lines.push('Gently smooth the skin and remove temporary blemishes while keeping natural skin texture (no plastic look).');
  if (o.straighten) lines.push('Straighten the head pose to be perfectly front-facing and level.');
  lines.push('Vertical portrait orientation. The background must fill the entire frame edge to edge with no borders or watermarks.');
  if (o.extra) lines.push('Additional request: ' + o.extra);
  return lines.join('\n');
};

/* ── Dựng prompt ÁNH SÁNG ─────────────────────────────────────────── */
PhotoAI.buildLightPrompt = function (o) {
  const P = PhotoAI.PRESETS;
  const preset = P.lighting.find(l => l.id === o.preset);
  const lines = [
    'Relight this portrait photo with professional photography lighting.',
    'CRITICAL: keep the EXACT same person — same face, features, expression, pose, clothing and composition. Only change the LIGHTING and its mood/grade.',
  ];
  if (preset) lines.push('Lighting style: ' + preset.en + '.');
  if (o.custom) lines.push('Custom lighting direction: ' + o.custom + '.');
  lines.push(P.intensity[o.intensity] || P.intensity.normal);
  if (o.keepSkin) lines.push('Preserve a natural realistic skin tone (no oversaturation, no color cast on skin).');
  lines.push('Blend the new light naturally with realistic shadows, highlights and reflections matching the scene. Photorealistic, high detail, no watermark, no text.');
  if (o.extra) lines.push('Additional request: ' + o.extra);
  return lines.join('\n');
};

/* ── Dựng prompt PHỤC HỒI ẢNH CŨ ──────────────────────────────────── */
PhotoAI.buildRestorePrompt = function (o) {
  const P = PhotoAI.PRESETS;
  const bg = P.restoreBg.find(b => b.id === o.bgMode) || P.restoreBg[0];
  const lines = [
    'Professionally restore and enhance this old photograph.',
    'CRITICAL: preserve every person\'s identity EXACTLY — same faces, features, expressions and poses. Never change who anyone is or invent new faces.',
  ];
  if (o.colorize) lines.push('- Colorize: convert black-and-white/sepia to natural realistic full color (accurate skin tones, period-plausible clothing and environment colors).');
  if (o.repair) lines.push('- Repair damage: remove scratches, dust, spots, stains, tears, creases, mold marks and edge damage; reconstruct missing areas seamlessly.');
  if (o.face) lines.push('- Faces: enhance facial details — sharper eyes, natural skin texture, clear lips and eyebrows — while keeping each identity 100% intact.');
  if (o.hair) lines.push('- Hair: redraw and refine hair with natural strands, volume and shine consistent with the original hairstyle.');
  if (o.denoise) lines.push('- Clean & balance: reduce noise and grain, fix fading/yellowing, correct exposure and contrast, balanced white point.');
  lines.push('- Background: ' + bg.en + '.');
  if (o.upscaleNote) lines.push('- Deliver maximum sharpness and fine detail, high resolution finish.');
  lines.push(P.restoreStrength[o.strength] || P.restoreStrength.moderate);
  lines.push('Final result: one clean photorealistic photograph, natural colors, no watermark, no added text, no frame.');
  if (o.extra) lines.push('Additional request: ' + o.extra);
  return lines.join('\n');
};

/* ── Prompt cho AI "gợi ý ánh sáng" (model chữ) ───────────────────── */
PhotoAI.SUGGEST_LIGHT_PROMPT =
  'You are a professional portrait-photography consultant. Look at this portrait and pick the BEST lighting style for it ' +
  'from this exact ID list: rembrandt, butterfly, loop, split, golden, softbox, cinematic, neon, lowkey, highkey.\n' +
  'Consider: face shape, skin tone, gender, age, mood, current lighting flaws.\n' +
  'Reply with ONLY a compact JSON object, no markdown, no explanation outside JSON: ' +
  '{"preset":"<id>","intensity":"subtle|normal|strong","reason":"<one short sentence in Vietnamese>"}';
