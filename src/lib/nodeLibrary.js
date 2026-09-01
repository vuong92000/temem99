/**
 * nodeLibrary.js
 * ---------------------------------------------------------------------------
 * Registry trung tâm của toàn bộ node trong app.
 * Thêm 1 node mới = thêm 1 object vào NODE_DEFS. Không cần sửa UI.
 *
 * Cấu trúc 1 definition:
 *  {
 *    type, label, group, icon, accent, description,
 *    inputs:  [{ id, label, required? }],
 *    outputs: [{ id, label }],
 *    fields:  [{ key, type, label, options?, default?, placeholder?, help?, when? }],
 *    actions: [{ id, label, icon, kind: 'run' | 'copy' | 'clear', field? }],
 *    run: ({ ctx, config, node, inputs }) => ({ result, patch })
 *      - result: dữ liệu hiển thị của node (object)
 *      - patch : phần dữ liệu ghi vào context chảy xuống node sau
 *  }
 */

import {
  analyzeImage,
  buildDialogue,
  buildImagePrompt,
  buildNegativePrompt,
  buildPromptPack,
  buildScript,
  buildStoryboard,
  buildStyleProfile,
  buildVideoPrompt,
  buildConsistencyRules,
  NEGATIVE_GROUPS,
  STYLE_PROMPTS,
  durationToSeconds,
} from './generators.js'

export const GROUPS = [
  { id: 'input', label: 'Input Nodes', icon: 'Import', color: '#7c5cff' },
  { id: 'ai', label: 'AI Generation Nodes', icon: 'Sparkles', color: '#3ddbd9' },
  { id: 'control', label: 'Control Nodes', icon: 'GitBranch', color: '#ff9f45' },
  { id: 'output', label: 'Output Nodes', icon: 'Share2', color: '#4ade80' },
  { id: 'utility', label: 'Utility Nodes', icon: 'SlidersHorizontal', color: '#f472b6' },
]

export const ACCENTS = {
  violet: { from: '#7c5cff', to: '#a98fff', ring: 'rgba(124,92,255,0.55)' },
  aqua: { from: '#22c1c3', to: '#3ddbd9', ring: 'rgba(61,219,217,0.5)' },
  ember: { from: '#ff7a18', to: '#ff9f45', ring: 'rgba(255,122,24,0.5)' },
  green: { from: '#22c55e', to: '#4ade80', ring: 'rgba(74,222,128,0.5)' },
  pink: { from: '#db2777', to: '#f472b6', ring: 'rgba(244,114,182,0.5)' },
  blue: { from: '#2563eb', to: '#60a5fa', ring: 'rgba(96,165,250,0.5)' },
}

const OUT = (id, label) => ({ id, label })
const IN = (id, label, required = false) => ({ id, label, required })

/* --------------------------------------------------------------- helpers */

const summarize = (obj, keys) =>
  keys
    .map((k) => obj?.[k])
    .filter(Boolean)
    .join(' • ')

/* ------------------------------------------------------------- NODE DEFS */

