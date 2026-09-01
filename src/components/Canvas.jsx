import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MiniMap,
  Panel,
  SelectionMode,
  useReactFlow,
} from 'reactflow'
import WorkflowNode from './nodes/WorkflowNode.jsx'
import GroupBoxNode from './nodes/GroupBoxNode.jsx'
import FlowEdge from './edges/FlowEdge.jsx'
import { Icon, Tooltip } from './ui.jsx'
import { useWorkflowStore } from '../store/useWorkflowStore.js'
import { ACCENTS, getDef } from '../lib/nodeLibrary.js'
import { STATUS } from '../lib/workflowEngine.js'

const nodeTypes = { workflowNode: WorkflowNode, groupBox: GroupBoxNode }
const edgeTypes = { flowEdge: FlowEdge }

function Defs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <linearGradient id="edge-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6d5bd0" />
          <stop offset="100%" stopColor="#37b6c4" />
        </linearGradient>
        <linearGradient id="edge-gradient-done" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c1c3" />
        </linearGradient>
        <linearGradient id="edge-gradient-live" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#3ddbd9" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Canvas() {
  const wrapper = useRef(null)
  const rf = useReactFlow()
  const [menu, setMenu] = useState(null)

  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const settings = useWorkflowStore((s) => s.settings)
  const running = useWorkflowStore((s) => s.running)
  const store = useWorkflowStore

  const onNodesChange = useWorkflowStore((s) => s.onNodesChange)
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange)
  const onConnect = useWorkflowStore((s) => s.onConnect)
  const addNode = useWorkflowStore((s) => s.addNode)
  const selectNode = useWorkflowStore((s) => s.selectNode)

  /* ------------------------------------------------------------- drop */
  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/aivwb-node')
      if (!type) return
      const position = rf.screenToFlowPosition({ x: e.clientX - 140, y: e.clientY - 56 })
      addNode(type, position)
    },
    [rf, addNode],
  )

  /* -------------------------------------------------------- shortcuts */
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const typing = ['INPUT', 'TEXTAREA'].includes(tag) || document.activeElement?.isContentEditable
      const s = store.getState()
      const mod = e.ctrlKey || e.metaKey

      if (typing) return

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        s.undo()
      } else if ((mod && e.key.toLowerCase() === 'y') || (mod && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault()
        s.redo()
      } else if (mod && e.key.toLowerCase() === 'c') {
        s.copySelection()
      } else if (mod && e.key.toLowerCase() === 'v') {
        s.pasteClipboard()
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        s.duplicateNodes(s.selectedNodeIds)
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        s.selectAll()
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        s.saveWorkflow()
      } else if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        s.groupSelection()
      } else if (mod && e.key === 'Enter') {
        e.preventDefault()
        s.runAll()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selectedNodeIds.length) s.deleteNodes(s.selectedNodeIds)
        const selEdges = s.edges.filter((x) => x.selected).map((x) => x.id)
        if (selEdges.length) s.deleteEdges(selEdges)
      } else if (e.key === 'f' && !mod) {
        rf.fitView({ padding: 0.2, duration: 500 })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rf, store])

  /* ---------------------------------------------------------- context */
  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault()
    selectNode(node.id)
    setMenu({ x: e.clientX, y: e.clientY, node })
  }, [selectNode])

  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, node: null })
  }, [])

  const closeMenu = useCallback(() => setMenu(null), [])

  const minimapColor = useCallback((n) => {
    if (n.type === 'groupBox') return 'rgba(124,92,255,0.18)'
    const def = getDef(n.data?.type)
    const st = STATUS[n.data?.status]
    if (n.data?.status && ['success', 'error', 'running', 'warning'].includes(n.data.status)) return st.color
    return ACCENTS[def?.accent || 'violet'].from
  }, [])

  return (
    <div className="relative h-full w-full" ref={wrapper} onClick={closeMenu}>
      <Defs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={useWorkflowStore.getState().onNodeDragStart}
        onNodeDragStop={useWorkflowStore.getState().onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onNodeClick={(_, n) => selectNode(n.id)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'flowEdge' }}
        connectionLineType={ConnectionLineType.Bezier}
        snapToGrid={settings.snapToGrid}
        snapGrid={[settings.gridSize, settings.gridSize]}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
        zoomOnDoubleClick={false}
        minZoom={0.15}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={settings.gridSize * 2} size={1.4} color="rgba(255,255,255,0.10)" />
        <Background
          id="lines"
          variant={BackgroundVariant.Lines}
          gap={settings.gridSize * 10}
          lineWidth={1}
          color="rgba(255,255,255,0.028)"
        />

        {settings.showMinimap && (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={minimapColor}
            nodeStrokeWidth={2}
            nodeBorderRadius={6}
            maskColor="rgba(6,7,11,0.7)"
            style={{ width: 190, height: 130, margin: 16 }}
          />
        )}

        <Panel position="top-left" className="!m-3">
          <CanvasToolbar />
        </Panel>

        <Panel position="bottom-left" className="!m-3">
          <StatusLegend />
        </Panel>
      </ReactFlow>

      {/* overlay khi đang chạy */}
      {running && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[shimmer_1.2s_linear_infinite] bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
        </div>
      )}

      {menu && <ContextMenu menu={menu} onClose={closeMenu} />}

      {!nodes.length && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-white/[0.07] bg-ink-900/70 px-8 py-7 text-center backdrop-blur-xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white shadow-[0_10px_40px_-12px_rgba(124,92,255,0.9)]">
              <Icon name="Workflow" size={26} />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold text-white">Canvas đang trống</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
              Kéo node từ thư viện bên trái thả vào đây, hoặc nạp một workflow mẫu để bắt đầu ngay.
            </p>
            <button className="btn-primary mx-auto mt-4" onClick={() => useWorkflowStore.getState().setTemplatesOpen(true)}>
              <Icon name="LayoutTemplate" size={15} /> Chọn workflow mẫu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- toolbar */

function CanvasToolbar() {
  const rf = useReactFlow()
  const settings = useWorkflowStore((s) => s.settings)
  const updateSettings = useWorkflowStore((s) => s.updateSettings)
  const autoLayoutFn = useWorkflowStore((s) => s.autoLayout)
  const undo = useWorkflowStore((s) => s.undo)
  const redo = useWorkflowStore((s) => s.redo)
  const groupSelection = useWorkflowStore((s) => s.groupSelection)
  const validate = useWorkflowStore((s) => s.validate)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const i = setInterval(() => setZoom(rf.getZoom()), 400)
    return () => clearInterval(i)
  }, [rf])

  const Btn = ({ icon, label, onClick, active }) => (
    <Tooltip label={label} side="bottom">
      <button
        onClick={onClick}
        className={`grid h-8 w-8 place-items-center rounded-lg transition-all hover:bg-white/[0.09] hover:text-white active:scale-95 ${
          active ? 'bg-brand-500/22 text-brand-200' : 'text-slate-400'
        }`}
      >
        <Icon name={icon} size={15} />
      </button>
    </Tooltip>
  )

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.07] bg-ink-900/85 p-1 shadow-panel backdrop-blur-xl">
      <Btn icon="Undo2" label="Hoàn tác (Ctrl+Z)" onClick={undo} />
      <Btn icon="Redo2" label="Làm lại (Ctrl+Shift+Z)" onClick={redo} />
      <span className="mx-1 h-5 w-px bg-white/10" />
      <Btn icon="ZoomOut" label="Thu nhỏ" onClick={() => rf.zoomOut({ duration: 200 })} />
      <span className="tabular w-11 text-center text-[11.5px] font-medium text-slate-400">{Math.round(zoom * 100)}%</span>
      <Btn icon="ZoomIn" label="Phóng to" onClick={() => rf.zoomIn({ duration: 200 })} />
      <Btn icon="Maximize2" label="Căn giữa workflow (F)" onClick={() => rf.fitView({ padding: 0.22, duration: 500 })} />
      <span className="mx-1 h-5 w-px bg-white/10" />
      <Btn icon="LayoutGrid" label="Tự động sắp xếp (dagre)" onClick={() => autoLayoutFn('LR')} />
      <Btn icon="AlignVerticalJustifyStart" label="Sắp xếp dọc" onClick={() => autoLayoutFn('TB')} />
      <Btn icon="Group" label="Nhóm node đã chọn (Ctrl+G)" onClick={() => groupSelection()} />
      <span className="mx-1 h-5 w-px bg-white/10" />
      <Btn icon="Grid2x2" label="Bật/tắt snap lưới" active={settings.snapToGrid} onClick={() => updateSettings({ snapToGrid: !settings.snapToGrid })} />
      <Btn icon="Map" label="Bật/tắt mini map" active={settings.showMinimap} onClick={() => updateSettings({ showMinimap: !settings.showMinimap })} />
      <Btn icon="ShieldCheck" label="Kiểm tra lỗi workflow" onClick={() => validate()} />
    </div>
  )
}

