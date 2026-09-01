/**
 * generators.js
 * ---------------------------------------------------------------------------
 * "AI" content engine mô phỏng. Toàn bộ dữ liệu được sinh ra bằng template
 * thông minh dựa trên context của workflow (ý tưởng, sản phẩm, nhân vật,
 * phong cách, tỉ lệ, thời lượng, ngôn ngữ...).
 *
 * Tất cả hàm đều thuần (pure) => rất dễ thay bằng call API thật sau này:
 * chỉ cần thay thân hàm bằng `await fetch(...)`.
 */

/* ------------------------------------------------------------------ utils */

export const pick = (arr, seed = 0) => arr[Math.abs(seed) % arr.length]

export const hashString = (str = '') => {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

const clean = (s) => (s || '').toString().trim()

const titleCase = (s) =>
  clean(s)
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

/** Rút gọn một mô tả dài thành nhãn ngắn dùng cho tiêu đề / lời thoại. */
const shorten = (s, maxWords = 8) => {
  const first = clean(s).split(/[,.;\n]/)[0]
  const words = first.split(/\s+/).filter(Boolean)
  const cut = words.slice(0, maxWords).join(' ')
  return cut.replace(/[.,;:]+$/, '')
}

export const durationToSeconds = (d) => {
  const n = parseInt(String(d).replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 15
}

/* ------------------------------------------------------------ style banks */

export const STYLE_PROMPTS = {
  Cinematic: 'cinematic film look, shallow depth of field, anamorphic lens flare, filmic color grading, 35mm',
  Photorealistic: 'photorealistic, ultra detailed skin texture, natural lighting, 8k, DSLR 85mm f1.8',
  'Korean Drama': 'korean drama aesthetic, soft pastel grade, warm bokeh, dreamy backlight, clean skin retouch',
  'Luxury Commercial': 'luxury commercial aesthetic, glossy reflections, dramatic key light, deep blacks, premium gold accents',
  'TikTok Viral': 'vertical social video look, punchy contrast, vivid saturated colors, energetic framing, trendy',
  'Studio Product Ad': 'studio product photography, seamless backdrop, softbox lighting, crisp reflections, commercial grade',
  'Fashion Editorial': 'high fashion editorial, magazine cover styling, bold shadows, couture posing, Vogue style',
  Lifestyle: 'authentic lifestyle photography, candid moment, natural window light, warm tones',
  Minimalist: 'minimalist composition, negative space, muted palette, clean geometry, soft gradient background',
  'Street Fashion': 'street fashion photography, urban environment, neon reflections, handheld energy',
  'Cute Cartoon': 'cute cartoon illustration, soft rounded shapes, pastel palette, 2d vector style',
  '3D Animation': 'stylized 3d animation, pixar-like rendering, subsurface scattering, global illumination',
  'Stickman Explainer': 'minimal stickman explainer animation, whiteboard aesthetic, bold outlines, flat colors',
  UGC: 'user generated content look, phone camera authenticity, slightly imperfect framing, real lighting',
  Documentary: 'documentary cinematography, observational framing, natural grain, muted realistic grade',
  'High-end TVC': 'high-end tvc production value, macro detail inserts, motion control camera, immaculate lighting',
}

export const CAMERA_PROMPTS = {
  'Static Camera': 'locked-off tripod shot, zero camera movement, stable frame',
  Handheld: 'handheld camera, subtle organic shake, documentary energy',
  'Slow Push-in': 'slow dolly push-in toward subject, gradual scale change',
  'Cinematic Dolly': 'smooth cinematic dolly move on a track, parallax reveal',
  'Close-up': 'close-up framing on the subject, intimate detail, 85mm compression',
  'Medium Shot': 'medium shot from waist up, balanced headroom',
  'Wide Shot': 'wide establishing shot, full environment context',
  'Selfie Style': 'selfie POV framing, arm-length distance, eye contact with lens',
  'Mirror Selfie': 'mirror selfie framing, phone visible, full outfit reflection',
  'Product Macro Shot': 'macro lens detail shot of the product, razor-sharp texture, shallow focus',
}

export const MOTION_PROMPTS = {
  'Natural Movement': 'natural realistic movement, believable weight and timing',
  'Slow Motion': 'slow motion 120fps feel, fabric and hair floating',
  'Fast-forward Time-lapse': 'time-lapse acceleration, smooth speed ramp',
  'Fashion Pose Change': 'sequential fashion pose changes with clean transitions',
  'Product Rotation': 'controlled 360 degree product rotation, constant speed',
  Transformation: 'seamless transformation morph between two states',
  'Before / After': 'clean before and after reveal with match-cut transition',
  'Smooth Cinematic Motion': 'smooth cinematic motion, eased acceleration, steady framing',
}

export const LIGHTING_BANK = [
  'soft key light from 45 degrees with gentle fill, natural falloff',
  'dramatic rim lighting separating subject from background',
  'golden hour sunlight, warm long shadows',
  'clean studio three-point lighting, controlled specular highlights',
  'moody low-key lighting with a single practical source',
  'bright airy high-key lighting, minimal shadows',
]

/* ------------------------------------------------- script structure banks */

const HOOK_BANK = {
  'Quảng cáo TVC': [
    'Mỗi khung hình là một lời hứa về chất lượng.',
    'Điều khiến bạn dừng lại không phải giá — mà là cảm giác.',
  ],
  'Viral TikTok': [
    'Khoan đã… bạn đã thử cách này chưa?',
    '3 giây đầu tiên sẽ khiến bạn xem hết video này.',
  ],
  'Review sản phẩm': [
    'Mình đã dùng thử 7 ngày và đây là sự thật.',
    'Có đáng tiền không? Xem hết 15 giây là biết.',
  ],
  'Thời trang Lookbook': [
    'Một set đồ, ba cách phối, vô số ánh nhìn.',
    'Khi phong cách lên tiếng, bạn không cần nói gì cả.',
  ],
  'Kể chuyện cảm xúc': [
    'Có những buổi sáng, chỉ cần một điều nhỏ cũng đủ đổi cả ngày.',
    'Câu chuyện bắt đầu từ một khoảnh khắc rất đời thường.',
  ],
  'Hài hước': [
    'Cảnh báo: xem xong bạn sẽ muốn thử ngay.',
    'Tình huống này ai cũng từng gặp ít nhất một lần.',
  ],
  'Sang trọng cao cấp': [
    'Đẳng cấp không ồn ào. Nó chỉ đơn giản là hiện diện.',
    'Sự tinh tế nằm ở những chi tiết ít người để ý.',
  ],
  'Before / After': [
    'Trước và sau — khác biệt rõ đến mức không cần lời giải thích.',
    'Chỉ một thay đổi nhỏ, kết quả khác hoàn toàn.',
  ],
  'Hướng dẫn sử dụng': [
    'Chỉ 3 bước, ai cũng làm được ngay lần đầu.',
    'Đừng dùng sai nữa — đây là cách đúng.',
  ],
  'Bán hàng chuyển đổi cao': [
    'Ưu đãi này sẽ không kéo dài lâu, và đây là lý do.',
    'Nếu bạn đang phân vân, 15 giây tới sẽ giúp bạn quyết định.',
  ],
  'Drama ngắn': [
    'Cô ấy không ngờ mọi chuyện lại rẽ hướng như vậy.',
    'Một tin nhắn. Một quyết định. Tất cả thay đổi.',
  ],
  'UGC quảng cáo': [
    'Thật lòng nhé, mình không nghĩ nó hiệu quả đến vậy.',
    'Mình quay video này chỉ vì quá thích, không ai trả tiền cả.',
  ],
}

const CTA_BANK = {
  'Quảng cáo TVC': 'Khám phá bộ sưu tập ngay hôm nay.',
  'Viral TikTok': 'Lưu lại ngay kẻo trôi mất nhé!',
  'Review sản phẩm': 'Link sản phẩm nằm ngay dưới video.',
  'Thời trang Lookbook': 'Chọn phong cách của riêng bạn ngay bây giờ.',
  'Kể chuyện cảm xúc': 'Hãy để mỗi ngày của bạn trọn vẹn hơn.',
  'Hài hước': 'Tag ngay đứa bạn cần xem video này!',
  'Sang trọng cao cấp': 'Trải nghiệm đẳng cấp — đặt lịch tư vấn riêng.',
  'Before / After': 'Bắt đầu thay đổi của bạn từ hôm nay.',
  'Hướng dẫn sử dụng': 'Lưu lại để dùng khi cần nhé.',
  'Bán hàng chuyển đổi cao': 'Đặt hàng ngay hôm nay để nhận ưu đãi giới hạn.',
  'Drama ngắn': 'Phần 2 sẽ lên sóng ngày mai — theo dõi ngay.',
  'UGC quảng cáo': 'Thử đi rồi kể mình nghe cảm nhận của bạn nhé!',
}

const SCENE_BEATS = {
  default: [
    { name: 'Hook mở đầu', purpose: 'Chặn ngón tay lướt, tạo tò mò tức thì' },
    { name: 'Giới thiệu chủ thể', purpose: 'Cho khán giả thấy nhân vật / sản phẩm chính' },
    { name: 'Điểm nhấn giá trị', purpose: 'Nêu bật lợi ích khác biệt nhất' },
    { name: 'Chứng minh', purpose: 'Cận cảnh chi tiết, chứng minh chất lượng' },
    { name: 'Cảm xúc', purpose: 'Tạo kết nối cảm xúc với khán giả' },
    { name: 'Bối cảnh sử dụng', purpose: 'Đặt sản phẩm vào đời sống thật' },
    { name: 'Đối chiếu', purpose: 'So sánh trước / sau hoặc với giải pháp cũ' },
    { name: 'Khoảnh khắc wow', purpose: 'Cú twist thị giác gây ấn tượng mạnh' },
    { name: 'Tổng kết', purpose: 'Chốt lại thông điệp chính' },
    { name: 'CTA', purpose: 'Kêu gọi hành động rõ ràng' },
  ],
  'Before / After': [
    { name: 'Tình trạng ban đầu', purpose: 'Cho thấy vấn đề đang tồn tại' },
    { name: 'Giải pháp xuất hiện', purpose: 'Sản phẩm bước vào khung hình' },
    { name: 'Quá trình', purpose: 'Diễn tiến của sự thay đổi' },
    { name: 'Khoảnh khắc lột xác', purpose: 'Match-cut trước / sau' },
    { name: 'Phản ứng', purpose: 'Biểu cảm hài lòng của nhân vật' },
    { name: 'Kết quả cuối', purpose: 'Trình bày kết quả trọn vẹn' },
    { name: 'So sánh split-screen', purpose: 'Đặt hai trạng thái cạnh nhau' },
    { name: 'CTA', purpose: 'Kêu gọi hành động' },
  ],
  'Hướng dẫn sử dụng': [
    { name: 'Vấn đề', purpose: 'Nêu lỗi thường gặp' },
    { name: 'Chuẩn bị', purpose: 'Giới thiệu dụng cụ / sản phẩm' },
    { name: 'Bước 1', purpose: 'Thao tác đầu tiên rõ ràng' },
    { name: 'Bước 2', purpose: 'Thao tác tiếp theo' },
    { name: 'Bước 3', purpose: 'Hoàn thiện' },
    { name: 'Kết quả', purpose: 'Thành phẩm cuối cùng' },
    { name: 'Mẹo nhỏ', purpose: 'Tip nâng cao trải nghiệm' },
    { name: 'CTA', purpose: 'Kêu gọi lưu / mua' },
  ],
}

const CAMERA_SEQUENCE = [
  'Wide establishing shot',
  'Medium shot',
  'Close-up',
  'Slow push-in',
  'Macro detail insert',
  'Over-the-shoulder',
  'Low angle hero shot',
  'Top-down flat lay',
  'Tracking shot',
  'Static locked frame',
]

const POSE_BANK = [
  'đứng thẳng tự tin, vai mở, ánh mắt nhìn thẳng ống kính',
  'nghiêng người 3/4, tay chạm nhẹ vào sản phẩm',
  'bước đi chậm về phía camera, tóc bay nhẹ',
  'ngồi thư giãn, tay cầm sản phẩm ngang tầm ngực',
  'xoay người khoe tổng thể outfit, cười nhẹ',
  'cúi nhẹ nhìn sản phẩm, biểu cảm hài lòng',
  'giơ sản phẩm lên ngang mặt, nhìn vào ống kính',
  'tựa vào tường, tư thế thả lỏng tự nhiên',
]

/* --------------------------------------------------------- image analysis */

export function analyzeImage({ imageName = 'reference.jpg', imageType = 'Nhân vật', description = '', seed = 7 }) {
  const base = {
    'Nhân vật': {
      subject: 'Một nhân vật chính diện, khung hình bán thân',
      identity: [
        'Khuôn mặt trái xoan, gò má cao, đường nét hài hòa',
        'Tóc dài ngang vai, màu nâu đen, rẽ ngôi lệch',
        'Tông da sáng ấm, trang điểm tự nhiên',
        'Ánh mắt tự tin, biểu cảm thân thiện',
      ],
      tags: ['portrait', 'female model', 'natural makeup', 'studio light', 'clean background'],
    },
    'Sản phẩm': {
      subject: 'Sản phẩm đặt chính giữa khung hình trên nền sạch',
      identity: [
        'Bao bì dạng hộp/chai, tỉ lệ cao thon',
        'Bảng màu chủ đạo: trắng ngà kết hợp ánh kim',
        'Nhãn chính diện có logo và dòng chữ mô tả',
        'Bề mặt bán bóng, phản chiếu ánh sáng mềm',
      ],
      tags: ['product shot', 'packaging', 'studio backdrop', 'soft reflection', 'commercial'],
    },
    'Bối cảnh': {
      subject: 'Bối cảnh không gian rộng, không có nhân vật nổi bật',
      identity: [
        'Không gian nội thất hiện đại, tối giản',
        'Ánh sáng cửa sổ lớn, hướng sáng từ trái',
        'Bảng màu trung tính: be, gỗ sáng, trắng',
        'Chiều sâu tốt, tiền cảnh - trung cảnh - hậu cảnh rõ ràng',
      ],
      tags: ['interior', 'minimal', 'daylight', 'neutral palette'],
    },
    'Trang phục': {
      subject: 'Bộ trang phục được trình bày trên người mẫu / mannequin',
      identity: [
        'Chất liệu vải mềm rũ, bắt sáng nhẹ',
        'Phom dáng suông, tay dài, cổ tròn',
        'Màu sắc: tông đơn sắc trung tính',
        'Chi tiết: đường may nổi, cúc bọc cùng màu',
      ],
      tags: ['fashion', 'outfit', 'fabric detail', 'lookbook'],
    },
    Storyboard: {
      subject: 'Bản phác thảo nhiều khung hình xếp lưới',
      identity: [
        'Bố cục 6 khung, đánh số theo thứ tự cảnh',
        'Nét vẽ đơn giản, chú thích góc máy',
        'Có mũi tên chỉ hướng chuyển động',
      ],
      tags: ['storyboard', 'sketch', 'shot list'],
    },
    'Logo / Thương hiệu': {
      subject: 'Logo thương hiệu trên nền phẳng',
      identity: [
        'Logotype chữ kết hợp biểu tượng đơn giản',
        'Màu thương hiệu tương phản cao với nền',
        'Khoảng thở quanh logo rộng, cân đối',
      ],
      tags: ['logo', 'brand mark', 'flat background'],
    },
  }
  const info = base[imageType] || base['Nhân vật']
  const lighting = pick(LIGHTING_BANK, seed)
  return {
    summary: `${info.subject}. ${description ? 'Ghi chú người dùng: ' + description + '.' : ''} Nguồn: ${imageName}.`,
    attributes: info.identity,
    lighting,
    composition: pick(
      [
        'Bố cục trung tâm, chủ thể chiếm ~60% khung hình',
        'Bố cục 1/3, chủ thể lệch trái, khoảng thở bên phải',
        'Bố cục đối xứng, đường chân trời chia đôi khung',
      ],
      seed + 1,
    ),
    palette: pick(
      [
        ['#F2E9E4', '#C9ADA7', '#4A4E69', '#22223B'],
        ['#0F0F10', '#B08D57', '#EDE6DB', '#7A7A7A'],
        ['#FFF7F0', '#FFB4A2', '#E5989B', '#6D6875'],
      ],
      seed + 2,
    ),
    tags: info.tags,
    identityLock: `Giữ nguyên 100% ${
      imageType === 'Sản phẩm' ? 'kiểu dáng, nhãn, logo và tỉ lệ sản phẩm' : 'khuôn mặt, kiểu tóc, tông da và tỉ lệ cơ thể của nhân vật'
    } như ảnh gốc trong mọi khung hình.`,
  }
}

/* --------------------------------------------------------- prompt builder */

const DETAIL_WEIGHT = {
  'Ngắn gọn': 1,
  'Trung bình': 2,
  'Rất chi tiết': 3,
  'Siêu chi tiết': 4,
}

export function buildImagePrompt(ctx, opts = {}) {
  const {
    style = 'Cinematic',
    aspectRatio = '9:16',
    camera = 'Medium Shot',
    detail = 'Rất chi tiết',
    extra = '',
    subject,
  } = opts
  const weight = DETAIL_WEIGHT[detail] || 3
  const seed = hashString(JSON.stringify({ ctx: ctx.idea, style, camera }))
  const subj =
    subject ||
    clean(ctx.character) ||
    clean(ctx.product) ||
    clean(ctx.idea) ||
    'a premium hero subject for a short-form video'

  const parts = [
    subj,
    STYLE_PROMPTS[style] || STYLE_PROMPTS.Cinematic,
    CAMERA_PROMPTS[camera] || CAMERA_PROMPTS['Medium Shot'],
  ]
  if (weight >= 2) parts.push(pick(LIGHTING_BANK, seed), ctx.background ? `environment: ${ctx.background}` : 'clean uncluttered environment')
  if (weight >= 3)
    parts.push(
      ctx.outfit ? `wardrobe: ${ctx.outfit}` : 'wardrobe consistent with the reference image',
      'ultra sharp focus on the subject, natural micro-contrast, no oversharpening',
      `aspect ratio ${aspectRatio}`,
    )
  if (weight >= 4)
    parts.push(
      'rendered with true-to-life color science, realistic subsurface skin scattering, accurate material reflectance',
      'professional retouch level, magazine ready, high dynamic range',
      'composition follows rule of thirds with intentional negative space',
    )
  if (extra) parts.push(extra)
  return parts.filter(Boolean).join(', ')
}

export function buildPromptPack(ctx, opts = {}) {
  const style = opts.style || ctx.style || 'Cinematic'
  const camera = opts.camera || ctx.camera || 'Medium Shot'
  const motion = opts.motion || ctx.motion || 'Smooth Cinematic Motion'
  const aspectRatio = opts.aspectRatio || ctx.aspectRatio || '9:16'
  const seed = hashString(style + camera + (ctx.idea || ''))
  return {
    main: buildImagePrompt(ctx, { ...opts, style, camera, aspectRatio }),
    negative: NEGATIVE_QUICK,
    camera: CAMERA_PROMPTS[camera] || CAMERA_PROMPTS['Medium Shot'],
    lighting: pick(LIGHTING_BANK, seed),
    motion: MOTION_PROMPTS[motion] || MOTION_PROMPTS['Smooth Cinematic Motion'],
    consistency: buildConsistencyRules(ctx),
  }
}

export const NEGATIVE_QUICK =
  'blurry, low resolution, deformed face, extra fingers, distorted hands, warped product label, text artifacts, watermark, duplicated subject'

/* --------------------------------------------------- consistency & rules */

export function buildConsistencyRules(ctx = {}) {
  const rules = []
  if (ctx.character || ctx.hasCharacterImage)
    rules.push(
      'IDENTITY LOCK: giữ nguyên khuôn mặt, cấu trúc xương, kiểu tóc, màu tóc, tông da và dáng người của nhân vật ở mọi cảnh.',
      'Không thay đổi độ tuổi, giới tính, sắc tộc hay biểu cảm đặc trưng của nhân vật.',
    )
  if (ctx.product || ctx.hasProductImage)
    rules.push(
      'PRODUCT LOCK: giữ nguyên hình dáng, tỉ lệ, màu sắc, chất liệu, logo và vị trí nhãn của sản phẩm.',
      'Không thêm/bớt chi tiết trên bao bì, không bóp méo chữ trên nhãn.',
    )
  if (ctx.outfit) rules.push('OUTFIT LOCK: giữ nguyên trang phục, phụ kiện, màu vải và chi tiết thiết kế xuyên suốt.')
  if (ctx.background) rules.push('BACKGROUND LOCK: giữ nguyên bối cảnh, hướng ánh sáng và bảng màu môi trường giữa các cảnh.')
  rules.push(
    'LIGHT CONTINUITY: giữ cùng hướng nguồn sáng và nhiệt độ màu giữa các cảnh liền kề.',
    'CAMERA CONTINUITY: giữ cùng tiêu cự và chiều cao máy trong một chuỗi cảnh liên tục.',
  )
  return rules
}

/* ---------------------------------------------------------------- script */

export function buildScript(ctx = {}, opts = {}) {
  const {
    scriptStyle = 'Quảng cáo TVC',
    sceneCount = 6,
    duration = '15 giây',
    language = 'Tiếng Việt',
    dialogue = true,
    tone = 'Chuyên nghiệp',
  } = opts
  const style = opts.style || ctx.style || 'Cinematic'
  const camera = opts.camera || ctx.camera || 'Medium Shot'
  const aspectRatio = opts.aspectRatio || ctx.aspectRatio || '9:16'
  const totalSeconds = durationToSeconds(duration)
  const count = Math.max(1, parseInt(sceneCount, 10) || 6)
  const seed = hashString((ctx.idea || '') + scriptStyle + style)
  const beats = SCENE_BEATS[scriptStyle] || SCENE_BEATS.default
  const subjectFull = clean(ctx.product) || clean(ctx.character) || clean(ctx.idea) || 'sản phẩm chủ đạo'
  const subject = clean(ctx.productName) || clean(ctx.characterProfile?.charName) || shorten(subjectFull, 9)
  const brand = clean(ctx.brand) || clean(ctx.productName) || 'thương hiệu'

  const perScene = Math.max(1, Math.round((totalSeconds / count) * 10) / 10)
  const scenes = []
  for (let i = 0; i < count; i++) {
    const beat = beats[Math.min(i, beats.length - 1)]
    const isLast = i === count - 1
    const beatName = isLast ? 'CTA & chốt thương hiệu' : beat.name
    const cam = pick(CAMERA_SEQUENCE, seed + i)
    const pose = pick(POSE_BANK, seed + i * 3)
    const start = Math.round(perScene * i * 10) / 10
    const end = Math.round(perScene * (i + 1) * 10) / 10

    const visual = isLast
      ? `Sản phẩm ${subject} đặt chính giữa khung hình, logo ${brand} hiện dần, nền tối giản gradient.`
      : `${cam} — ${subjectFull} trong bối cảnh ${clean(ctx.background) || 'studio tối giản'}, ${pose}.`

    const action = isLast
      ? 'Camera giữ tĩnh, logo và slogan fade-in, ánh sáng nhấn nhẹ vào sản phẩm.'
      : pick(
          [
            'Nhân vật bước vào khung hình, camera đẩy nhẹ theo hướng chuyển động.',
            'Tay chạm nhẹ vào sản phẩm, camera lia ngang chậm để lộ chi tiết.',
            'Chuyển cảnh bằng match-cut, chủ thể giữ nguyên vị trí trong khung.',
            'Sản phẩm xoay chậm trên bục, ánh sáng quét ngang tạo highlight.',
            'Nhân vật nhìn vào ống kính, khẽ mỉm cười, camera dừng lại.',
          ],
          seed + i * 5,
        )

    const vnLine = isLast
      ? CTA_BANK[scriptStyle] || 'Trải nghiệm ngay hôm nay.'
      : pick(
          [
            `${titleCase(subject)} — thiết kế cho những người biết mình muốn gì.`,
            `Chỉ một chi tiết nhỏ thôi, nhưng thay đổi cả trải nghiệm.`,
            `Đây là lý do mình không đổi sang thứ khác nữa.`,
            `Cảm giác đầu tiên khi chạm vào: rất khác biệt.`,
            `${titleCase(brand)} làm điều này tốt hơn bạn nghĩ.`,
            `Hãy nhìn kỹ chi tiết này — đó là điều tạo nên khác biệt.`,
          ],
          seed + i * 7,
        )
    const enLine = isLast
      ? 'Discover it today.'
      : pick(
          [
            `${titleCase(subject)} — designed for people who know what they want.`,
            'One small detail changes the entire experience.',
            "This is why I haven't switched to anything else.",
            'The very first touch already feels different.',
            `${titleCase(brand)} does this better than you expect.`,
          ],
          seed + i * 7,
        )

    const line = !dialogue
      ? ''
      : language === 'Tiếng Anh'
        ? enLine
        : language === 'Song ngữ' || language === 'Song ngữ Việt - Anh'
          ? `${vnLine} / ${enLine}`
          : vnLine

    scenes.push({
      index: i + 1,
      name: beatName,
      purpose: isLast ? 'Kêu gọi hành động và ghi nhớ thương hiệu' : beat.purpose,
      timecode: `${start.toFixed(1)}s - ${end.toFixed(1)}s`,
      duration: `${perScene}s`,
      visual,
      action,
      camera: cam,
      pose,
      location: clean(ctx.background) || 'Studio tối giản, nền gradient',
      dialogue: line,
      sfx: pick(['whoosh nhẹ khi chuyển cảnh', 'tiếng vải sột soạt', 'ambient studio tone', 'nhấn beat nhạc', 'tiếng click sản phẩm'], seed + i * 11),
      imagePrompt: buildImagePrompt(ctx, {
        style,
        camera,
        aspectRatio,
        detail: 'Rất chi tiết',
        subject: `scene ${i + 1}: ${subjectFull}, ${pose}, ${cam.toLowerCase()}`,
      }),
      videoPrompt: `${cam.toLowerCase()}, ${MOTION_PROMPTS[opts.motion || ctx.motion || 'Smooth Cinematic Motion']}, duration ${perScene}s, subject stays consistent with reference, ${STYLE_PROMPTS[style]}`,
    })
  }

  const hooks = HOOK_BANK[scriptStyle] || HOOK_BANK['Quảng cáo TVC']
  const title = clean(ctx.title) || `${titleCase(subject)} | ${scriptStyle} ${totalSeconds}s`

  return {
    title,
    logline: `Video ${scriptStyle.toLowerCase()} dài ${totalSeconds} giây, tỉ lệ ${aspectRatio}, phong cách ${style}, xoay quanh ${subject}.`,
    hook: pick(hooks, seed),
    style,
    scriptStyle,
    tone,
    language,
    aspectRatio,
    duration: `${totalSeconds} giây`,
    sceneCount: count,
    scenes,
    cta: CTA_BANK[scriptStyle] || 'Khám phá ngay hôm nay.',
    keywords: [subject, brand, style, scriptStyle].filter(Boolean),
  }
}

/* ------------------------------------------------------------ storyboard */

export function buildStoryboard(script, opts = {}) {
  const frameCount = Math.max(1, parseInt(opts.frameCount, 10) || 6)
  const aspectRatio = opts.aspectRatio || script?.aspectRatio || '9:16'
  const scenes = script?.scenes?.length ? script.scenes : []
  const frames = []
  for (let i = 0; i < frameCount; i++) {
    const src = scenes.length ? scenes[Math.floor((i * scenes.length) / frameCount)] : null
    frames.push({
      index: i + 1,
      title: src?.name || `Khung ${i + 1}`,
      shotSize: pick(['Wide', 'Medium', 'Close-up', 'Extreme close-up', 'Over-the-shoulder'], hashString(String(i) + aspectRatio)),
      camera: src?.camera || pick(CAMERA_SEQUENCE, i),
      pose: src?.pose || pick(POSE_BANK, i),
      action: src?.action || 'Chủ thể giữ nguyên vị trí, camera chuyển động nhẹ.',
      location: src?.location || 'Studio tối giản',
      description: src?.visual || 'Khung hình chủ thể trung tâm, ánh sáng mềm.',
      dialogue: src?.dialogue || '',
      duration: src?.duration || '2s',
      imagePrompt:
        (src?.imagePrompt || 'cinematic hero frame') + `, storyboard frame ${i + 1} of ${frameCount}, aspect ratio ${aspectRatio}`,
    })
  }
  return {
    aspectRatio,
    frameCount,
    frames,
    continuity: [
      'Giữ cùng nhân vật / sản phẩm và trang phục trong toàn bộ khung hình.',
      'Hướng nhìn (eyeline) và hướng chuyển động phải liền mạch giữa các khung.',
      'Không đổi bảng màu và nhiệt độ ánh sáng giữa các khung liền kề.',
      'Tỉ lệ chủ thể trong khung thay đổi mượt: wide → medium → close-up.',
    ],
  }
}

/* ---------------------------------------------------------- video prompt */

export const VIDEO_MODES = {
  'Image to Video': 'animate the reference image into a living shot while preserving every detail of the source frame',
  'Storyboard to Video': 'convert the storyboard frames into a continuous shot sequence with matched transitions',
  'Start Frame to End Frame': 'interpolate smoothly from the start frame composition to the end frame composition',
  'Before / After Transformation': 'perform a clean before-and-after transformation with a seamless match cut',
  'Fashion Lookbook Motion': 'fashion lookbook motion with sequential poses and fabric physics',
  'Product Commercial Motion': 'premium product commercial motion with controlled rotation and light sweeps',
  'Time-lapse Motion': 'time-lapse acceleration with stable framing and smooth ramping',
  'Static Camera Motion': 'locked camera, only the subject moves inside the frame',
  'Cinematic Motion': 'cinematic camera choreography with eased acceleration and parallax',
}

export function buildVideoPrompt(ctx = {}, opts = {}) {
  const mode = opts.mode || 'Image to Video'
  const camera = opts.camera || ctx.camera || 'Slow Push-in'
  const motion = opts.motion || ctx.motion || 'Smooth Cinematic Motion'
  const style = opts.style || ctx.style || 'Cinematic'
  const duration = opts.duration || ctx.duration || '10 giây'
  const seconds = durationToSeconds(duration)
  const flags = opts.flags || []
  const script = ctx.script

  const audio = flags.includes('Có lời thoại')
    ? 'with synced dialogue audio'
    : flags.includes('Không lời thoại')
      ? 'no dialogue, no lip sync'
      : 'ambient sound only'
  const music = flags.includes('Không nhạc nền') ? 'no background music' : 'subtle background score'
  const speed = flags.includes('Chuyển động chậm')
    ? 'slow motion pacing'
    : flags.includes('Tua nhanh')
      ? 'accelerated pacing'
      : 'natural pacing'

  const main = [
    VIDEO_MODES[mode],
    STYLE_PROMPTS[style],
    CAMERA_PROMPTS[camera],
    MOTION_PROMPTS[motion],
    speed,
    audio,
    music,
    `total duration ${seconds} seconds`,
    `aspect ratio ${opts.aspectRatio || ctx.aspectRatio || '9:16'}`,
    'preserve subject identity across every frame, no morphing, no flicker',
  ]
    .filter(Boolean)
    .join(', ')

  const sceneMotion = (script?.scenes || []).map((s) => ({
    index: s.index,
    timecode: s.timecode,
    cameraMovement: s.camera,
    subjectMovement: s.action,
    prompt: `${s.visual} ${CAMERA_PROMPTS[camera] || ''}, ${MOTION_PROMPTS[motion] || ''}, hold ${s.duration}`,
  }))

  return {
    mode,
    main,
    sceneMotion,
    cameraMovement: CAMERA_PROMPTS[camera],
    characterMovement: flags.includes('Camera tĩnh')
      ? 'Chỉ nhân vật chuyển động, camera đứng yên hoàn toàn.'
      : 'Nhân vật chuyển động tự nhiên, camera bám theo mềm mại.',
    timing: `${seconds}s tổng, chia đều cho ${script?.scenes?.length || 1} cảnh, transition 0.3s giữa các cảnh.`,
    antiError: [
      'Không biến dạng khuôn mặt hoặc bàn tay khi chuyển động.',
      'Không morph sản phẩm, không đổi chữ trên nhãn giữa các frame.',
      'Không xuất hiện vật thể lạ hoặc chi tiết thừa ở hậu cảnh.',
      'Không giật khung, không nhấp nháy ánh sáng (flicker) giữa các frame.',
      'Không cắt đột ngột giữa cảnh trừ khi được chỉ định match-cut.',
    ],
  }
}

/* ------------------------------------------------------- negative prompt */

export const NEGATIVE_GROUPS = {
  'Lỗi mặt':
    'deformed face, asymmetric eyes, extra eyes, melted facial features, distorted nose, uncanny expression, plastic skin, face morphing between frames',
  'Lỗi tay':
    'extra fingers, missing fingers, fused fingers, six fingers, malformed hands, twisted wrists, unnatural finger bending',
  'Lỗi cơ thể':
    'extra limbs, missing limbs, disproportionate body, broken anatomy, floating body parts, unnatural neck length',
  'Lỗi trang phục':
    'melted fabric, inconsistent outfit, changing clothing color, floating clothes, garment clipping through body, wrong garment pattern',
  'Lỗi sản phẩm':
    'warped product shape, distorted label, unreadable brand text, duplicated product, wrong product color, melted packaging',
  'Lỗi bối cảnh':
    'cluttered background, warped architecture, bent horizon, inconsistent background between shots, random background people',
  'Lỗi ánh sáng':
    'blown highlights, crushed blacks, inconsistent light direction, harsh flicker, unnatural color cast, banding',
  'Lỗi chuyển động':
    'jittery motion, stuttering frames, motion blur smearing, sliding feet, unnatural walk cycle, sudden teleporting',
  'Lỗi video':
    'frame flicker, temporal artifacts, ghosting, compression blocks, warping between keyframes, low fps look',
  'Lỗi thêm vật thể lạ':
    'random floating objects, unexpected text, watermark, logo artifacts, duplicated subject, phantom limbs',
}

export function buildNegativePrompt(ctx = {}, opts = {}) {
  const groups = opts.groups?.length ? opts.groups : Object.keys(NEGATIVE_GROUPS)
  const custom = clean(opts.custom)
  const parts = groups.map((g) => NEGATIVE_GROUPS[g]).filter(Boolean)
  const base = 'low quality, blurry, lowres, jpeg artifacts, oversaturated, watermark, signature, text overlay'
  const full = [base, ...parts, custom].filter(Boolean).join(', ')
  return {
    full,
    groups,
    identityLock: ctx.character || ctx.hasCharacterImage
      ? 'Khoá nhận diện nhân vật: khuôn mặt, tóc, tông da, dáng người giữ nguyên tuyệt đối so với ảnh tham chiếu.'
      : 'Khoá nhận diện chủ thể chính theo ảnh tham chiếu.',
    productLock: 'Khoá sản phẩm: hình dáng, tỉ lệ, màu, logo, chữ trên nhãn không được thay đổi ở bất kỳ frame nào.',
    backgroundLock: 'Khoá bối cảnh: bảng màu, hướng sáng, layout không gian giữ nhất quán giữa các cảnh.',
    motionStability: 'Ổn định chuyển động: không giật, không flicker, không trượt chân, chuyển động tuân theo vật lý thật.',
  }
}

/* ----------------------------------------------------------- dialogue/vo */

const VOICE_NOTE = {
  'Nam miền Bắc': 'giọng nam Bắc, phát âm chuẩn, trầm ấm, tốc độ vừa',
  'Nữ miền Bắc': 'giọng nữ Bắc, trong trẻo, rõ ràng, thân thiện',
  'Nam miền Nam': 'giọng nam Nam, gần gũi, nhịp thoải mái',
  'Nữ miền Nam': 'giọng nữ Nam, ngọt ngào, tự nhiên',
  'Giọng quảng cáo': 'giọng quảng cáo năng lượng cao, nhấn nhá mạnh ở CTA',
  'Giọng kể chuyện': 'giọng kể chuyện chậm rãi, giàu cảm xúc',
  'Giọng hài hước': 'giọng hài hước, nhịp nhanh, lên xuống linh hoạt',
  'Giọng chuyên gia': 'giọng chuyên gia điềm tĩnh, đáng tin cậy',
  'Không lời thoại': 'không sử dụng lời thoại, chỉ nhạc nền và tiếng động',
}

export function buildDialogue(script, opts = {}) {
  const voice = opts.voice || 'Nữ miền Bắc'
  const speed = opts.speed || 'Vừa'
  if (voice === 'Không lời thoại') {
    return { voice, speed, note: VOICE_NOTE[voice], lines: [], vo: 'Không có lời thoại — dùng nhạc nền + tiếng động môi trường.' }
  }
  const lines = (script?.scenes || []).map((s) => ({
    index: s.index,
    timecode: s.timecode,
    speaker: opts.speaker || 'Voice-over',
    text: s.dialogue || `(${s.name}) — nhấn mạnh hình ảnh, không lời.`,
    direction: pick(['nhấn nhẹ cuối câu', 'giữ nhịp đều', 'hạ giọng tạo chiều sâu', 'tăng năng lượng', 'ngắt nhịp trước từ khoá'], s.index),
  }))
  return {
    voice,
    speed,
    note: VOICE_NOTE[voice],
    lines,
    vo: lines.map((l) => `[${l.timecode}] ${l.text}`).join('\n'),
  }
}

/* ------------------------------------------------------------ style node */

export function buildStyleProfile(opts = {}) {
  const style = opts.style || 'Cinematic'
  const mood = opts.mood || 'Sang trọng'
  const palette = opts.palette || 'Trung tính ấm'
  return {
    style,
    mood,
    palette,
    stylePrompt: STYLE_PROMPTS[style] || STYLE_PROMPTS.Cinematic,
    grading: pick(
      ['teal & orange grade', 'warm filmic grade', 'neutral commercial grade', 'muted pastel grade', 'high contrast luxury grade'],
      hashString(style + mood),
    ),
    referenceNote: `Toàn bộ khung hình tuân theo phong cách ${style}, tâm trạng ${mood.toLowerCase()}, bảng màu ${palette.toLowerCase()}.`,
  }
}