export const NODE_DEFS = {
  /* =============================== INPUT ================================ */
  imageInput: {
    type: 'imageInput',
    label: 'Image Node',
    group: 'input',
    icon: 'Image',
    accent: 'violet',
    description: 'Upload ảnh nhân vật / sản phẩm / bối cảnh làm tham chiếu.',
    inputs: [],
    outputs: [OUT('out', 'Image Data')],
    fields: [
      { key: 'image', type: 'image', label: 'Hình ảnh tham chiếu' },
      {
        key: 'imageType',
        type: 'chips',
        label: 'Loại hình ảnh',
        options: ['Nhân vật', 'Sản phẩm', 'Bối cảnh', 'Trang phục', 'Storyboard', 'Logo / Thương hiệu'],
        default: 'Nhân vật',
      },
      { key: 'description', type: 'textarea', label: 'Mô tả hình ảnh', placeholder: 'VD: Nữ model 25 tuổi, tóc dài, áo blazer be...' },
      { key: 'weight', type: 'slider', label: 'Độ ảnh hưởng tới prompt', min: 0, max: 100, step: 5, default: 80, suffix: '%' },
    ],
    actions: [
      { id: 'run', label: 'Analyze Image', icon: 'ScanEye', kind: 'run' },
      { id: 'clearImage', label: 'Remove Image', icon: 'Trash2', kind: 'clear', field: 'image' },
    ],
    run: ({ config }) => {
      const type = config.imageType || 'Nhân vật'
      const analysis = analyzeImage({
        imageName: config.imageName || 'reference.jpg',
        imageType: type,
        description: config.description,
      })
      const patch = { images: [{ type, name: config.imageName || 'reference.jpg', src: config.image, description: config.description }] }
      if (type === 'Nhân vật') Object.assign(patch, { character: config.description || analysis.summary, hasCharacterImage: true })
      if (type === 'Sản phẩm') Object.assign(patch, { product: config.description || analysis.summary, hasProductImage: true })
      if (type === 'Bối cảnh') patch.background = config.description || analysis.summary
      if (type === 'Trang phục') patch.outfit = config.description || analysis.summary
      if (type === 'Logo / Thương hiệu') patch.brand = config.description || 'Thương hiệu'
      patch.visualReference = analysis
      return {
        result: {
          'Image type': type,
          'Image description': config.description || analysis.summary,
          Preview: config.image ? 'Đã có ảnh preview' : 'Chưa upload ảnh (dùng mô tả)',
          'Identity data': analysis.identityLock,
          Attributes: analysis.attributes,
          Palette: analysis.palette,
        },
        patch,
      }
    },
  },

  textInput: {
    type: 'textInput',
    label: 'Text Input Node',
    group: 'input',
    icon: 'Type',
    accent: 'violet',
    description: 'Nhập ý tưởng, brief, thông điệp video.',
    inputs: [],
    outputs: [OUT('out', 'Text')],
    fields: [
      { key: 'idea', type: 'textarea', label: 'Ý tưởng / Brief', rows: 5, placeholder: 'VD: Quảng cáo nước hoa mùa thu cho nữ văn phòng...' },
      { key: 'title', type: 'text', label: 'Tiêu đề video (tuỳ chọn)', placeholder: 'VD: Mùa thu của riêng bạn' },
      { key: 'keywords', type: 'text', label: 'Từ khoá', placeholder: 'nước hoa, mùa thu, sang trọng' },
    ],
    actions: [{ id: 'run', label: 'Test Node', icon: 'Play', kind: 'run' }],
    run: ({ config }) => ({
      result: { Idea: config.idea || '(trống)', Title: config.title || '(tự động)', Keywords: config.keywords || '—' },
      patch: { idea: config.idea, title: config.title, keywords: config.keywords },
    }),
  },

  productInfo: {
    type: 'productInfo',
    label: 'Product Info Node',
    group: 'input',
    icon: 'Package',
    accent: 'violet',
    description: 'Thông tin sản phẩm: tên, USP, giá, khuyến mãi.',
    inputs: [],
    outputs: [OUT('out', 'Product Data')],
    fields: [
      { key: 'productName', type: 'text', label: 'Tên sản phẩm', placeholder: 'VD: Serum Vitamin C 15%' },
      { key: 'brand', type: 'text', label: 'Thương hiệu', placeholder: 'VD: Lumière' },
      { key: 'productDesc', type: 'textarea', label: 'Mô tả sản phẩm', rows: 3 },
      { key: 'usp', type: 'textarea', label: 'Điểm bán hàng (mỗi dòng 1 ý)', rows: 3, placeholder: 'Sáng da sau 7 ngày\nKhông gây kích ứng' },
      { key: 'price', type: 'text', label: 'Giá / Ưu đãi', placeholder: 'VD: 590.000đ — giảm 20%' },
    ],
    actions: [{ id: 'run', label: 'Test Node', icon: 'Play', kind: 'run' }],
    run: ({ config }) => ({
      result: {
        Product: config.productName || '(chưa nhập)',
        Brand: config.brand || '—',
        USP: (config.usp || '').split('\n').filter(Boolean),
        Price: config.price || '—',
      },
      patch: {
        product: [config.productName, config.productDesc].filter(Boolean).join(' — '),
        productName: config.productName,
        brand: config.brand,
        usp: (config.usp || '').split('\n').filter(Boolean),
        price: config.price,
      },
    }),
  },

  characterInfo: {
    type: 'characterInfo',
    label: 'Character Info Node',
    group: 'input',
    icon: 'UserRound',
    accent: 'violet',
    description: 'Hồ sơ nhân vật: tuổi, giới tính, ngoại hình, tính cách.',
    inputs: [],
    outputs: [OUT('out', 'Character Data')],
    fields: [
      { key: 'charName', type: 'text', label: 'Tên nhân vật', placeholder: 'VD: Linh' },
      { key: 'gender', type: 'chips', label: 'Giới tính', options: ['Nữ', 'Nam', 'Khác'], default: 'Nữ' },
      { key: 'age', type: 'text', label: 'Độ tuổi', placeholder: 'VD: 25-30' },
      { key: 'appearance', type: 'textarea', label: 'Ngoại hình', rows: 3, placeholder: 'Tóc dài nâu, da sáng, phong cách thanh lịch...' },
      { key: 'personality', type: 'text', label: 'Tính cách', placeholder: 'Tự tin, ấm áp' },
    ],
    actions: [{ id: 'run', label: 'Test Node', icon: 'Play', kind: 'run' }],
    run: ({ config }) => ({
      result: {
        Name: config.charName || '(chưa đặt tên)',
        Profile: `${config.gender || 'Nữ'} • ${config.age || '25-30'} • ${config.personality || 'tự tin'}`,
        Appearance: config.appearance || '—',
      },
      patch: {
        character: [config.charName, config.gender, config.age, config.appearance].filter(Boolean).join(', '),
        characterProfile: { ...config },
        hasCharacterImage: true,
      },
    }),
  },

  backgroundInfo: {
    type: 'backgroundInfo',
    label: 'Background Info Node',
    group: 'input',
    icon: 'Mountain',
    accent: 'violet',
    description: 'Bối cảnh, không gian, thời điểm quay.',
    inputs: [],
    outputs: [OUT('out', 'Background Data')],
    fields: [
      {
        key: 'location',
        type: 'select',
        label: 'Bối cảnh',
        options: ['Studio tối giản', 'Căn hộ hiện đại', 'Quán cafe', 'Đường phố', 'Bãi biển', 'Văn phòng', 'Rooftop hoàng hôn', 'Cửa hàng', 'Tuỳ chỉnh'],
        default: 'Studio tối giản',
      },
      { key: 'customLocation', type: 'text', label: 'Bối cảnh tuỳ chỉnh', placeholder: 'Chỉ dùng khi chọn "Tuỳ chỉnh"' },
      { key: 'timeOfDay', type: 'chips', label: 'Thời điểm', options: ['Sáng', 'Trưa', 'Chiều', 'Hoàng hôn', 'Đêm'], default: 'Chiều' },
      { key: 'ambience', type: 'text', label: 'Không khí', placeholder: 'Ấm áp, yên tĩnh' },
    ],
    actions: [{ id: 'run', label: 'Test Node', icon: 'Play', kind: 'run' }],
    run: ({ config }) => {
      const loc = config.location === 'Tuỳ chỉnh' ? config.customLocation || 'Bối cảnh tuỳ chỉnh' : config.location || 'Studio tối giản'
      const bg = `${loc}, thời điểm ${config.timeOfDay || 'chiều'}${config.ambience ? ', ' + config.ambience : ''}`
      return { result: { Location: loc, Time: config.timeOfDay, Ambience: config.ambience || '—' }, patch: { background: bg } }
    },
  },

  outfit: {
    type: 'outfit',
    label: 'Outfit Node',
    group: 'input',
    icon: 'Shirt',
    accent: 'violet',
    description: 'Trang phục, phụ kiện, chất liệu.',
    inputs: [],
    outputs: [OUT('out', 'Outfit Data')],
    fields: [
      { key: 'outfit', type: 'textarea', label: 'Mô tả trang phục', rows: 3, placeholder: 'Blazer be oversize, áo lụa trắng, quần ống suông...' },
      { key: 'accessories', type: 'text', label: 'Phụ kiện', placeholder: 'Túi da nâu, khuyên tai vàng' },
      { key: 'fabric', type: 'chips', label: 'Chất liệu', options: ['Lụa', 'Cotton', 'Denim', 'Len', 'Da', 'Voan'], default: 'Cotton' },
    ],
    actions: [{ id: 'run', label: 'Test Node', icon: 'Play', kind: 'run' }],
    run: ({ config }) => ({
      result: { Outfit: config.outfit || '—', Accessories: config.accessories || '—', Fabric: config.fabric },
      patch: { outfit: [config.outfit, config.accessories, config.fabric && `chất liệu ${config.fabric}`].filter(Boolean).join(', ') },
    }),
  },

  audioInput: {
    type: 'audioInput',
    label: 'Audio / Voice Input',
    group: 'input',
    icon: 'Mic',
    accent: 'violet',
    description: 'Nhạc nền, tiếng động, giọng đọc tham chiếu.',
    inputs: [],
    outputs: [OUT('out', 'Audio Data')],
    fields: [
      { key: 'music', type: 'select', label: 'Nhạc nền', options: ['Không nhạc', 'Cinematic ambient', 'Upbeat pop', 'Lo-fi chill', 'Luxury piano', 'Trending TikTok'], default: 'Cinematic ambient' },
      { key: 'sfx', type: 'text', label: 'Hiệu ứng âm thanh', placeholder: 'whoosh, click, ambient city' },
      { key: 'voiceRef', type: 'text', label: 'Giọng tham chiếu', placeholder: 'VD: nữ trầm ấm, tốc độ vừa' },
    ],
    actions: [{ id: 'run', label: 'Test Node', icon: 'Play', kind: 'run' }],
    run: ({ config }) => ({
      result: { Music: config.music, SFX: config.sfx || '—', 'Voice ref': config.voiceRef || '—' },
      patch: { audio: { ...config } },
    }),
  },

  /* ================================== AI ================================ */
  imageAnalysis: {
    type: 'imageAnalysis',
    label: 'Image Analysis Node',
    group: 'ai',
    icon: 'ScanEye',
    accent: 'aqua',
    description: 'Phân tích ảnh tham chiếu thành dữ liệu nhận diện.',
    inputs: [IN('in', 'Image', true)],
    outputs: [OUT('out', 'Analysis')],
    fields: [
      {
        key: 'depth',
        type: 'chips',
        label: 'Mức phân tích',
        options: ['Cơ bản', 'Chi tiết', 'Chuyên sâu'],
        default: 'Chi tiết',
      },
      { key: 'focus', type: 'multiselect', label: 'Tập trung vào', options: ['Khuôn mặt', 'Trang phục', 'Sản phẩm', 'Ánh sáng', 'Bối cảnh', 'Bảng màu'], default: ['Khuôn mặt', 'Ánh sáng', 'Bảng màu'] },
    ],
    actions: [{ id: 'run', label: 'Analyze', icon: 'ScanEye', kind: 'run' }],
    run: ({ ctx, config }) => {
      const img = ctx.images?.[0]
      const analysis =
        ctx.visualReference ||
        analyzeImage({ imageName: img?.name, imageType: img?.type || 'Nhân vật', description: img?.description || ctx.idea })
      const focus = config.focus?.length ? config.focus : ['Khuôn mặt', 'Ánh sáng']
      return {
        result: {
          Summary: analysis.summary,
          Attributes: analysis.attributes,
          Lighting: analysis.lighting,
          Composition: analysis.composition,
          Palette: analysis.palette,
          Tags: analysis.tags,
          Focus: focus,
          'Identity lock': analysis.identityLock,
        },
        patch: { analysis, visualReference: analysis },
      }
    },
  },

  promptGenerator: {
    type: 'promptGenerator',
    label: 'Prompt Generator Node',
    group: 'ai',
    icon: 'WandSparkles',
    accent: 'aqua',
    description: 'Sinh prompt tiếng Anh hoàn chỉnh cho ảnh / video.',
    inputs: [IN('in', 'Context', true)],
    outputs: [OUT('out', 'Prompt Pack')],
    fields: [
      {
        key: 'promptType',
        type: 'select',
        label: 'Loại prompt',
        options: [
          'Prompt tạo ảnh',
          'Prompt chuyển ảnh thành video',
          'Prompt storyboard',
          'Prompt giữ nhân vật nhất quán',
          'Prompt quảng cáo sản phẩm',
          'Prompt video thời trang',
          'Prompt before / after',
          'Prompt review sản phẩm',
        ],
        default: 'Prompt tạo ảnh',
      },
      { key: 'detail', type: 'chips', label: 'Mức chi tiết', options: ['Ngắn gọn', 'Trung bình', 'Rất chi tiết', 'Siêu chi tiết'], default: 'Rất chi tiết' },
      { key: 'extra', type: 'textarea', label: 'Yêu cầu bổ sung', rows: 3, placeholder: 'VD: thêm ánh sáng neon tím, giữ logo ở góc phải...' },
    ],
    actions: [
      { id: 'run', label: 'Generate Prompt', icon: 'WandSparkles', kind: 'run' },
      { id: 'regen', label: 'Regenerate', icon: 'RefreshCw', kind: 'run' },
      { id: 'copy', label: 'Copy Prompt', icon: 'Copy', kind: 'copy', field: 'Main prompt' },
    ],
    run: ({ ctx, config }) => {
      const pack = buildPromptPack(ctx, { detail: config.detail, extra: config.extra })
      const typed = { ...pack }
      if (config.promptType === 'Prompt chuyển ảnh thành video') typed.main = `animate this reference image: ${pack.main}, cinematic camera motion, 24fps, seamless loop-safe`
      if (config.promptType === 'Prompt giữ nhân vật nhất quán') typed.main = `${pack.main}, exact same person as reference, identical facial structure, identical hairstyle, consistent identity across frames`
      if (config.promptType === 'Prompt quảng cáo sản phẩm') typed.main = `${pack.main}, hero product commercial shot, pristine packaging, brand-accurate colors, premium advertising look`
      if (config.promptType === 'Prompt video thời trang') typed.main = `${pack.main}, fashion film aesthetic, fabric motion, editorial posing, runway grade lighting`
      if (config.promptType === 'Prompt before / after') typed.main = `${pack.main}, split composition showing before state and after state, identical framing, only the subject condition changes`
      if (config.promptType === 'Prompt review sản phẩm') typed.main = `${pack.main}, honest UGC review framing, product held toward camera, natural indoor light`
      if (config.promptType === 'Prompt storyboard') typed.main = `${pack.main}, storyboard sheet layout, numbered panels, consistent character across panels`
      return {
        result: {
          Type: config.promptType,
          'Main prompt': typed.main,
          'Negative prompt': typed.negative,
          'Camera instruction': typed.camera,
          'Lighting instruction': typed.lighting,
          'Motion instruction': typed.motion,
          'Consistency rules': typed.consistency,
        },
        patch: { prompt: typed, imagePrompt: typed.main },
      }
    },
  },

  scriptGenerator: {
    type: 'scriptGenerator',
    label: 'Script Generator Node',
    group: 'ai',
    icon: 'FileText',
    accent: 'aqua',
    description: 'Tạo kịch bản video chia cảnh kèm lời thoại.',
    inputs: [IN('in', 'Context', true)],
    outputs: [OUT('out', 'Script')],
    fields: [
      {
        key: 'scriptStyle',
        type: 'select',
        label: 'Phong cách kịch bản',
        options: [
          'Quảng cáo TVC',
          'Viral TikTok',
          'Review sản phẩm',
          'Thời trang Lookbook',
          'Kể chuyện cảm xúc',
          'Hài hước',
          'Sang trọng cao cấp',
          'Before / After',
          'Hướng dẫn sử dụng',
          'Bán hàng chuyển đổi cao',
          'Drama ngắn',
          'UGC quảng cáo',
        ],
        default: 'Quảng cáo TVC',
      },
      { key: 'sceneCount', type: 'chips', label: 'Số cảnh', options: ['3', '4', '6', '8', '10', 'Tuỳ chỉnh'], default: '6' },
      { key: 'customScenes', type: 'number', label: 'Số cảnh tuỳ chỉnh', min: 1, max: 30, default: 6 },
      { key: 'duration', type: 'chips', label: 'Thời lượng', options: ['8 giây', '10 giây', '15 giây', '30 giây', '60 giây', 'Tuỳ chỉnh'], default: '15 giây' },
      { key: 'customDuration', type: 'number', label: 'Thời lượng tuỳ chỉnh (giây)', min: 3, max: 600, default: 15 },
      { key: 'dialogue', type: 'toggle', label: 'Bật lời thoại', default: true },
      { key: 'language', type: 'chips', label: 'Ngôn ngữ', options: ['Tiếng Việt', 'Tiếng Anh', 'Song ngữ'], default: 'Tiếng Việt' },
    ],
    actions: [
      { id: 'run', label: 'Generate Script', icon: 'FileText', kind: 'run' },
      { id: 'regen', label: 'Regenerate Script', icon: 'RefreshCw', kind: 'run' },
      { id: 'copy', label: 'Copy Script', icon: 'Copy', kind: 'copy', field: 'Scenes' },
    ],
    run: ({ ctx, config }) => {
      const sceneCount = config.sceneCount === 'Tuỳ chỉnh' ? config.customScenes || 6 : parseInt(config.sceneCount, 10) || 6
      const duration = config.duration === 'Tuỳ chỉnh' ? `${config.customDuration || 15} giây` : config.duration || '15 giây'
      const script = buildScript(ctx, {
        scriptStyle: config.scriptStyle,
        sceneCount,
        duration,
        language: config.language || ctx.language,
        dialogue: config.dialogue !== false,
        tone: ctx.tone,
        style: ctx.style,
        camera: ctx.camera,
        motion: ctx.motion,
        aspectRatio: ctx.aspectRatio,
      })
      return {
        result: {
          Title: script.title,
          Hook: script.hook,
          Logline: script.logline,
          Duration: script.duration,
          Scenes: script.scenes.map((s) => `Cảnh ${s.index} [${s.timecode}] ${s.name}: ${s.visual}${s.dialogue ? ' — Thoại: "' + s.dialogue + '"' : ''}`),
          CTA: script.cta,
        },
        patch: { script, duration: script.duration, language: script.language },
      }
    },
  },

  storyboardGenerator: {
    type: 'storyboardGenerator',
    label: 'Storyboard Generator',
    group: 'ai',
    icon: 'LayoutGrid',
    accent: 'aqua',
    description: 'Chia kịch bản thành storyboard nhiều khung hình.',
    inputs: [IN('in', 'Script', true)],
    outputs: [OUT('out', 'Storyboard')],
    fields: [
      { key: 'frameCount', type: 'chips', label: 'Số khung', options: ['4', '6', '8', '10'], default: '6' },
      { key: 'aspectRatio', type: 'chips', label: 'Tỉ lệ khung', options: ['9:16', '16:9', '1:1', '4:5'], default: '9:16' },
      { key: 'includePrompt', type: 'toggle', label: 'Tạo prompt ảnh riêng cho từng khung', default: true },
    ],
    actions: [
      { id: 'run', label: 'Generate Storyboard', icon: 'LayoutGrid', kind: 'run' },
      { id: 'regen', label: 'Regenerate', icon: 'RefreshCw', kind: 'run' },
      { id: 'copy', label: 'Copy Storyboard Prompt', icon: 'Copy', kind: 'copy', field: 'Frames' },
    ],
    run: ({ ctx, config }) => {
      const board = buildStoryboard(ctx.script, {
        frameCount: config.frameCount,
        aspectRatio: config.aspectRatio || ctx.aspectRatio,
      })
      return {
        result: {
          'Frame count': board.frameCount,
          'Aspect ratio': board.aspectRatio,
          Frames: board.frames.map(
            (f) => `#${f.index} ${f.title} | ${f.shotSize} | ${f.camera} | ${f.description}${config.includePrompt !== false ? '\n   ↳ prompt: ' + f.imagePrompt : ''}`,
          ),
          'Continuity rules': board.continuity,
        },
        patch: { storyboard: board },
      }
    },
  },

  videoPromptNode: {
    type: 'videoPromptNode',
    label: 'Video Prompt Node',
    group: 'ai',
    icon: 'Clapperboard',
    accent: 'aqua',
    description: 'Tạo prompt chuyển ảnh / storyboard thành video.',
    inputs: [IN('in', 'Storyboard / Script', true)],
    outputs: [OUT('out', 'Video Prompt')],
    fields: [
      {
        key: 'mode',
        type: 'select',
        label: 'Chế độ',
        options: [
          'Image to Video',
          'Storyboard to Video',
          'Start Frame to End Frame',
          'Before / After Transformation',
          'Fashion Lookbook Motion',
          'Product Commercial Motion',
          'Time-lapse Motion',
          'Static Camera Motion',
          'Cinematic Motion',
        ],
        default: 'Image to Video',
      },
      {
        key: 'flags',
        type: 'multiselect',
        label: 'Tuỳ chọn',
        options: ['Camera tĩnh', 'Camera chuyển động nhẹ', 'Không lời thoại', 'Có lời thoại', 'Không nhạc nền', 'Có âm thanh môi trường', 'Chuyển động chậm', 'Chuyển động tự nhiên', 'Tua nhanh'],
        default: ['Camera chuyển động nhẹ', 'Chuyển động tự nhiên', 'Có âm thanh môi trường'],
      },
      { key: 'strictConsistency', type: 'toggle', label: 'Bắt buộc giữ nhân vật / sản phẩm nhất quán', default: true },
    ],
    actions: [
      { id: 'run', label: 'Generate Video Prompt', icon: 'Clapperboard', kind: 'run' },
      { id: 'copy', label: 'Copy Prompt', icon: 'Copy', kind: 'copy', field: 'Full video prompt' },
    ],
    run: ({ ctx, config }) => {
      const vp = buildVideoPrompt(ctx, { mode: config.mode, flags: config.flags || [] })
      const rules = config.strictConsistency !== false ? buildConsistencyRules(ctx) : []
      return {
        result: {
          Mode: vp.mode,
          'Full video prompt': vp.main,
          'Scene motion': vp.sceneMotion.map((s) => `Cảnh ${s.index} [${s.timecode}] ${s.cameraMovement} — ${s.subjectMovement}`),
          'Camera movement': vp.cameraMovement,
          'Character movement': vp.characterMovement,
          Timing: vp.timing,
          'Anti-error rules': vp.antiError,
          'Consistency rules': rules,
        },
        patch: { videoPrompt: vp, consistency: rules },
      }
    },
  },

  dialogueGenerator: {
    type: 'dialogueGenerator',
    label: 'Dialogue Generator',
    group: 'ai',
    icon: 'MessagesSquare',
    accent: 'aqua',
    description: 'Tạo lời thoại / voice-over theo từng cảnh.',
    inputs: [IN('in', 'Script', true)],
    outputs: [OUT('out', 'Dialogue')],
    fields: [
      {
        key: 'voice',
        type: 'select',
        label: 'Giọng đọc',
        options: ['Nam miền Bắc', 'Nữ miền Bắc', 'Nam miền Nam', 'Nữ miền Nam', 'Giọng quảng cáo', 'Giọng kể chuyện', 'Giọng hài hước', 'Giọng chuyên gia', 'Không lời thoại'],
        default: 'Nữ miền Bắc',
      },
      { key: 'speed', type: 'chips', label: 'Tốc độ', options: ['Chậm', 'Vừa', 'Nhanh'], default: 'Vừa' },
      { key: 'speaker', type: 'text', label: 'Nhân vật nói', placeholder: 'Voice-over / Nhân vật chính' },
    ],
    actions: [
      { id: 'run', label: 'Generate Dialogue', icon: 'MessagesSquare', kind: 'run' },
      { id: 'copy', label: 'Copy Voice-over', icon: 'Copy', kind: 'copy', field: 'Voice-over' },
    ],
    run: ({ ctx, config }) => {
      const d = buildDialogue(ctx.script, config)
      return {
        result: {
          Voice: d.voice,
          Speed: d.speed,
          Note: d.note,
          Lines: d.lines.map((l) => `[${l.timecode}] ${l.speaker}: ${l.text} (${l.direction})`),
          'Voice-over': d.vo,
        },
        patch: { dialogue: d },
      }
    },
  },

  negativePromptNode: {
    type: 'negativePromptNode',
    label: 'Negative Prompt Node',
    group: 'ai',
    icon: 'ShieldAlert',
    accent: 'aqua',
    description: 'Tạo negative prompt chống lỗi ảnh & video.',
    inputs: [IN('in', 'Context', true)],
    outputs: [OUT('out', 'Negative Prompt')],
    fields: [
      { key: 'groups', type: 'multiselect', label: 'Nhóm lỗi cần chặn', options: Object.keys(NEGATIVE_GROUPS), default: Object.keys(NEGATIVE_GROUPS) },
      { key: 'custom', type: 'textarea', label: 'Negative bổ sung', rows: 2, placeholder: 'ví dụ: no text on packaging' },
    ],
    actions: [
      { id: 'run', label: 'Generate Negative Prompt', icon: 'ShieldAlert', kind: 'run' },
      { id: 'copy', label: 'Copy Negative Prompt', icon: 'Copy', kind: 'copy', field: 'Negative prompt' },
    ],
    run: ({ ctx, config }) => {
      const neg = buildNegativePrompt(ctx, { groups: config.groups, custom: config.custom })
      return {
        result: {
          'Negative prompt': neg.full,
          Groups: neg.groups,
          'Identity lock': neg.identityLock,
          'Product lock': neg.productLock,
          'Background lock': neg.backgroundLock,
          'Motion stability': neg.motionStability,
        },
        patch: { negative: neg },
      }
    },
  },

  styleGenerator: {
    type: 'styleGenerator',
    label: 'Style Node',
    group: 'ai',
    icon: 'Palette',
    accent: 'aqua',
    description: 'Chọn phong cách hình ảnh / video chủ đạo.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Style')],
    fields: [
      { key: 'style', type: 'select', label: 'Phong cách', options: Object.keys(STYLE_PROMPTS), default: 'Cinematic' },
      { key: 'mood', type: 'chips', label: 'Tâm trạng', options: ['Sang trọng', 'Ấm áp', 'Năng động', 'Bí ẩn', 'Tươi sáng', 'Cảm xúc'], default: 'Sang trọng' },
      { key: 'palette', type: 'select', label: 'Bảng màu', options: ['Trung tính ấm', 'Đơn sắc', 'Pastel', 'Teal & Orange', 'Tương phản cao', 'Đen & Vàng kim'], default: 'Trung tính ấm' },
    ],
    actions: [{ id: 'run', label: 'Apply Style', icon: 'Palette', kind: 'run' }],
    run: ({ config }) => {
      const p = buildStyleProfile(config)
      return {
        result: { Style: p.style, Mood: p.mood, Palette: p.palette, 'Style prompt': p.stylePrompt, Grading: p.grading, Note: p.referenceNote },
        patch: { style: p.style, styleProfile: p },
      }
    },
  },

  /* ============================== CONTROL =============================== */
  condition: {
    type: 'condition',
    label: 'Condition Node',
    group: 'control',
    icon: 'GitBranch',
    accent: 'ember',
    description: 'Rẽ nhánh workflow theo điều kiện dữ liệu.',
    inputs: [IN('in', 'Data', true)],
    outputs: [OUT('true', 'True'), OUT('false', 'False')],
    fields: [
      {
        key: 'condition',
        type: 'select',
        label: 'Điều kiện',
        options: ['Có ảnh nhân vật', 'Có ảnh sản phẩm', 'Bật lời thoại', 'Có kịch bản', 'Có storyboard', 'Luôn đúng'],
        default: 'Có ảnh nhân vật',
      },
      { key: 'note', type: 'text', label: 'Ghi chú', placeholder: 'VD: nếu có nhân vật thì khoá khuôn mặt' },
    ],
    actions: [{ id: 'run', label: 'Evaluate', icon: 'GitBranch', kind: 'run' }],
    run: ({ ctx, config }) => {
      const map = {
        'Có ảnh nhân vật': !!(ctx.hasCharacterImage || ctx.character),
        'Có ảnh sản phẩm': !!(ctx.hasProductImage || ctx.product),
        'Bật lời thoại': !!(ctx.dialogue || ctx.script?.scenes?.some((s) => s.dialogue)),
        'Có kịch bản': !!ctx.script,
        'Có storyboard': !!ctx.storyboard,
        'Luôn đúng': true,
      }
      const value = map[config.condition] ?? true
      return {
        result: { Condition: config.condition, Value: value ? 'TRUE' : 'FALSE', Branch: value ? 'true' : 'false', Note: config.note || '—' },
        patch: { conditionResult: value },
        activeBranch: value ? 'true' : 'false',
      }
    },
  },

  merge: {
    type: 'merge',
    label: 'Merge Node',
    group: 'control',
    icon: 'Merge',
    accent: 'ember',
    description: 'Gộp nhiều luồng dữ liệu thành một.',
    inputs: [IN('a', 'Input A'), IN('b', 'Input B'), IN('c', 'Input C')],
    outputs: [OUT('out', 'Merged')],
    fields: [{ key: 'strategy', type: 'chips', label: 'Cách gộp', options: ['Ghi đè', 'Ưu tiên đầu tiên'], default: 'Ghi đè' }],
    actions: [{ id: 'run', label: 'Merge', icon: 'Merge', kind: 'run' }],
    run: ({ ctx, inputs }) => ({
      result: { 'Merged sources': inputs.length, Keys: Object.keys(ctx).slice(0, 24) },
      patch: {},
    }),
  },

  split: {
    type: 'split',
    label: 'Split Node',
    group: 'control',
    icon: 'Split',
    accent: 'ember',
    description: 'Tách dữ liệu thành nhiều nhánh song song.',
    inputs: [IN('in', 'Data', true)],
    outputs: [OUT('a', 'Branch A'), OUT('b', 'Branch B'), OUT('c', 'Branch C')],
    fields: [{ key: 'branches', type: 'chips', label: 'Số nhánh', options: ['2', '3'], default: '2' }],
    actions: [{ id: 'run', label: 'Split', icon: 'Split', kind: 'run' }],
    run: ({ config }) => ({ result: { Branches: config.branches || '2', Note: 'Dữ liệu được nhân bản sang các nhánh.' }, patch: {} }),
  },

  loop: {
    type: 'loop',
    label: 'Loop Node',
    group: 'control',
    icon: 'Repeat',
    accent: 'ember',
    description: 'Lặp xử lý theo danh sách cảnh / khung hình.',
    inputs: [IN('in', 'List', true)],
    outputs: [OUT('out', 'Iterations')],
    fields: [
      { key: 'source', type: 'select', label: 'Lặp theo', options: ['Cảnh trong kịch bản', 'Khung storyboard', 'Số lần cố định'], default: 'Cảnh trong kịch bản' },
      { key: 'times', type: 'number', label: 'Số lần lặp', min: 1, max: 50, default: 3 },
    ],
    actions: [{ id: 'run', label: 'Run Loop', icon: 'Repeat', kind: 'run' }],
    run: ({ ctx, config }) => {
      const list =
        config.source === 'Khung storyboard'
          ? ctx.storyboard?.frames || []
          : config.source === 'Cảnh trong kịch bản'
            ? ctx.script?.scenes || []
            : Array.from({ length: config.times || 3 }, (_, i) => ({ index: i + 1 }))
      return { result: { Iterations: list.length, Items: list.map((i) => `#${i.index} ${i.name || i.title || ''}`) }, patch: { loopCount: list.length } }
    },
  },

  delay: {
    type: 'delay',
    label: 'Delay Node',
    group: 'control',
    icon: 'Timer',
    accent: 'ember',
    description: 'Chờ một khoảng thời gian trước khi chạy tiếp.',
    inputs: [IN('in', 'Data', true)],
    outputs: [OUT('out', 'Data')],
    fields: [{ key: 'ms', type: 'number', label: 'Thời gian chờ (ms)', min: 0, max: 10000, step: 100, default: 600 }],
    actions: [{ id: 'run', label: 'Test Delay', icon: 'Timer', kind: 'run' }],
    delayMs: (config) => config.ms ?? 600,
    run: ({ config }) => ({ result: { Waited: `${config.ms ?? 600} ms` }, patch: {} }),
  },

  validate: {
    type: 'validate',
    label: 'Validate Node',
    group: 'control',
    icon: 'ShieldCheck',
    accent: 'ember',
    description: 'Kiểm tra dữ liệu bắt buộc trước khi chạy tiếp.',
    inputs: [IN('in', 'Data', true)],
    outputs: [OUT('out', 'Validated')],
    fields: [
      {
        key: 'require',
        type: 'multiselect',
        label: 'Bắt buộc phải có',
        options: ['Ý tưởng', 'Hình ảnh', 'Phong cách', 'Kịch bản', 'Tỉ lệ khung', 'Thời lượng'],
        default: ['Ý tưởng', 'Phong cách'],
      },
      { key: 'strict', type: 'toggle', label: 'Dừng workflow nếu thiếu', default: false },
    ],
    actions: [{ id: 'run', label: 'Validate', icon: 'ShieldCheck', kind: 'run' }],
    run: ({ ctx, config }) => {
      const checks = {
        'Ý tưởng': !!ctx.idea,
        'Hình ảnh': !!(ctx.images?.length || ctx.analysis),
        'Phong cách': !!ctx.style,
        'Kịch bản': !!ctx.script,
        'Tỉ lệ khung': !!ctx.aspectRatio,
        'Thời lượng': !!ctx.duration,
      }
      const required = config.require?.length ? config.require : ['Ý tưởng']
      const missing = required.filter((r) => !checks[r])
      if (missing.length && config.strict) throw new Error(`Validate thất bại — thiếu: ${missing.join(', ')}`)
      return {
        result: { Checked: required, Missing: missing.length ? missing : ['Không thiếu gì'], Status: missing.length ? 'CẢNH BÁO' : 'HỢP LỆ' },
        patch: { validation: { required, missing } },
        warning: missing.length ? `Thiếu dữ liệu: ${missing.join(', ')}` : null,
      }
    },
  },

  /* =============================== OUTPUT =============================== */
  preview: {
    type: 'preview',
    label: 'Preview Node',
    group: 'output',
    icon: 'Eye',
    accent: 'green',
    description: 'Xem nhanh dữ liệu tại một điểm trong workflow.',
    inputs: [IN('in', 'Any', true)],
    outputs: [OUT('out', 'Pass-through')],
    fields: [
      { key: 'view', type: 'select', label: 'Xem phần', options: ['Tất cả', 'Kịch bản', 'Prompt', 'Storyboard', 'Negative', 'Lời thoại'], default: 'Tất cả' },
    ],
    actions: [{ id: 'run', label: 'Refresh Preview', icon: 'RefreshCw', kind: 'run' }],
    run: ({ ctx, config }) => {
      const map = {
        'Kịch bản': ctx.script,
        Prompt: ctx.prompt,
        Storyboard: ctx.storyboard,
        Negative: ctx.negative,
        'Lời thoại': ctx.dialogue,
      }
      const data = config.view === 'Tất cả' ? ctx : map[config.view]
      return { result: { View: config.view, Data: data ? JSON.stringify(data, null, 2).slice(0, 4000) : 'Chưa có dữ liệu' }, patch: {} }
    },
  },

  exportNode: {
    type: 'exportNode',
    label: 'Export Node',
    group: 'output',
    icon: 'Rocket',
    accent: 'green',
    description: 'Tổng hợp toàn bộ workflow thành kết quả cuối cùng.',
    inputs: [IN('in', 'Final Data', true)],
    outputs: [],
    fields: [
      { key: 'name', type: 'text', label: 'Tên workflow', placeholder: 'AI Video Script Pack' },
      {
        key: 'scope',
        type: 'select',
        label: 'Phạm vi xuất',
        options: ['Toàn bộ workflow', 'Chỉ kịch bản', 'Chỉ prompt ảnh', 'Chỉ prompt video', 'Chỉ negative prompt'],
        default: 'Toàn bộ workflow',
      },
      { key: 'formats', type: 'multiselect', label: 'Định dạng', options: ['TXT', 'JSON', 'Markdown', 'Prompt Pack'], default: ['TXT', 'JSON', 'Markdown'] },
    ],
    actions: [
      { id: 'run', label: 'Build Final Result', icon: 'Rocket', kind: 'run' },
      { id: 'copy', label: 'Copy Result', icon: 'Copy', kind: 'copy', field: 'Summary' },
    ],
    isTerminal: true,
    run: ({ ctx, config }) => ({
      result: {
        Workflow: config.name || 'AI Video Script Pack',
        Scope: config.scope || 'Toàn bộ workflow',
        Formats: config.formats || ['TXT', 'JSON'],
        Summary: [
          `Tên video: ${ctx.script?.title || ctx.title || '—'}`,
          `Phong cách: ${ctx.style || '—'} | Tỉ lệ: ${ctx.aspectRatio || '—'} | Thời lượng: ${ctx.duration || '—'}`,
          `Số cảnh: ${ctx.script?.scenes?.length || 0} | Storyboard: ${ctx.storyboard?.frameCount || 0} khung`,
          `Negative prompt: ${ctx.negative ? 'đã tạo' : 'chưa tạo'} | Lời thoại: ${ctx.dialogue?.lines?.length || 0} dòng`,
        ].join('\n'),
      },
      patch: { exportConfig: { ...config }, isFinal: true },
    }),
  },

  exportText: {
    type: 'exportText',
    label: 'Export Text Node',
    group: 'output',
    icon: 'FileDown',
    accent: 'green',
    description: 'Xuất kết quả dạng văn bản thuần.',
    inputs: [IN('in', 'Data', true)],
    outputs: [],
    fields: [{ key: 'filename', type: 'text', label: 'Tên file', default: 'video-script.txt' }],
    actions: [{ id: 'run', label: 'Build TXT', icon: 'FileDown', kind: 'run' }],
    isTerminal: true,
    run: ({ ctx, config }) => ({
      result: { File: config.filename || 'video-script.txt', Lines: (ctx.script?.scenes?.length || 0) * 6 + 20 },
      patch: { exportText: true },
    }),
  },

  exportJson: {
    type: 'exportJson',
    label: 'Export JSON Node',
    group: 'output',
    icon: 'Braces',
    accent: 'green',
    description: 'Xuất toàn bộ dữ liệu workflow dạng JSON.',
    inputs: [IN('in', 'Data', true)],
    outputs: [],
    fields: [
      { key: 'filename', type: 'text', label: 'Tên file', default: 'workflow-result.json' },
      { key: 'pretty', type: 'toggle', label: 'Format đẹp', default: true },
    ],
    actions: [{ id: 'run', label: 'Build JSON', icon: 'Braces', kind: 'run' }],
    isTerminal: true,
    run: ({ ctx, config }) => ({
      result: { File: config.filename || 'workflow-result.json', Size: `${JSON.stringify(ctx).length} ký tự` },
      patch: { exportJson: true },
    }),
  },

  copyResult: {
    type: 'copyResult',
    label: 'Copy Result Node',
    group: 'output',
    icon: 'Copy',
    accent: 'green',
    description: 'Chuẩn bị bản copy hoàn chỉnh để dán đi nơi khác.',
    inputs: [IN('in', 'Data', true)],
    outputs: [],
    fields: [{ key: 'target', type: 'chips', label: 'Nội dung copy', options: ['Toàn bộ', 'Kịch bản', 'Prompt', 'Negative'], default: 'Toàn bộ' }],
    actions: [{ id: 'run', label: 'Prepare Copy', icon: 'Copy', kind: 'run' }],
    isTerminal: true,
    run: ({ config }) => ({ result: { Target: config.target || 'Toàn bộ', Status: 'Sẵn sàng copy ở Bottom Panel' }, patch: {} }),
  },

  downloadResult: {
    type: 'downloadResult',
    label: 'Download Result Node',
    group: 'output',
    icon: 'Download',
    accent: 'green',
    description: 'Tải kết quả về máy theo định dạng đã chọn.',
    inputs: [IN('in', 'Data', true)],
    outputs: [],
    fields: [{ key: 'format', type: 'chips', label: 'Định dạng', options: ['TXT', 'JSON', 'MD'], default: 'MD' }],
    actions: [{ id: 'run', label: 'Prepare Download', icon: 'Download', kind: 'run' }],
    isTerminal: true,
    run: ({ config }) => ({ result: { Format: config.format || 'MD', Status: 'Sẵn sàng tải ở Bottom Panel' }, patch: {} }),
  },

  /* ============================== UTILITY =============================== */
  aspectRatio: {
    type: 'aspectRatio',
    label: 'Aspect Ratio Node',
    group: 'utility',
    icon: 'RectangleHorizontal',
    accent: 'pink',
    description: 'Chọn tỉ lệ khung hình cho toàn workflow.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Ratio')],
    fields: [{ key: 'aspectRatio', type: 'chips', label: 'Tỉ lệ', options: ['9:16', '16:9', '1:1', '4:5', '21:9'], default: '9:16' }],
    actions: [{ id: 'run', label: 'Apply', icon: 'Check', kind: 'run' }],
    run: ({ config }) => ({ result: { 'Aspect ratio': config.aspectRatio || '9:16' }, patch: { aspectRatio: config.aspectRatio || '9:16' } }),
  },

  duration: {
    type: 'duration',
    label: 'Duration Node',
    group: 'utility',
    icon: 'Clock',
    accent: 'pink',
    description: 'Chọn thời lượng video.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Duration')],
    fields: [
      { key: 'duration', type: 'chips', label: 'Thời lượng', options: ['5 giây', '8 giây', '10 giây', '15 giây', '30 giây', '60 giây', 'Tuỳ chỉnh'], default: '15 giây' },
      { key: 'custom', type: 'number', label: 'Tuỳ chỉnh (giây)', min: 3, max: 600, default: 20 },
    ],
    actions: [{ id: 'run', label: 'Apply', icon: 'Check', kind: 'run' }],
    run: ({ config }) => {
      const d = config.duration === 'Tuỳ chỉnh' ? `${config.custom || 20} giây` : config.duration || '15 giây'
      return { result: { Duration: d, Seconds: durationToSeconds(d) }, patch: { duration: d } }
    },
  },

  language: {
    type: 'language',
    label: 'Language Node',
    group: 'utility',
    icon: 'Languages',
    accent: 'pink',
    description: 'Ngôn ngữ đầu ra của kịch bản.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Language')],
    fields: [{ key: 'language', type: 'chips', label: 'Ngôn ngữ', options: ['Tiếng Việt', 'Tiếng Anh', 'Tiếng Trung', 'Song ngữ Việt - Anh'], default: 'Tiếng Việt' }],
    actions: [{ id: 'run', label: 'Apply', icon: 'Check', kind: 'run' }],
    run: ({ config }) => ({ result: { Language: config.language || 'Tiếng Việt' }, patch: { language: config.language || 'Tiếng Việt' } }),
  },

  tone: {
    type: 'tone',
    label: 'Tone Node',
    group: 'utility',
    icon: 'AudioLines',
    accent: 'pink',
    description: 'Giọng điệu nội dung.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Tone')],
    fields: [
      { key: 'tone', type: 'select', label: 'Tone', options: ['Chuyên nghiệp', 'Thân mật', 'Hài hước', 'Truyền cảm hứng', 'Sang trọng', 'Gấp gáp / Khan hiếm', 'Chuyên gia'], default: 'Chuyên nghiệp' },
    ],
    actions: [{ id: 'run', label: 'Apply', icon: 'Check', kind: 'run' }],
    run: ({ config }) => ({ result: { Tone: config.tone || 'Chuyên nghiệp' }, patch: { tone: config.tone || 'Chuyên nghiệp' } }),
  },

  cameraStyle: {
    type: 'cameraStyle',
    label: 'Camera Style Node',
    group: 'utility',
    icon: 'Camera',
    accent: 'pink',
    description: 'Phong cách máy quay.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Camera')],
    fields: [
      {
        key: 'camera',
        type: 'select',
        label: 'Camera',
        options: ['Static Camera', 'Handheld', 'Slow Push-in', 'Cinematic Dolly', 'Close-up', 'Medium Shot', 'Wide Shot', 'Selfie Style', 'Mirror Selfie', 'Product Macro Shot'],
        default: 'Slow Push-in',
      },
    ],
    actions: [{ id: 'run', label: 'Apply', icon: 'Check', kind: 'run' }],
    run: ({ config }) => ({ result: { Camera: config.camera || 'Slow Push-in' }, patch: { camera: config.camera || 'Slow Push-in' } }),
  },

  motionStyle: {
    type: 'motionStyle',
    label: 'Motion Style Node',
    group: 'utility',
    icon: 'Move3d',
    accent: 'pink',
    description: 'Kiểu chuyển động chủ đạo.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Motion')],
    fields: [
      {
        key: 'motion',
        type: 'select',
        label: 'Motion',
        options: ['Natural Movement', 'Slow Motion', 'Fast-forward Time-lapse', 'Fashion Pose Change', 'Product Rotation', 'Transformation', 'Before / After', 'Smooth Cinematic Motion'],
        default: 'Smooth Cinematic Motion',
      },
    ],
    actions: [{ id: 'run', label: 'Apply', icon: 'Check', kind: 'run' }],
    run: ({ config }) => ({ result: { Motion: config.motion || 'Smooth Cinematic Motion' }, patch: { motion: config.motion || 'Smooth Cinematic Motion' } }),
  },

  consistencyRule: {
    type: 'consistencyRule',
    label: 'Consistency Rule Node',
    group: 'utility',
    icon: 'Lock',
    accent: 'pink',
    description: 'Quy tắc khoá nhân vật / sản phẩm / bối cảnh.',
    inputs: [IN('in', 'Context')],
    outputs: [OUT('out', 'Rules')],
    fields: [
      {
        key: 'locks',
        type: 'multiselect',
        label: 'Khoá nhất quán',
        options: ['Khuôn mặt nhân vật', 'Kiểu tóc', 'Trang phục', 'Sản phẩm', 'Logo', 'Bối cảnh', 'Ánh sáng', 'Bảng màu'],
        default: ['Khuôn mặt nhân vật', 'Trang phục', 'Sản phẩm', 'Ánh sáng'],
      },
      { key: 'extra', type: 'textarea', label: 'Quy tắc bổ sung', rows: 2 },
    ],
    actions: [{ id: 'run', label: 'Apply Rules', icon: 'Lock', kind: 'run' }],
    run: ({ ctx, config }) => {
      const locks = config.locks || []
      const rules = [
        ...locks.map((l) => `Giữ nguyên tuyệt đối: ${l.toLowerCase()} ở mọi cảnh và mọi frame.`),
        ...buildConsistencyRules(ctx),
        ...(config.extra ? [config.extra] : []),
      ]
      return { result: { Locks: locks, Rules: rules }, patch: { consistency: rules } }
    },
  },
}

/* ------------------------------------------------------------- utilities */

export const NODE_LIST = Object.values(NODE_DEFS)

export const getDef = (type) => NODE_DEFS[type] || null

export const defaultConfig = (type) => {
  const def = getDef(type)
  if (!def) return {}
  const cfg = {}
  def.fields?.forEach((f) => {
    if (f.default !== undefined) cfg[f.key] = Array.isArray(f.default) ? [...f.default] : f.default
    else if (f.type === 'toggle') cfg[f.key] = false
    else if (f.type === 'multiselect') cfg[f.key] = []
    else cfg[f.key] = ''
  })
  return cfg
}

export const groupNodes = (query = '') => {
  const q = query.trim().toLowerCase()
  return GROUPS.map((g) => ({
    ...g,
    nodes: NODE_LIST.filter(
      (n) => n.group === g.id && (!q || n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)),
    ),
  })).filter((g) => g.nodes.length)
}

export const configSummary = (type, config = {}) => {
  const def = getDef(type)
  if (!def) return ''
  const keys = def.fields?.slice(0, 3).map((f) => f.key) || []
  return summarize(config, keys)
}
