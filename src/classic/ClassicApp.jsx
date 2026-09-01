/**
 * ClassicApp.jsx
 * ---------------------------------------------------------------------------
 * Phiên bản giao diện "Classic" — bản single-file do người dùng cung cấp.
 * Được giữ nguyên logic/bố cục gốc, chỉ chỉnh:
 *   - tên icon cho khớp lucide-react v1 (CheckCircle2 -> CircleCheckBig, ...)
 *   - bỏ các import icon không dùng để tránh cảnh báo build
 *
 * Truy cập bằng nút "Classic UI" trên header, hoặc mở URL với #classic.
 */
import React, { useState, useRef, useCallback } from 'react'
import {
  Play, Download, Plus, Trash2, Copy, RefreshCw, Layers,
  CircleCheckBig as CheckCircle2, CircleX as XCircle, Clock, Sparkles,
  Image as ImageIcon, FileText, Film, Clapperboard,
  SlidersHorizontal as Sliders, Eye, Code, Zap, Grid3x3 as Grid,
  ZoomIn, ZoomOut, Maximize2, RotateCcw, ShieldAlert, Monitor, Volume2, Camera, Move,
  GitMerge, GitBranch, FileUp, ListChecks,
} from 'lucide-react'

// --- CONFIGURATION & NODE TYPES ---
const NODE_CATEGORIES = {
  INPUT: { title: 'Input Nodes', color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  AI: { title: 'AI Generation', color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
  UTILITY: { title: 'Utility & Parameters', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
  CONTROL: { title: 'Logic & Control', color: 'border-amber-500 bg-amber-500/10 text-amber-400' },
  OUTPUT: { title: 'Output & Export', color: 'border-rose-500 bg-rose-500/10 text-rose-400' },
}

const NODE_TEMPLATES = [
  // Input
  { type: 'image_node', category: 'INPUT', label: 'Image Node', icon: ImageIcon, desc: 'Upload ảnh gốc nhân vật/sản phẩm' },
  { type: 'text_input', category: 'INPUT', label: 'Text Input', icon: FileText, desc: 'Mô tả ý tưởng, thông tin tổng quan' },
  { type: 'character_info', category: 'INPUT', label: 'Character Info', icon: Sliders, desc: 'Đặc điểm nhân vật nhất quán' },
  // AI
  { type: 'image_analysis', category: 'AI', label: 'Image Analysis', icon: Sparkles, desc: 'Phân tích visual & đối tượng từ ảnh' },
  { type: 'prompt_gen', category: 'AI', label: 'Prompt Generator', icon: Zap, desc: 'Tạo prompt tiếng Anh tối ưu AI Art' },
  { type: 'script_gen', category: 'AI', label: 'Script Generator', icon: Film, desc: 'Tạo kịch bản chia scene & thoại' },
  { type: 'storyboard_gen', category: 'AI', label: 'Storyboard Node', icon: Clapperboard, desc: 'Tạo khung ảnh phân đoạn chi tiết' },
  { type: 'video_prompt', category: 'AI', label: 'Video Prompt Node', icon: Camera, desc: 'Tạo camera motion & video prompt' },
  { type: 'negative_prompt', category: 'AI', label: 'Negative Prompt', icon: ShieldAlert, desc: 'Tạo quy tắc chống lỗi hình ảnh/video' },
  // Utility
  { type: 'style_node', category: 'UTILITY', label: 'Style Node', icon: Sparkles, desc: 'Phong cách nghệ thuật (Cinematic, 3D...)' },
  { type: 'aspect_ratio', category: 'UTILITY', label: 'Aspect Ratio', icon: Monitor, desc: 'Tỷ lệ khung hình (9:16, 16:9, 1:1)' },
  { type: 'duration_node', category: 'UTILITY', label: 'Duration Node', icon: Clock, desc: 'Thời lượng video tổng thể' },
  { type: 'voice_node', category: 'UTILITY', label: 'Voice / Dialogue', icon: Volume2, desc: 'Giọng đọc và ngôn ngữ kịch bản' },
  { type: 'camera_style', category: 'UTILITY', label: 'Camera Style', icon: Camera, desc: 'Góc quay & chuyển động ống kính' },
  { type: 'motion_style', category: 'UTILITY', label: 'Motion Style', icon: Move, desc: 'Nhịp độ chuyển động của vật thể' },
  // Control
  { type: 'condition_node', category: 'CONTROL', label: 'Condition Node', icon: GitBranch, desc: 'Rẽ nhánh logic theo điều kiện' },
  { type: 'merge_node', category: 'CONTROL', label: 'Merge Node', icon: GitMerge, desc: 'Gộp nhiều nguồn dữ liệu thành 1' },
  { type: 'validate_node', category: 'CONTROL', label: 'Validate Node', icon: ListChecks, desc: 'Kiểm tra độ đầy đủ dữ liệu' },
  // Output
  { type: 'preview_node', category: 'OUTPUT', label: 'Preview Node', icon: Eye, desc: 'Xem trước kịch bản trực quan' },
  { type: 'export_node', category: 'OUTPUT', label: 'Export Node', icon: Download, desc: 'Xuất kịch bản JSON/TXT/Markdown' },
]

// Default Preset Workflow
const INITIAL_NODES = [
  {
    id: 'node-1',
    type: 'image_node',
    label: 'Hình ảnh gốc (Product/Model)',
    x: 60,
    y: 120,
    status: 'success',
    config: { imageType: 'Sản phẩm', description: 'Chai serum dưỡng da thuỷ tinh mờ cao cấp, nắp mạ vàng' },
    inputs: [],
    outputs: ['image_data'],
  },
  {
    id: 'node-2',
    type: 'image_analysis',
    label: 'Phân tích hình ảnh AI',
    x: 360,
    y: 120,
    status: 'success',
    config: { detailLevel: 'Rất chi tiết' },
    inputs: ['image_data'],
    outputs: ['analysis_result'],
  },
  {
    id: 'node-3',
    type: 'style_node',
    label: 'Phong cách Visual',
    x: 60,
    y: 380,
    status: 'success',
    config: { style: 'Luxury Commercial', lighting: 'Studio Soft Light, Gold Glow' },
    inputs: [],
    outputs: ['style_config'],
  },
  {
    id: 'node-4',
    type: 'prompt_gen',
    label: 'Prompt Generator',
    x: 680,
    y: 180,
    status: 'success',
    config: { detailLevel: 'Siêu chi tiết', extraPrompt: 'Nền giọt nước đọng lung linh, tia nắng xuyên qua' },
    inputs: ['analysis_result', 'style_config'],
    outputs: ['main_prompt'],
  },
  {
    id: 'node-5',
    type: 'script_gen',
    label: 'Kịch bản Video AI',
    x: 1000,
    y: 180,
    status: 'success',
    config: { scriptType: 'Quảng cáo TVC', scenesCount: 4, duration: '15s', language: 'Tiếng Việt', voice: 'Nữ miền Nam' },
    inputs: ['main_prompt'],
    outputs: ['script_data'],
  },
  {
    id: 'node-6',
    type: 'storyboard_gen',
    label: 'Storyboard Builder',
    x: 1320,
    y: 80,
    status: 'success',
    config: { ratio: '9:16', frames: 4 },
    inputs: ['script_data'],
    outputs: ['storyboard_data'],
  },
  {
    id: 'node-7',
    type: 'video_prompt',
    label: 'Video Motion Prompt',
    x: 1320,
    y: 340,
    status: 'success',
    config: { motionMode: 'Product Commercial Motion', camera: 'Slow Push-in Dolly' },
    inputs: ['script_data'],
    outputs: ['video_prompts'],
  },
  {
    id: 'node-8',
    type: 'negative_prompt',
    label: 'Negative Rules Node',
    x: 1000,
    y: 480,
    status: 'success',
    config: { errorTypes: ['Lỗi mặt', 'Lỗi sản phẩm', 'Nhiễu hạt', 'Biến dạng logo'] },
    inputs: [],
    outputs: ['negative_prompt'],
  },
  {
    id: 'node-9',
    type: 'export_node',
    label: 'Export Master Script',
    x: 1680,
    y: 240,
    status: 'success',
    config: { format: 'All-in-One' },
    inputs: ['storyboard_data', 'video_prompts', 'negative_prompt'],
    outputs: [],
  },
]

const INITIAL_CONNECTIONS = [
  { id: 'c1', fromNode: 'node-1', fromPort: 'image_data', toNode: 'node-2', toPort: 'image_data' },
  { id: 'c2', fromNode: 'node-2', fromPort: 'analysis_result', toNode: 'node-4', toPort: 'analysis_result' },
  { id: 'c3', fromNode: 'node-3', fromPort: 'style_config', toNode: 'node-4', toPort: 'style_config' },
  { id: 'c4', fromNode: 'node-4', fromPort: 'main_prompt', toNode: 'node-5', toPort: 'main_prompt' },
  { id: 'c5', fromNode: 'node-5', fromPort: 'script_data', toNode: 'node-6', toPort: 'script_data' },
  { id: 'c6', fromNode: 'node-5', fromPort: 'script_data', toNode: 'node-7', toPort: 'script_data' },
  { id: 'c7', fromNode: 'node-6', fromPort: 'storyboard_data', toNode: 'node-9', toPort: 'storyboard_data' },
  { id: 'c8', fromNode: 'node-7', fromPort: 'video_prompts', toNode: 'node-9', toPort: 'video_prompts' },
  { id: 'c9', fromNode: 'node-8', fromPort: 'negative_prompt', toNode: 'node-9', toPort: 'negative_prompt' },
]

export default function ClassicApp({ onSwitch }) {
  // State Management
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS)
  const [selectedNodeId, setSelectedNodeId] = useState('node-5')
  const [draggingNodeId, setDraggingNodeId] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [connecting, setConnecting] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [executionResult, setExecutionResult] = useState(null)
  const [activeTab, setActiveTab] = useState('script')
  const [showToast, setShowToast] = useState(null)
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  const canvasRef = useRef(null)

  const notify = (msg, type = 'info') => {
    setShowToast({ msg, type })
    setTimeout(() => setShowToast(null), 3000)
  }

  // eslint-disable-next-line no-unused-vars
  const saveState = useCallback(() => {
    const newSnap = { nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) }
    const updatedHistory = history.slice(0, historyIdx + 1)
    setHistory([...updatedHistory, newSnap])
    setHistoryIdx(updatedHistory.length)
  }, [nodes, connections, history, historyIdx])

  const undo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1]
      setNodes(prev.nodes)
      setConnections(prev.connections)
      setHistoryIdx(historyIdx - 1)
      notify('Đã hoàn tác (Undo)', 'info')
    }
  }

  const handleAutoLayout = () => {
    const colWidth = 320
    const updated = nodes.map((node, index) => {
      const col = index % 5
      const row = Math.floor(index / 5)
      return { ...node, x: 60 + col * colWidth, y: 100 + row * 260 }
    })
    setNodes(updated)
    notify('Đã tự động căn chỉnh vị trí các Node', 'success')
  }

  const handleAddNode = (template) => {
    const newNodeId = `node-${Date.now()}`
    const newNode = {
      id: newNodeId,
      type: template.type,
      label: template.label,
      x: (100 - pan.x) / zoom + Math.random() * 40,
      y: (100 - pan.y) / zoom + Math.random() * 40,
      status: 'idle',
      config: { ...template.defaultConfig },
      inputs: ['input_data'],
      outputs: ['output_data'],
    }
    setNodes([...nodes, newNode])
    setSelectedNodeId(newNodeId)
    notify(`Đã thêm node ${template.label}`, 'success')
  }

  const handleDuplicateNode = (nodeId) => {
    const target = nodes.find((n) => n.id === nodeId)
    if (!target) return
    const duplicate = {
      ...JSON.parse(JSON.stringify(target)),
      id: `node-${Date.now()}`,
      label: `${target.label} (Bản sao)`,
      x: target.x + 40,
      y: target.y + 40,
      status: 'idle',
    }
    setNodes([...nodes, duplicate])
    setSelectedNodeId(duplicate.id)
    notify('Đã nhân bản Node thành công', 'success')
  }

  const handleDeleteNode = (nodeId) => {
    setNodes(nodes.filter((n) => n.id !== nodeId))
    setConnections(connections.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId))
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
    notify('Đã xóa node khỏi canvas', 'info')
  }

  const handleMouseDownCanvas = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      setSelectedNodeId(null)
    }
  }

  const handleMouseMoveCanvas = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    } else if (draggingNodeId) {
      setNodes(
        nodes.map((n) =>
          n.id === draggingNodeId
            ? { ...n, x: (e.clientX - dragOffset.x - pan.x) / zoom, y: (e.clientY - dragOffset.y - pan.y) / zoom }
            : n,
        ),
      )
    } else if (connecting) {
      const rect = canvasRef.current.getBoundingClientRect()
      setConnecting({
        ...connecting,
        mouseX: (e.clientX - rect.left - pan.x) / zoom,
        mouseY: (e.clientY - rect.top - pan.y) / zoom,
      })
    }
  }

  const handleMouseUpCanvas = () => {
    setIsPanning(false)
    setDraggingNodeId(null)
    setConnecting(null)
  }

  const handlePortMouseDown = (e, nodeId, portId, isOutput) => {
    e.stopPropagation()
    if (!isOutput) return
    const node = nodes.find((n) => n.id === nodeId)
    setConnecting({ fromNode: nodeId, fromPort: portId, mouseX: node.x + 240, mouseY: node.y + 60 })
  }

  const handlePortMouseUp = (e, targetNodeId, targetPortId, isOutput) => {
    e.stopPropagation()
    if (connecting && !isOutput && connecting.fromNode !== targetNodeId) {
      const newConn = {
        id: `c-${Date.now()}`,
        fromNode: connecting.fromNode,
        fromPort: connecting.fromPort,
        toNode: targetNodeId,
        toPort: targetPortId,
      }
      if (!connections.some((c) => c.fromNode === newConn.fromNode && c.toNode === newConn.toNode)) {
        setConnections([...connections, newConn])
        notify('Kết nối thành công!', 'success')
      }
    }
    setConnecting(null)
  }

  const handleDeleteConnection = (connId) => {
    setConnections(connections.filter((c) => c.id !== connId))
    notify('Đã xóa đường nối', 'info')
  }

  const runWorkflow = async () => {
    setIsRunning(true)
    setLogs([])
    notify('Đang kích hoạt hệ thống AI Workflow Engine...', 'info')

    const unhandled = nodes.filter((n) => n.inputs.length > 0 && !connections.some((c) => c.toNode === n.id))
    const updatedNodes = [...nodes]
    const addLog = (msg, level = 'info') => {
      setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg, level }])
    }

    addLog('Khởi tạo kiểm tra đồ thị Workflow...', 'info')
    await new Promise((r) => setTimeout(r, 600))

    if (unhandled.length > 0) {
      addLog(`Cảnh báo: Có ${unhandled.length} Node chưa nối cổng Input. Workflow sẽ dùng thiết lập mặc định.`, 'warning')
    }

    for (let i = 0; i < updatedNodes.length; i++) {
      const node = updatedNodes[i]
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, status: 'running' } : n)))
      addLog(`Đang thực thi: [${node.label}]...`, 'info')
      await new Promise((r) => setTimeout(r, 500))
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, status: 'success' } : n)))
      addLog(`Xử lý thành công Node: [${node.label}]`, 'success')
    }

    addLog('Đang tổng hợp kịch bản, prompt và cấu hình video...', 'info')
    await new Promise((r) => setTimeout(r, 600))

    const generatedData = {
      title: 'Kịch Bản Quảng Cáo Serum Phục Hồi Da Cao Cấp - PureGlow',
      concept: 'Tạo cảm giác sang trọng, thanh lịch với giọt dưỡng chất phát sáng lấp lánh hòa quyện vào làn da mềm mịn.',
      aspectRatio: '9:16 (TikTok / Reels / Shorts)',
      duration: '15 Giây',
      style: 'Luxury TVC Commercial, Studio Lighting',
      scenes: [
        {
          sceneNumber: 1,
          visual: 'Cận cảnh giọt serum trong suốt đọng trên đầu nắp mạ vàng 18K. Ánh sáng vàng dịu phản chiếu lung linh.',
          action: 'Giọt serum từ từ rơi xuống bề mặt nước lỏng sóng sánh tạo ra hiệu ứng gợn sóng phát sáng nhẹ.',
          dialogue: 'Mỗi giọt serum - Chìa khóa đánh thức làn da thanh xuân.',
          imagePrompt:
            'Macro shot of a clear glowing serum drop falling onto crystal liquid surface, golden sunlight flare, luxury aesthetics, highly detailed, 8k resolution, Unreal Engine 5 render style.',
          videoPrompt: 'Slow motion 120fps camera dolly in to serum drop, subtle ripple effect, soft volumetric light, cinematic depth of field.',
        },
        {
          sceneNumber: 2,
          visual: 'Người mẫu nữ Châu Á làn da căng bóng mịn màng mỉm cười nhẹ nhàng trước gương.',
          action: 'Người mẫu đưa ngón tay chạm nhẹ lên má, dưỡng chất thẩm thấu tức thì tạo lớp nền bóng khỏe.',
          dialogue: 'Công thức độc quyền từ thảo dược tự nhiên, thẩm thấu tức thì sau 3 giây.',
          imagePrompt:
            'Asian female model with glass skin texture, smiling gently, elegant bathrobe, soft studio lighting, Vogue cover style photography.',
          videoPrompt: 'Gentle pan right across model face, tracking shot of fingertips touching cheek, natural skin motion, soft breeze effect.',
        },
        {
          sceneNumber: 3,
          visual: 'Góc quay 3D mô phỏng phân tử peptide thấm sâu vào các tầng biểu bì da.',
          action: 'Các phân tử phát sáng màu vàng kim kết nối lại với nhau khôi phục lại cấu trúc da bị tổn thương.',
          dialogue: 'Tái tạo hàng rào bảo vệ da, cấp ẩm chuyên sâu suốt 24 giờ.',
          imagePrompt:
            '3D scientific visualization of golden glowing peptide molecules penetrating skin layers, clean blue background, sleek modern medical style.',
          videoPrompt: '3D camera zoom through epidermal layer, animated peptide connection network, smooth particles motion.',
        },
        {
          sceneNumber: 4,
          visual: 'Chai sản phẩm PureGlow Serum đặt ở trung tâm trên bệ đá cẩm thạch trắng, xung quanh là hoa nhài tươi.',
          action: 'Logo thương hiệu hiện ra quyến rũ cùng thông điệp Call To Action.',
          dialogue: 'PureGlow - Tỏa sáng khí chất thanh xuân của riêng bạn. Đặt hàng ngay hôm nay!',
          imagePrompt:
            'Luxury product photography, PureGlow serum glass bottle on white marble pedestal, fresh jasmine petals, soft morning backlight, clean typography space.',
          videoPrompt: 'Static camera slow zoom out revealing the full product setup, gold particle dust floating in air, elegant fade-in CTA text.',
        },
      ],
      negativePrompt:
        '(worst quality, low quality:1.4), deformed face, extra fingers, bad anatomy, blur, noisy skin, distorted brand logo, unnatural motion, jittery artifacts, overexposed.',
      consistencyRules: 'Giữ nguyên màu da người mẫu, cấu hình chai serum thủy tinh nắp vàng trong suốt tất cả các scene.',
    }

    setExecutionResult(generatedData)
    setIsRunning(false)
    addLog('Tất cả các Node đã thực thi hoàn tất! Đã xuất dữ liệu.', 'success')
    notify('Workflow chạy hoàn tất! Xem kết quả ở Bottom Panel.', 'success')
  }

  const getNodeIcon = (type) => {
    const item = NODE_TEMPLATES.find((t) => t.type === type)
    if (!item) return <Layers className="w-4 h-4" />
    const IconComponent = item.icon
    return <IconComponent className="w-4 h-4" />
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. TOP HEADER BAR */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
              AI Video Workflow Builder
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PRO v2.5</span>
            </h1>
            <p className="text-[11px] text-slate-400">Trực quan hóa quy trình kịch bản &amp; prompt AI</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onSwitch && (
            <button
              onClick={onSwitch}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-xs text-indigo-300 border border-indigo-500/30 transition"
              title="Chuyển sang giao diện Studio (React Flow)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Studio UI</span>
            </button>
          )}

          <button
            onClick={undo}
            disabled={historyIdx <= 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleAutoLayout}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Auto Layout</span>
          </button>

          <button
            onClick={() => {
              setNodes([])
              setConnections([])
              notify('Đã xóa toàn bộ Workflow', 'info')
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 hover:text-rose-300 text-xs text-slate-300 border border-slate-700/80 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Canvas</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 my-auto mx-1" />

          <button
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ nodes, connections }))
              const downloadAnchor = document.createElement('a')
              downloadAnchor.setAttribute('href', dataStr)
              downloadAnchor.setAttribute('download', 'ai_video_workflow.json')
              document.body.appendChild(downloadAnchor)
              downloadAnchor.click()
              downloadAnchor.remove()
              notify('Đã tải xuống tệp JSON Workflow', 'success')
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save JSON</span>
          </button>

          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className={`flex items-center space-x-2 px-5 py-1.5 rounded-lg font-medium text-xs text-white shadow-lg transition-all ${
              isRunning
                ? 'bg-purple-800 cursor-not-allowed animate-pulse'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 shadow-purple-500/25 active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý Workflow...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>RUN WORKFLOW</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 2. LEFT SIDEBAR - NODE LIBRARY */}
        <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 z-20">
          <div className="p-3 border-b border-slate-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Thư viện Node</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">{NODE_TEMPLATES.length} Nodes</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {Object.keys(NODE_CATEGORIES).map((catKey) => {
              const cat = NODE_CATEGORIES[catKey]
              const catNodes = NODE_TEMPLATES.filter((t) => t.category === catKey)
              return (
                <div key={catKey} className="space-y-1.5">
                  <div className="text-[11px] font-medium text-slate-400 px-1 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cat.color.split(' ')[1]}`}></span>
                    {cat.title}
                  </div>
                  <div className="space-y-1.5">
                    {catNodes.map((template) => {
                      const Icon = template.icon
                      return (
                        <div
                          key={template.type}
                          onClick={() => handleAddNode(template)}
                          className="group p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 cursor-pointer transition flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-1.5 rounded-md ${cat.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 transition">{template.label}</div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">{template.desc}</div>
                            </div>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* 3. CENTER GRAPH CANVAS */}
        <main
          ref={canvasRef}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          className="flex-1 relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Zoom Overlay Control */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-800 backdrop-blur rounded-lg flex items-center p-1 space-x-1 shadow-lg">
            <button onClick={() => setZoom(Math.min(zoom + 0.15, 2))} className="p-1.5 rounded hover:bg-slate-800 text-slate-300" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.max(zoom - 0.15, 0.4))} className="p-1.5 rounded hover:bg-slate-800 text-slate-300" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* SVG Connections Container */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
              {connections.map((conn) => {
                const fromNode = nodes.find((n) => n.id === conn.fromNode)
                const toNode = nodes.find((n) => n.id === conn.toNode)
                if (!fromNode || !toNode) return null

                const startX = fromNode.x + 240
                const startY = fromNode.y + 60
                const endX = toNode.x
                const endY = toNode.y + 60
                const dx = Math.abs(endX - startX) * 0.5
                const path = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`

                return (
                  <g key={conn.id} className="group pointer-events-auto cursor-pointer">
                    <path
                      d={path}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="3"
                      strokeDasharray={fromNode.status === 'running' ? '6 6' : 'none'}
                      className="transition-all hover:stroke-indigo-300 hover:stroke-[4px]"
                      onClick={() => handleDeleteConnection(conn.id)}
                    />
                    <circle cx={(startX + endX) / 2} cy={(startY + endY) / 2} r="4" fill="#818cf8" />
                  </g>
                )
              })}

              {connecting && (
                <path
                  d={`M ${nodes.find((n) => n.id === connecting.fromNode)?.x + 240} ${
                    nodes.find((n) => n.id === connecting.fromNode)?.y + 60
                  } C ${connecting.mouseX} ${connecting.mouseY}, ${connecting.mouseX} ${connecting.mouseY}, ${connecting.mouseX} ${connecting.mouseY}`}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}
            </g>
          </svg>

          {/* Canvas Nodes Render */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id
              const template = NODE_TEMPLATES.find((t) => t.type === node.type) || {}
              const CategoryConfig = NODE_CATEGORIES[template.category] || NODE_CATEGORIES.AI

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setSelectedNodeId(node.id)
                    setDraggingNodeId(node.id)
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                  }}
                  style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: '240px' }}
                  className={`absolute pointer-events-auto rounded-xl border bg-slate-900/90 backdrop-blur shadow-xl transition-shadow ${
                    isSelected ? 'border-indigo-500 shadow-indigo-500/20 ring-2 ring-indigo-500/30 z-10' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="p-2.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-800/30 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg border ${CategoryConfig.color}`}>{getNodeIcon(node.type)}</div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-200 line-clamp-1">{node.label}</h3>
                        <p className="text-[9px] text-slate-400 capitalize">{node.type.replace('_', ' ')}</p>
                      </div>
                    </div>

                    <div>
                      {node.status === 'running' && <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
                      {node.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {node.status === 'error' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                      {node.status === 'idle' && <div className="w-2 h-2 rounded-full bg-slate-600"></div>}
                    </div>
                  </div>

                  <div className="p-3 text-[11px] space-y-2 text-slate-300">
                    {node.type === 'image_node' && (
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                        <ImageIcon className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400">{node.config?.imageType || 'Chọn loại ảnh'}</span>
                      </div>
                    )}

                    {node.type === 'script_gen' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Thể loại:</span>
                          <span className="text-indigo-300">{node.config?.scriptType || 'TVC'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Số Scene:</span>
                          <span className="text-indigo-300">{node.config?.scenesCount || 4} Cảnh</span>
                        </div>
                      </div>
                    )}

                    {node.type === 'style_node' && (
                      <div className="px-2 py-1 bg-purple-950/40 border border-purple-800/30 rounded text-purple-300 text-[10px]">
                        Style: {node.config?.style || 'Cinematic'}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 text-[9px] text-slate-500 border-t border-slate-800/60">
                      <div className="flex flex-col space-y-1">
                        {node.inputs.map((inPort, idx) => (
                          <div key={idx} className="flex items-center space-x-1" onMouseUp={(e) => handlePortMouseUp(e, node.id, inPort, false)}>
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700 hover:bg-indigo-400 border border-slate-900 cursor-crosshair"></div>
                            <span className="capitalize">{inPort.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col space-y-1 items-end">
                        {node.outputs.map((outPort, idx) => (
                          <div key={idx} className="flex items-center space-x-1" onMouseDown={(e) => handlePortMouseDown(e, node.id, outPort, true)}>
                            <span className="capitalize">{outPort.replace('_', ' ')}</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 hover:bg-purple-400 border border-slate-900 cursor-crosshair"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-8 right-0 flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-md">
                      <button onClick={() => handleDuplicateNode(node.id)} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="Duplicate">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDeleteNode(node.id)} className="p-1 hover:bg-rose-900/50 rounded text-rose-300" title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mini Map Corner Overlay */}
          <div className="absolute bottom-4 left-4 z-10 w-40 h-28 bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-lg pointer-events-none hidden md:block">
            <div className="text-[9px] text-slate-500 mb-1 px-1 font-semibold">MINI MAP</div>
            <div className="w-full h-20 bg-slate-950 rounded relative overflow-hidden">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  style={{ left: `${(n.x / 2000) * 100}%`, top: `${(n.y / 1000) * 100}%` }}
                  className="absolute w-2 h-1.5 bg-indigo-500/80 rounded-[1px]"
                />
              ))}
            </div>
          </div>
        </main>

        {/* 4. RIGHT SIDEBAR - PROPERTIES & CONFIG PANEL */}
        <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0 z-20">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cấu hình Node</span>
            </h2>
            {selectedNodeId && (
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{selectedNodeId}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {selectedNodeId ? (
              (() => {
                const node = nodes.find((n) => n.id === selectedNodeId)
                if (!node) return null

                const updateConfig = (key, val) => {
                  setNodes(nodes.map((n) => (n.id === selectedNodeId ? { ...n, config: { ...n.config, [key]: val } } : n)))
                }

                return (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Tên Node Custom</label>
                      <input
                        type="text"
                        value={node.label}
                        onChange={(e) => {
                          const val = e.target.value
                          setNodes(nodes.map((n) => (n.id === selectedNodeId ? { ...n, label: val } : n)))
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {node.type === 'image_node' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">Loại hình ảnh</label>
                          <select
                            value={node.config?.imageType || 'Sản phẩm'}
                            onChange={(e) => updateConfig('imageType', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Sản phẩm">Sản phẩm (Product)</option>
                            <option value="Nhân vật">Nhân vật (Character Identity)</option>
                            <option value="Bối cảnh">Bối cảnh (Background)</option>
                            <option value="Trang phục">Trang phục (Outfit)</option>
                            <option value="Storyboard">Storyboard Reference</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">Mô tả hình ảnh</label>
                          <textarea
                            rows={3}
                            value={node.config?.description || ''}
                            onChange={(e) => updateConfig('description', e.target.value)}
                            placeholder="Mô tả chi tiết góc quay, đặc điểm nhận diện..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="p-3 border border-dashed border-slate-700 rounded-lg text-center hover:border-indigo-500/50 cursor-pointer transition">
                          <FileUp className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                          <span className="text-[11px] text-indigo-400 font-medium">Tải ảnh lên mẫu</span>
                          <p className="text-[9px] text-slate-500 mt-0.5">PNG, JPG tối đa 10MB</p>
                        </div>
                      </div>
                    )}

                    {node.type === 'script_gen' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">Phong cách Kịch bản</label>
                          <select
                            value={node.config?.scriptType || 'Quảng cáo TVC'}
                            onChange={(e) => updateConfig('scriptType', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Quảng cáo TVC">Quảng cáo TVC Sang Trọng</option>
                            <option value="Viral TikTok">Viral TikTok / Shorts</option>
                            <option value="Review sản phẩm">Review Sản Phẩm UGC</option>
                            <option value="Lookbook Thời trang">Lookbook Thời Trang</option>
                            <option value="Kể chuyện Cảm xúc">Kể Chuyện Cảm Xúc</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">Số lượng Cảnh (Scenes)</label>
                          <select
                            value={node.config?.scenesCount || 4}
                            onChange={(e) => updateConfig('scenesCount', parseInt(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value={3}>3 Cảnh (Ngắn)</option>
                            <option value={4}>4 Cảnh (Tiêu chuẩn)</option>
                            <option value={6}>6 Cảnh (Chi tiết)</option>
                            <option value={8}>8 Cảnh (Mở rộng)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">Thời lượng tổng thể</label>
                          <input
                            type="text"
                            value={node.config?.duration || '15s'}
                            onChange={(e) => updateConfig('duration', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    {node.type === 'style_node' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">Visual Art Style</label>
                          <select
                            value={node.config?.style || 'Luxury Commercial'}
                            onChange={(e) => updateConfig('style', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Luxury Commercial">Luxury Commercial</option>
                            <option value="Cinematic Movie">Cinematic Movie</option>
                            <option value="Korean Drama">Korean Drama Visual</option>
                            <option value="3D Animation">3D Unreal Engine Render</option>
                            <option value="Minimalist Studio">Minimalist Studio</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">Ánh sáng (Lighting Setup)</label>
                          <input
                            type="text"
                            value={node.config?.lighting || 'Studio Soft Light'}
                            onChange={(e) => updateConfig('lighting', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <button
                        onClick={() => notify(`Đã test riêng lẻ Node ${node.label}`, 'success')}
                        className="w-full py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition flex items-center justify-center space-x-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Thử nghiệm Node này</span>
                      </button>

                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="w-full py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/30 text-xs font-medium transition flex items-center justify-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa Node khỏi Workflow</span>
                      </button>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Sliders className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">Nhấp chọn bất kỳ Node nào trên Canvas để điều chỉnh thông số chi tiết</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 5. BOTTOM EXECUTION & RESULT PANEL */}
      <footer className="h-64 bg-slate-900/95 border-t border-slate-800 flex flex-col shrink-0 z-20">
        <div className="h-9 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('script')}
              className={`px-3 py-1 text-xs font-medium rounded-t-lg transition flex items-center space-x-1.5 ${
                activeTab === 'script' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Kịch Bản Chi Tiết</span>
            </button>

            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-3 py-1 text-xs font-medium rounded-t-lg transition flex items-center space-x-1.5 ${
                activeTab === 'prompts' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompt Pack AI</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 text-xs font-medium rounded-t-lg transition flex items-center space-x-1.5 ${
                activeTab === 'logs' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Execution Logs ({logs.length})</span>
            </button>
          </div>

          {executionResult && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2))
                  notify('Đã copy toàn bộ kịch bản vào Clipboard!', 'success')
                }}
                className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700 transition"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Kết Quả</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/60">
          {activeTab === 'script' &&
            (executionResult ? (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-bold text-indigo-300">{executionResult.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{executionResult.concept}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded">Tỷ lệ: {executionResult.aspectRatio}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded">Thời lượng: {executionResult.duration}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-800/40">
                      Style: {executionResult.style}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {executionResult.scenes.map((s) => (
                    <div key={s.sceneNumber} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                        <span className="text-xs font-semibold text-indigo-400">SCENE #{s.sceneNumber}</span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div>
                          <strong className="text-slate-400">Visual:</strong> <span className="text-slate-200">{s.visual}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">Hành động:</strong> <span className="text-slate-300">{s.action}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">Lời thoại (VO):</strong>{' '}
                          <span className="text-emerald-300 font-medium">{s.dialogue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Clapperboard className="w-8 h-8 opacity-40" />
                <p className="text-xs">
                  Nhấn <strong className="text-indigo-400">RUN WORKFLOW</strong> ở góc trên bên phải để tạo kịch bản chi tiết
                </p>
              </div>
            ))}

          {activeTab === 'prompts' &&
            (executionResult ? (
              <div className="space-y-3 max-w-5xl mx-auto">
                <div className="text-xs font-semibold text-slate-300">Danh sách Prompt tạo ảnh &amp; Video Motion theo từng Cảnh:</div>
                {executionResult.scenes.map((s) => (
                  <div key={s.sceneNumber} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                    <div className="text-xs font-medium text-purple-400">Scene #{s.sceneNumber} Prompts</div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800/80">
                        <strong className="text-indigo-300">Image Prompt:</strong> {s.imagePrompt}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800/80">
                        <strong className="text-pink-300">Video Motion Prompt:</strong> {s.videoPrompt}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg">
                  <div className="text-xs font-medium text-rose-300 mb-1">Negative Prompt Rules</div>
                  <div className="text-[11px] font-mono text-slate-400">{executionResult.negativePrompt}</div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Sparkles className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-xs">Chưa có kết quả Prompt. Vui lòng thực thi Workflow.</p>
              </div>
            ))}

          {activeTab === 'logs' && (
            <div className="font-mono text-[11px] space-y-1">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="flex items-center space-x-2 text-slate-300">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className={log.level === 'success' ? 'text-emerald-400' : log.level === 'warning' ? 'text-amber-400' : 'text-indigo-300'}>
                      {log.msg}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">Chưa có nhật ký hoạt động. Sẵn sàng thực thi.</div>
              )}
            </div>
          )}
        </div>
      </footer>

      {showToast && (
        <div className="fixed bottom-20 right-6 z-50 bg-slate-800 border border-slate-700 text-slate-100 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{showToast.msg}</span>
        </div>
      )}
    </div>
  )
}