/* -------------------------------------------------------------- legend */

function StatusLegend() {
  const nodes = useWorkflowStore((s) => s.nodes.filter((n) => n.type !== 'groupBox'))
  const counts = nodes.reduce((acc, n) => {
    acc[n.data.status] = (acc[n.data.status] || 0) + 1
    return acc
  }, {})
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-ink-900/85 px-3 py-2 shadow-panel backdrop-blur-xl">
      {Object.values(STATUS).map((s) => (
        <span key={s.id} className="flex items-center gap-1.5 text-[11px] text-slate-400" title={s.desc}>
          <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}66` }} />
          {s.label}
          {counts[s.id] ? <b className="tabular text-slate-200">{counts[s.id]}</b> : null}
        </span>
      ))}
    </div>
  )
}

/* -------------------------------------------------------- context menu */

function ContextMenu({ menu, onClose }) {
  const s = useWorkflowStore()
  const node = menu.node
  const items = node
    ? [
        { icon: 'Play', label: 'Chạy node này', fn: () => s.runNode(node.id) },
        { icon: 'Copy', label: 'Nhân bản', hint: 'Ctrl+D', fn: () => s.duplicateNodes([node.id]) },
        { icon: 'ClipboardCopy', label: 'Copy', hint: 'Ctrl+C', fn: () => s.copySelection() },
        { icon: node.data.collapsed ? 'ChevronDown' : 'ChevronUp', label: node.data.collapsed ? 'Mở rộng' : 'Thu gọn', fn: () => s.toggleCollapse(node.id) },
        { icon: 'Power', label: node.data.disabled ? 'Bật node' : 'Tắt node', fn: () => s.toggleDisabled(node.id) },
        { icon: 'Group', label: 'Nhóm các node đã chọn', hint: 'Ctrl+G', fn: () => s.groupSelection() },
        { sep: true },
        { icon: 'Trash2', label: 'Xoá node', hint: 'Del', danger: true, fn: () => s.deleteNodes([node.id]) },
      ]
    : [
        { icon: 'ClipboardPaste', label: 'Dán node', hint: 'Ctrl+V', fn: () => s.pasteClipboard() },
        { icon: 'LayoutGrid', label: 'Tự động sắp xếp', fn: () => s.autoLayout('LR') },
        { icon: 'LayoutTemplate', label: 'Nạp workflow mẫu', fn: () => s.setTemplatesOpen(true) },
        { sep: true },
        { icon: 'RotateCcw', label: 'Reset trạng thái', fn: () => s.resetWorkflow() },
      ]

  return (
    <div
      className="fixed z-[400] min-w-[212px] overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 p-1 shadow-panel backdrop-blur-xl animate-pop-in"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="my-1 h-px bg-white/[0.07]" />
        ) : (
          <button
            key={it.label}
            onClick={() => {
              it.fn()
              onClose()
            }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors ${
              it.danger ? 'text-red-300 hover:bg-red-500/15' : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
            }`}
          >
            <Icon name={it.icon} size={14} />
            <span className="flex-1 text-left">{it.label}</span>
            {it.hint && <span className="mono text-[10px] text-slate-600">{it.hint}</span>}
          </button>
        ),
      )}
    </div>
  )
}
