/**
 * useWorkflowStore.js — Nguồn sự thật duy nhất của app.
 */
import { create } from 'zustand'
import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow'
import { defaultConfig, getDef } from '../lib/nodeLibrary.js'
import { defaultWorkflow, makeNode, TEMPLATES } from '../lib/templates.js'
import { computeStaticStatus, runSingleNode, runWorkflow, validateWorkflow } from '../lib/workflowEngine.js'
import { autoLayout as dagreLayout } from '../lib/autoLayout.js'
import { buildFinalResult } from '../lib/exporters.js'

const STORAGE_KEY = 'aivwb:workflows'
const LAST_KEY = 'aivwb:last'
const SETTINGS_KEY = 'aivwb:settings'
const MAX_HISTORY = 60

let idSeq = 1
const uid = (prefix = 'n') => `${prefix}_${Date.now().toString(36)}${(idSeq++).toString(36)}`

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const writeLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const DEFAULT_SETTINGS = {
  runSpeed: 320,
  snapToGrid: true,
  showMinimap: true,
  animatedEdges: true,
  autoSave: true,
  gridSize: 16,
  theme: 'violet',
}

const initial = () => {
  const last = readLS(LAST_KEY, null)
  if (last?.nodes?.length) return { name: last.name || 'Untitled Workflow', nodes: last.nodes, edges: last.edges || [] }
  return defaultWorkflow()
}

