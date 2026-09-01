/**
 * templates.js — Workflow mẫu dựng sẵn (đã nối dây) để dùng nhanh.
 */
import { defaultConfig, getDef } from './nodeLibrary.js'

export const makeNode = (id, type, position, config = {}, extra = {}) => {
  const def = getDef(type)
  return {
    id,
    type: 'workflowNode',
    position,
    data: {
      type,
      label: extra.label || def?.label || type,
      description: extra.description || def?.description || '',
      config: { ...defaultConfig(type), ...config },
      status: 'idle',
      collapsed: false,
      disabled: false,
      result: null,
      note: extra.note || '',
    },
  }
}

const edge = (source, target, sourceHandle = 'out', targetHandle = 'in') => ({
  id: `e-${source}-${sourceHandle}-${target}-${targetHandle}`,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'flowEdge',
  animated: false,
})

/* --------------------------------------------------- TEMPLATE: mặc định */

export function defaultWorkflow() {
  const nodes = [
    makeNode('n_text', 'textInput', { x: -40, y: 40 }, {
      idea: 'Quảng cáo serum dưỡng sáng da cho nữ văn phòng 25-32 tuổi, thông điệp: làn da rạng rỡ chỉ sau 7 ngày.',
      title: 'Rạng rỡ sau 7 ngày',
      keywords: 'serum, vitamin C, sáng da, tự tin',
    }),
    makeNode('n_image', 'imageInput', { x: -40, y: 300 }, {
      imageType: 'Nhân vật',
      description: 'Nữ model 27 tuổi, tóc dài nâu, da sáng, blazer be, biểu cảm tự tin và thân thiện.',
    }),
    makeNode('n_analysis', 'imageAnalysis', { x: 320, y: 300 }),
    makeNode('n_prompt', 'promptGenerator', { x: 680, y: 150 }, { promptType: 'Prompt tạo ảnh', detail: 'Rất chi tiết' }),
    makeNode('n_ratio', 'aspectRatio', { x: 680, y: 470 }, { aspectRatio: '9:16' }),
    makeNode('n_style', 'styleGenerator', { x: 1040, y: 150 }, { style: 'Luxury Commercial', mood: 'Sang trọng', palette: 'Trung tính ấm' }),
    makeNode('n_script', 'scriptGenerator', { x: 1400, y: 300 }, {
      scriptStyle: 'Quảng cáo TVC',
      sceneCount: '6',
      duration: '15 giây',
      dialogue: true,
      language: 'Tiếng Việt',
    }),
    makeNode('n_board', 'storyboardGenerator', { x: 1760, y: 160 }, { frameCount: '6', aspectRatio: '9:16' }),
    makeNode('n_dialog', 'dialogueGenerator', { x: 1760, y: 470 }, { voice: 'Nữ miền Bắc', speed: 'Vừa', speaker: 'Voice-over' }),
    makeNode('n_video', 'videoPromptNode', { x: 2120, y: 160 }, { mode: 'Image to Video' }),
    makeNode('n_negative', 'negativePromptNode', { x: 2480, y: 300 }),
    makeNode('n_export', 'exportNode', { x: 2840, y: 300 }, { name: 'AI Video Script Pack', scope: 'Toàn bộ workflow' }),
  ]

  const edges = [
    edge('n_image', 'n_analysis'),
    edge('n_analysis', 'n_prompt'),
    edge('n_text', 'n_prompt'),
    edge('n_prompt', 'n_style'),
    edge('n_style', 'n_script'),
    edge('n_ratio', 'n_script'),
    edge('n_script', 'n_board'),
    edge('n_script', 'n_dialog'),
    edge('n_board', 'n_video'),
    edge('n_video', 'n_negative'),
    edge('n_dialog', 'n_negative'),
    edge('n_negative', 'n_export'),
  ]

  return { name: 'Default AI Video Workflow', nodes, edges }
}

/* --------------------------------------------------- TEMPLATE: TikTok UGC */