export const useWorkflowStore = create((set, get) => {
  const snapshot = () => ({
    nodes: JSON.parse(JSON.stringify(get().nodes)),
    edges: JSON.parse(JSON.stringify(get().edges)),
  })

  const commit = () => {
    const past = [...get().past, snapshot()].slice(-MAX_HISTORY)
    set({ past, future: [] })
  }

  const boot = initial()

  return {
    /* ------------------------------------------------------------- state */
    workflowName: boot.name,
    nodes: boot.nodes,
    edges: boot.edges,
    past: [],
    future: [],
    selectedNodeIds: [],
    selectedEdgeIds: [],
    clipboard: null,
    logs: [{ level: 'info', message: 'Sẵn sàng. Workflow mẫu đã được nạp — bấm Run Workflow để chạy thử.', time: Date.now() }],
    results: {},
    contexts: {},
    finalResult: null,
    running: false,
    issues: [],
    toasts: [],
    settings: { ...DEFAULT_SETTINGS, ...readLS(SETTINGS_KEY, {}) },
    bottomOpen: true,
    bottomTab: 'result',
    rightOpen: true,
    leftOpen: true,
    settingsOpen: false,
    templatesOpen: false,
    savedList: readLS(STORAGE_KEY, {}),

    /* ------------------------------------------------------------ toasts */
    toast: (message, type = 'info', ttl = 3200) => {
      const id = uid('t')
      set({ toasts: [...get().toasts, { id, message, type }] })
      setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), ttl)
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

    log: (entry) => set({ logs: [...get().logs, { ...entry, time: Date.now() }].slice(-400) }),
    clearLogs: () => set({ logs: [] }),

    /* --------------------------------------------------------- ui toggles */
    setBottomOpen: (v) => set({ bottomOpen: v }),
    setBottomTab: (t) => set({ bottomTab: t, bottomOpen: true }),
    setRightOpen: (v) => set({ rightOpen: v }),
    setLeftOpen: (v) => set({ leftOpen: v }),
    setSettingsOpen: (v) => set({ settingsOpen: v }),
    setTemplatesOpen: (v) => set({ templatesOpen: v }),
    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch }
      set({ settings })
      writeLS(SETTINGS_KEY, settings)
    },

    /* ------------------------------------------------------ react-flow io */
    onNodesChange: (changes) => {
      const structural = changes.some((c) => c.type === 'remove')
      if (structural) commit()
      const nodes = applyNodeChanges(changes, get().nodes)
      const selected = nodes.filter((n) => n.selected).map((n) => n.id)
      set({ nodes, selectedNodeIds: selected })
      if (structural) get().persistAuto()
    },
    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === 'remove')) commit()
      const edges = applyEdgeChanges(changes, get().edges)
      set({ edges, selectedEdgeIds: edges.filter((e) => e.selected).map((e) => e.id) })
    },
    onConnect: (connection) => {
      commit()
      const edges = addEdge(
        {
          ...connection,
          id: `e_${connection.source}_${connection.sourceHandle || 'out'}_${connection.target}_${connection.targetHandle || 'in'}`,
          type: 'flowEdge',
        },
        get().edges,
      )
      set({ edges })
      get().refreshStatuses()
      get().toast('Đã nối dây giữa 2 node', 'success')
    },
    onNodeDragStart: () => commit(),
    onNodeDragStop: () => get().persistAuto(),

    /* -------------------------------------------------------- node CRUD */
    addNode: (type, position, config = {}) => {
      const def = getDef(type)
      if (!def) return null
      commit()
      const node = makeNode(uid('n'), type, position, config)
      set({ nodes: [...get().nodes, { ...node, selected: false }] })
      get().refreshStatuses()
      get().toast(`Đã thêm node "${def.label}"`, 'success')
      return node.id
    },

    deleteNodes: (ids) => {
      if (!ids?.length) return
      commit()
      // nếu xoá group box thì giải phóng các node con (tránh mồ côi parentNode)
      const groups = get().nodes.filter((n) => ids.includes(n.id) && n.type === 'groupBox')
      const released = get().nodes.map((n) => {
        const g = groups.find((x) => x.id === n.parentNode)
        return g ? { ...n, parentNode: undefined, extent: undefined, position: { x: n.position.x + g.position.x, y: n.position.y + g.position.y } } : n
      })
      set({ nodes: released })
      set({
        nodes: get().nodes.filter((n) => !ids.includes(n.id)),
        edges: get().edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)),
        selectedNodeIds: [],
      })
      get().refreshStatuses()
      get().persistAuto()
      get().toast(`Đã xoá ${ids.length} node`, 'info')
    },

    deleteEdges: (ids) => {
      if (!ids?.length) return
      commit()
      set({ edges: get().edges.filter((e) => !ids.includes(e.id)) })
      get().refreshStatuses()
      get().toast('Đã xoá dây nối', 'info')
    },

    duplicateNodes: (ids) => {
      const nodes = get().nodes.filter((n) => ids.includes(n.id))
      if (!nodes.length) return
      commit()
      const map = {}
      const clones = nodes.map((n) => {
        const id = uid('n')
        map[n.id] = id
        return {
          ...JSON.parse(JSON.stringify(n)),
          id,
          position: { x: n.position.x + 48, y: n.position.y + 48 },
          selected: true,
          data: { ...JSON.parse(JSON.stringify(n.data)), status: 'idle', result: null },
        }
      })
      const innerEdges = get()
        .edges.filter((e) => map[e.source] && map[e.target])
        .map((e) => ({ ...e, id: uid('e'), source: map[e.source], target: map[e.target] }))
      set({
        nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), ...clones],
        edges: [...get().edges, ...innerEdges],
        selectedNodeIds: clones.map((c) => c.id),
      })
      get().refreshStatuses()
      get().toast(`Đã nhân bản ${clones.length} node`, 'success')
    },

    updateNodeData: (id, patch, withHistory = false) => {
      if (withHistory) commit()
      set({
        nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      })
      if (withHistory) get().persistAuto()
    },

    updateNodeConfig: (id, key, value) => {
      set({
        nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value }, status: n.data.status === 'success' ? 'ready' : n.data.status } } : n)),
      })
      get().persistAuto()
    },

    resetNodeConfig: (id) => {
      commit()
      const node = get().nodes.find((n) => n.id === id)
      if (!node) return
      set({
        nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, config: defaultConfig(n.data.type), result: null, status: 'idle' } } : n)),
      })
      get().toast('Đã reset cấu hình node', 'info')
    },

    toggleCollapse: (id) => {
      const node = get().nodes.find((n) => n.id === id)
      if (!node) return
      get().updateNodeData(id, { collapsed: !node.data.collapsed })
    },

    toggleDisabled: (id) => {
      const node = get().nodes.find((n) => n.id === id)
      if (!node) return
      get().updateNodeData(id, { disabled: !node.data.disabled, status: !node.data.disabled ? 'disabled' : 'idle' }, true)
    },

    selectNode: (id, additive = false) => {
      set({
        nodes: get().nodes.map((n) => ({ ...n, selected: additive ? n.selected || n.id === id : n.id === id })),
        selectedNodeIds: additive ? Array.from(new Set([...get().selectedNodeIds, id])) : [id],
        rightOpen: true,
      })
    },

    selectAll: () => set({ nodes: get().nodes.map((n) => ({ ...n, selected: true })), selectedNodeIds: get().nodes.map((n) => n.id) }),

    /* ------------------------------------------------------ copy / paste */
    copySelection: () => {
      const ids = get().selectedNodeIds
      if (!ids.length) return
      const nodes = get().nodes.filter((n) => ids.includes(n.id))
      const edges = get().edges.filter((e) => ids.includes(e.source) && ids.includes(e.target))
      set({ clipboard: JSON.parse(JSON.stringify({ nodes, edges })) })
      get().toast(`Đã copy ${nodes.length} node`, 'success')
    },
    pasteClipboard: (offset = { x: 60, y: 60 }) => {
      const clip = get().clipboard
      if (!clip?.nodes?.length) return
      commit()
      const map = {}
      const clones = clip.nodes.map((n) => {
        const id = uid('n')
        map[n.id] = id
        return {
          ...n,
          id,
          position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
          selected: true,
          data: { ...n.data, status: 'idle', result: null },
        }
      })
      const edges = clip.edges.map((e) => ({ ...e, id: uid('e'), source: map[e.source], target: map[e.target] }))
      set({
        nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), ...clones],
        edges: [...get().edges, ...edges],
        selectedNodeIds: clones.map((c) => c.id),
      })
      get().refreshStatuses()
      get().toast(`Đã dán ${clones.length} node`, 'success')
    },

    /* ------------------------------------------------------------- group */
    groupSelection: (label = 'Nhóm node') => {
      const ids = get().selectedNodeIds
      if (ids.length < 2) {
        get().toast('Chọn ít nhất 2 node để nhóm', 'warning')
        return
      }
      commit()
      const nodes = get().nodes
      const sel = nodes.filter((n) => ids.includes(n.id))
      const pad = 48
      const minX = Math.min(...sel.map((n) => n.position.x)) - pad
      const minY = Math.min(...sel.map((n) => n.position.y)) - pad - 28
      const maxX = Math.max(...sel.map((n) => n.position.x + (n.width || 280))) + pad
      const maxY = Math.max(...sel.map((n) => n.position.y + (n.height || 140))) + pad
      const gid = uid('g')
      const groupNode = {
        id: gid,
        type: 'groupBox',
        position: { x: minX, y: minY },
        style: { width: maxX - minX, height: maxY - minY },
        data: { label, color: '#7c5cff' },
        selectable: true,
        draggable: true,
        zIndex: -1,
      }
      const updated = nodes.map((n) =>
        ids.includes(n.id)
          ? { ...n, parentNode: gid, extent: 'parent', position: { x: n.position.x - minX, y: n.position.y - minY }, selected: false }
          : n,
      )
      set({ nodes: [groupNode, ...updated], selectedNodeIds: [] })
      get().toast('Đã nhóm node', 'success')
    },

    ungroup: (groupId) => {
      commit()
      const nodes = get().nodes
      const group = nodes.find((n) => n.id === groupId)
      if (!group) return
      const updated = nodes
        .filter((n) => n.id !== groupId)
        .map((n) =>
          n.parentNode === groupId
            ? { ...n, parentNode: undefined, extent: undefined, position: { x: n.position.x + group.position.x, y: n.position.y + group.position.y } }
            : n,
        )
      set({ nodes: updated })
      get().toast('Đã bỏ nhóm', 'info')
    },

    /* ---------------------------------------------------------- undo/redo */
    undo: () => {
      const past = get().past
      if (!past.length) return get().toast('Không còn thao tác để hoàn tác', 'warning')
      const previous = past[past.length - 1]
      set({
        past: past.slice(0, -1),
        future: [snapshot(), ...get().future].slice(0, MAX_HISTORY),
        nodes: previous.nodes,
        edges: previous.edges,
      })
      get().toast('Undo', 'info', 1200)
    },
    redo: () => {
      const future = get().future
      if (!future.length) return get().toast('Không còn thao tác để làm lại', 'warning')
      const next = future[0]
      set({ future: future.slice(1), past: [...get().past, snapshot()], nodes: next.nodes, edges: next.edges })
      get().toast('Redo', 'info', 1200)
    },

    /* ------------------------------------------------------- auto layout */
    autoLayout: (direction = 'LR') => {
      commit()
      const nodes = dagreLayout(get().nodes, get().edges, direction)
      set({ nodes: nodes.filter((n) => n.type !== 'groupBox') })
      get().toast('Đã tự động sắp xếp workflow', 'success')
    },

    /* -------------------------------------------------------- validation */
    refreshStatuses: () => {
      const { nodes, edges } = get()
      set({
        nodes: nodes.map((n) =>
          n.type === 'groupBox' || ['running', 'success', 'error'].includes(n.data.status)
            ? n
            : { ...n, data: { ...n.data, status: computeStaticStatus(n, edges) } },
        ),
      })
    },

    validate: (silent = false) => {
      const issues = validateWorkflow(get().nodes, get().edges)
      set({ issues })
      if (!silent) {
        const errors = issues.filter((i) => i.level === 'error')
        if (!issues.length) get().toast('Workflow hợp lệ — sẵn sàng chạy!', 'success')
        else if (errors.length) get().toast(`Có ${errors.length} lỗi cần sửa trước khi chạy`, 'error')
        else get().toast(`${issues.length} cảnh báo — workflow vẫn chạy được`, 'warning')
        set({ bottomTab: 'issues', bottomOpen: true })
      }
      return issues
    },

    /* --------------------------------------------------------------- run */
    runAll: async () => {
      if (get().running) return
      const issues = get().validate(true)
      const errors = issues.filter((i) => i.level === 'error')
      if (errors.length) {
        set({ bottomTab: 'issues', bottomOpen: true })
        get().toast(`Không thể chạy: ${errors[0].message}`, 'error', 5000)
        get().log({ level: 'error', message: `Kiểm tra thất bại — ${errors.length} lỗi.` })
        return
      }
      set({
        running: true,
        logs: [],
        results: {},
        contexts: {},
        finalResult: null,
        bottomOpen: true,
        bottomTab: 'logs',
        nodes: get().nodes.map((n) => (n.type === 'groupBox' ? n : { ...n, data: { ...n.data, status: n.data.disabled ? 'disabled' : 'idle', result: null } })),
      })

      const res = await runWorkflow({
        nodes: get().nodes,
        edges: get().edges,
        speed: get().settings.runSpeed,
        callbacks: {
          onStatus: (id, status) =>
            set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n)) }),
          onLog: (entry) => get().log(entry),
          onNodeResult: (id, result, ctx) => {
            set({
              results: { ...get().results, [id]: result },
              contexts: { ...get().contexts, [id]: ctx },
              nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, result } } : n)),
            })
          },
        },
      })

      if (res.ok) {
        const exportNode = get().nodes.find((n) => n.data.type === 'exportNode')
        const final = buildFinalResult(res.finalContext, {
          workflowName: exportNode?.data.config?.name || get().workflowName,
          nodeCount: get().nodes.filter((n) => n.type !== 'groupBox').length,
          edgeCount: get().edges.length,
        })
        set({ finalResult: final, running: false, bottomTab: 'result' })
        get().toast('Workflow chạy thành công! Kết quả đã sẵn sàng.', 'success', 4200)
      } else {
        set({ running: false, bottomTab: 'logs' })
        get().toast(res.error || 'Workflow gặp lỗi', 'error', 5200)
      }
    },

    runNode: async (id) => {
      const node = get().nodes.find((n) => n.id === id)
      if (!node) return
      set({ bottomOpen: true })
      const res = await runSingleNode({
        node,
        nodes: get().nodes,
        edges: get().edges,
        contexts: get().contexts,
        callbacks: {
          onStatus: (nid, status) => set({ nodes: get().nodes.map((n) => (n.id === nid ? { ...n, data: { ...n.data, status } } : n)) }),
          onLog: (entry) => get().log(entry),
          onNodeResult: (nid, result, ctx) =>
            set({
              results: { ...get().results, [nid]: result },
              contexts: { ...get().contexts, [nid]: ctx },
              nodes: get().nodes.map((n) => (n.id === nid ? { ...n, data: { ...n.data, result } } : n)),
            }),
        },
      })
      if (res.ok) get().toast(`Node "${node.data.label}" chạy xong`, 'success')
      else get().toast(res.error, 'error')
      return res
    },

    /* ------------------------------------------------------ persistence */
    persistAuto: () => {
      if (!get().settings.autoSave) return
      writeLS(LAST_KEY, { name: get().workflowName, nodes: get().nodes, edges: get().edges })
    },

    setWorkflowName: (name) => {
      set({ workflowName: name })
      get().persistAuto()
    },

    saveWorkflow: (name) => {
      const key = name || get().workflowName || 'Untitled Workflow'
      const list = { ...readLS(STORAGE_KEY, {}) }
      list[key] = { name: key, nodes: get().nodes, edges: get().edges, savedAt: Date.now() }
      const ok = writeLS(STORAGE_KEY, list)
      writeLS(LAST_KEY, { name: key, nodes: get().nodes, edges: get().edges })
      set({ savedList: list, workflowName: key })
      get().toast(ok ? `Đã lưu workflow "${key}"` : 'Lưu thất bại (localStorage đầy)', ok ? 'success' : 'error')
    },

    refreshSaved: () => set({ savedList: readLS(STORAGE_KEY, {}) }),

    loadWorkflow: (key) => {
      const list = readLS(STORAGE_KEY, {})
      const wf = list[key]
      if (!wf) return get().toast('Không tìm thấy workflow đã lưu', 'error')
      commit()
      set({ nodes: wf.nodes, edges: wf.edges, workflowName: wf.name, results: {}, contexts: {}, finalResult: null, logs: [] })
      get().refreshStatuses()
      get().toast(`Đã tải workflow "${wf.name}"`, 'success')
    },

    deleteSaved: (key) => {
      const list = { ...readLS(STORAGE_KEY, {}) }
      delete list[key]
      writeLS(STORAGE_KEY, list)
      set({ savedList: list })
      get().toast('Đã xoá workflow đã lưu', 'info')
    },

    loadTemplate: (templateId) => {
      const tpl = TEMPLATES.find((t) => t.id === templateId)
      if (!tpl) return
      commit()
      const wf = tpl.build()
      set({
        nodes: wf.nodes,
        edges: wf.edges,
        workflowName: wf.name,
        results: {},
        contexts: {},
        finalResult: null,
        logs: [{ level: 'info', message: `Đã nạp workflow mẫu "${wf.name}".`, time: Date.now() }],
        templatesOpen: false,
      })
      get().refreshStatuses()
      get().persistAuto()
      get().toast(`Đã nạp mẫu "${tpl.name}"`, 'success')
    },

    newWorkflow: () => {
      commit()
      set({
        nodes: [],
        edges: [],
        workflowName: 'Untitled Workflow',
        results: {},
        contexts: {},
        finalResult: null,
        issues: [],
        logs: [{ level: 'info', message: 'Workflow mới — kéo node từ sidebar vào canvas để bắt đầu.', time: Date.now() }],
      })
      get().persistAuto()
      get().toast('Đã tạo workflow mới', 'success')
    },

    resetWorkflow: () => {
      commit()
      set({
        nodes: get().nodes.map((n) => (n.type === 'groupBox' ? n : { ...n, data: { ...n.data, status: 'idle', result: null } })),
        results: {},
        contexts: {},
        finalResult: null,
        logs: [{ level: 'info', message: 'Đã reset trạng thái toàn bộ node.', time: Date.now() }],
        issues: [],
      })
      get().refreshStatuses()
      get().toast('Đã reset workflow', 'info')
    },

    exportWorkflowJson: () => ({
      app: 'AI Video Workflow Builder',
      version: 1,
      name: get().workflowName,
      exportedAt: new Date().toISOString(),
      nodes: get().nodes,
      edges: get().edges,
    }),

    importWorkflowJson: (json) => {
      try {
        const data = typeof json === 'string' ? JSON.parse(json) : json
        if (!Array.isArray(data.nodes)) throw new Error('File JSON không hợp lệ (thiếu "nodes").')
        commit()
        set({
          nodes: data.nodes,
          edges: data.edges || [],
          workflowName: data.name || 'Imported Workflow',
          results: {},
          contexts: {},
          finalResult: null,
          logs: [{ level: 'info', message: `Đã import workflow "${data.name || 'Imported'}" (${data.nodes.length} node).`, time: Date.now() }],
        })
        get().refreshStatuses()
        get().toast('Import workflow thành công', 'success')
        return true
      } catch (err) {
        get().toast(`Import thất bại: ${err.message}`, 'error', 5000)
        return false
      }
    },
  }
})

export const selectedNode = (state) => state.nodes.find((n) => n.id === state.selectedNodeIds[state.selectedNodeIds.length - 1]) || null