function tiktokUgc() {
  const nodes = [
    makeNode('t_text', 'textInput', { x: 0, y: 80 }, { idea: 'UGC review son kem lì lâu trôi, quay bằng điện thoại, phong cách đời thường.' }),
    makeNode('t_product', 'productInfo', { x: 0, y: 320 }, { productName: 'Son kem lì Velvet', brand: 'Rosé Lab', usp: 'Lâu trôi 12h\nKhông khô môi\n8 tông màu' }),
    makeNode('t_style', 'styleGenerator', { x: 360, y: 200 }, { style: 'UGC', mood: 'Năng động', palette: 'Tương phản cao' }),
    makeNode('t_ratio', 'aspectRatio', { x: 360, y: 420 }, { aspectRatio: '9:16' }),
    makeNode('t_script', 'scriptGenerator', { x: 720, y: 260 }, { scriptStyle: 'UGC quảng cáo', sceneCount: '4', duration: '30 giây', language: 'Tiếng Việt' }),
    makeNode('t_dialog', 'dialogueGenerator', { x: 1080, y: 400 }, { voice: 'Nữ miền Nam', speed: 'Nhanh' }),
    makeNode('t_video', 'videoPromptNode', { x: 1080, y: 160 }, { mode: 'Image to Video', flags: ['Camera tĩnh', 'Có lời thoại', 'Chuyển động tự nhiên'] }),
    makeNode('t_neg', 'negativePromptNode', { x: 1440, y: 260 }),
    makeNode('t_export', 'exportNode', { x: 1800, y: 260 }, { name: 'TikTok UGC Pack' }),
  ]
  const edges = [
    edge('t_text', 't_style'),
    edge('t_product', 't_style'),
    edge('t_style', 't_script'),
    edge('t_ratio', 't_script'),
    edge('t_script', 't_video'),
    edge('t_script', 't_dialog'),
    edge('t_video', 't_neg'),
    edge('t_dialog', 't_neg'),
    edge('t_neg', 't_export'),
  ]
  return { name: 'TikTok Viral UGC', nodes, edges }
}

/* ------------------------------------------- TEMPLATE: Product commercial */

function productCommercial() {
  const nodes = [
    makeNode('p_img', 'imageInput', { x: 0, y: 120 }, { imageType: 'Sản phẩm', description: 'Chai nước hoa thuỷ tinh vát cạnh, nắp vàng kim, nhãn tối giản.' }),
    makeNode('p_info', 'productInfo', { x: 0, y: 380 }, { productName: 'Nước hoa Aurum', brand: 'Aurum Paris', usp: 'Hương gỗ ấm\nLưu hương 10h' }),
    makeNode('p_analysis', 'imageAnalysis', { x: 360, y: 120 }, { depth: 'Chuyên sâu' }),
    makeNode('p_style', 'styleGenerator', { x: 720, y: 120 }, { style: 'High-end TVC', mood: 'Sang trọng', palette: 'Đen & Vàng kim' }),
    makeNode('p_cam', 'cameraStyle', { x: 720, y: 340 }, { camera: 'Product Macro Shot' }),
    makeNode('p_motion', 'motionStyle', { x: 720, y: 500 }, { motion: 'Product Rotation' }),
    makeNode('p_prompt', 'promptGenerator', { x: 1080, y: 220 }, { promptType: 'Prompt quảng cáo sản phẩm', detail: 'Siêu chi tiết' }),
    makeNode('p_script', 'scriptGenerator', { x: 1440, y: 220 }, { scriptStyle: 'Sang trọng cao cấp', sceneCount: '6', duration: '30 giây' }),
    makeNode('p_board', 'storyboardGenerator', { x: 1800, y: 120 }, { frameCount: '8', aspectRatio: '16:9' }),
    makeNode('p_video', 'videoPromptNode', { x: 2160, y: 120 }, { mode: 'Product Commercial Motion' }),
    makeNode('p_lock', 'consistencyRule', { x: 2160, y: 380 }),
    makeNode('p_neg', 'negativePromptNode', { x: 2520, y: 220 }),
    makeNode('p_export', 'exportNode', { x: 2880, y: 220 }, { name: 'Luxury Product TVC' }),
  ]
  const edges = [
    edge('p_img', 'p_analysis'),
    edge('p_info', 'p_prompt'),
    edge('p_analysis', 'p_style'),
    edge('p_style', 'p_prompt'),
    edge('p_cam', 'p_prompt'),
    edge('p_motion', 'p_prompt'),
    edge('p_prompt', 'p_script'),
    edge('p_script', 'p_board'),
    edge('p_board', 'p_video'),
    edge('p_video', 'p_lock'),
    edge('p_lock', 'p_neg'),
    edge('p_neg', 'p_export'),
  ]
  return { name: 'Luxury Product Commercial', nodes, edges }
}

/* ------------------------------------------------ TEMPLATE: Before/After */

function beforeAfter() {
  const nodes = [
    makeNode('b_before', 'imageInput', { x: 0, y: 60 }, { imageType: 'Nhân vật', description: 'Ảnh "trước": da xỉn màu, tóc rối, ánh sáng phẳng.' }, { label: 'Ảnh BEFORE' }),
    makeNode('b_after', 'imageInput', { x: 0, y: 340 }, { imageType: 'Nhân vật', description: 'Ảnh "sau": da sáng mịn, tóc gọn, ánh sáng đẹp.' }, { label: 'Ảnh AFTER' }),
    makeNode('b_merge', 'merge', { x: 360, y: 200 }),
    makeNode('b_cond', 'condition', { x: 720, y: 200 }, { condition: 'Có ảnh nhân vật', note: 'Nếu có nhân vật thì khoá khuôn mặt' }),
    makeNode('b_style', 'styleGenerator', { x: 1080, y: 100 }, { style: 'Photorealistic', mood: 'Tươi sáng' }),
    makeNode('b_script', 'scriptGenerator', { x: 1440, y: 100 }, { scriptStyle: 'Before / After', sceneCount: '4', duration: '15 giây' }),
    makeNode('b_video', 'videoPromptNode', { x: 1800, y: 100 }, { mode: 'Before / After Transformation' }),
    makeNode('b_neg', 'negativePromptNode', { x: 2160, y: 100 }),
    makeNode('b_preview', 'preview', { x: 1080, y: 380 }, { view: 'Tất cả' }),
    makeNode('b_export', 'exportNode', { x: 2520, y: 100 }, { name: 'Before After Pack' }),
  ]
  const edges = [
    edge('b_before', 'b_merge', 'out', 'a'),
    edge('b_after', 'b_merge', 'out', 'b'),
    edge('b_merge', 'b_cond'),
    edge('b_cond', 'b_style', 'true'),
    edge('b_cond', 'b_preview', 'false'),
    edge('b_style', 'b_script'),
    edge('b_script', 'b_video'),
    edge('b_video', 'b_neg'),
    edge('b_neg', 'b_export'),
  ]
  return { name: 'Before / After Transformation', nodes, edges }
}

/* --------------------------------------------------- TEMPLATE: Lookbook  */

function fashionLookbook() {
  const nodes = [
    makeNode('f_char', 'characterInfo', { x: 0, y: 60 }, { charName: 'Mai', gender: 'Nữ', age: '24-28', appearance: 'Tóc ngắn, phong cách tối giản', personality: 'Tự tin, cá tính' }),
    makeNode('f_outfit', 'outfit', { x: 0, y: 340 }, { outfit: 'Áo khoác dạ xám, chân váy midi, boots da', accessories: 'Túi tote da', fabric: 'Len' }),
    makeNode('f_bg', 'backgroundInfo', { x: 0, y: 600 }, { location: 'Đường phố', timeOfDay: 'Hoàng hôn', ambience: 'Se lạnh, ánh nắng vàng' }),
    makeNode('f_style', 'styleGenerator', { x: 360, y: 340 }, { style: 'Fashion Editorial', mood: 'Bí ẩn', palette: 'Đơn sắc' }),
    makeNode('f_prompt', 'promptGenerator', { x: 720, y: 200 }, { promptType: 'Prompt video thời trang', detail: 'Siêu chi tiết' }),
    makeNode('f_script', 'scriptGenerator', { x: 1080, y: 200 }, { scriptStyle: 'Thời trang Lookbook', sceneCount: '8', duration: '30 giây', dialogue: false }),
    makeNode('f_board', 'storyboardGenerator', { x: 1440, y: 200 }, { frameCount: '8', aspectRatio: '4:5' }),
    makeNode('f_video', 'videoPromptNode', { x: 1800, y: 200 }, { mode: 'Fashion Lookbook Motion', flags: ['Không lời thoại', 'Chuyển động chậm'] }),
    makeNode('f_neg', 'negativePromptNode', { x: 2160, y: 200 }),
    makeNode('f_export', 'exportNode', { x: 2520, y: 200 }, { name: 'Fashion Lookbook Pack' }),
  ]
  const edges = [
    edge('f_char', 'f_style'),
    edge('f_outfit', 'f_style'),
    edge('f_bg', 'f_style'),
    edge('f_style', 'f_prompt'),
    edge('f_prompt', 'f_script'),
    edge('f_script', 'f_board'),
    edge('f_board', 'f_video'),
    edge('f_video', 'f_neg'),
    edge('f_neg', 'f_export'),
  ]
  return { name: 'Fashion Lookbook', nodes, edges }
}

export const TEMPLATES = [
  { id: 'default', name: 'AI Video Script (mặc định)', description: 'Ảnh → phân tích → prompt → style → kịch bản → storyboard → video prompt → negative → export.', build: defaultWorkflow, badge: '12 node' },
  { id: 'tiktok', name: 'TikTok Viral UGC', description: 'Kịch bản UGC 30s dọc 9:16 kèm lời thoại giọng miền Nam.', build: tiktokUgc, badge: '9 node' },
  { id: 'product', name: 'Luxury Product Commercial', description: 'TVC sản phẩm cao cấp, macro shot, xoay 360, storyboard 8 khung.', build: productCommercial, badge: '13 node' },
  { id: 'beforeafter', name: 'Before / After Transformation', description: 'Hai ảnh trước–sau, merge + condition, prompt transformation.', build: beforeAfter, badge: '10 node' },
  { id: 'lookbook', name: 'Fashion Lookbook', description: 'Nhân vật + trang phục + bối cảnh → lookbook 8 cảnh không lời thoại.', build: fashionLookbook, badge: '10 node' },
]
