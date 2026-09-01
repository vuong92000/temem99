/**
 * workflowEngine.js
 * ---------------------------------------------------------------------------
 * Topological sort, validation, và bộ chạy workflow theo đúng thứ tự dây nối.
 */

import { getDef } from './nodeLibrary.js'

export const STATUS = {
  idle: { id: 'idle', label: 'Idle', color: '#7d8598', icon: 'Circle', desc: 'Chưa chạy' },
  ready: { id: 'ready', label: 'Ready', color: '#60a5fa', icon: 'CircleDot', desc: 'Đã đủ dữ liệu' },
  warning: { id: 'warning', label: 'Warning', color: '#fbbf24', icon: 'TriangleAlert', desc: 'Thiếu dữ liệu' },
  running: { id: 'running', label: 'Running', color: '#7c5cff', icon: 'Loader', desc: 'Đang xử lý' },
  success: { id: 'success', label: 'Success', color: '#4ade80', icon: 'CircleCheckBig', desc: 'Hoàn thành' },
  error: { id: 'error', label: 'Error', color: '#f87171', icon: 'CircleX', desc: 'Có lỗi' },
  disabled: { id: 'disabled', label: 'Disabled', color: '#4b5565', icon: 'Ban', desc: 'Bị bỏ qua' },
}

const isFlowNode = (n) => n.type !== 'groupBox'

/* ------------------------------------------------------------ topo order */

export function computeOrder(nodes, edges) {
  const flow = nodes.filter(isFlowNode)
  const ids = new Set(flow.map((n) => n.id))
  const validEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target))
  const indeg = new Map(flow.map((n) => [n.id, 0]))
  const adj = new Map(flow.map((n) => [n.id, []]))
  validEdges.forEach((e) => {
    adj.get(e.source).push(e.target)
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1)
  })
  // ổn định thứ tự: node bên trái chạy trước khi cùng bậc
  const queue = flow
    .filter((n) => (indeg.get(n.id) || 0) === 0)
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
    .map((n) => n.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    adj.get(id)?.forEach((t) => {
      indeg.set(t, indeg.get(t) - 1)
      if (indeg.get(t) === 0) queue.push(t)
    })
  }
  const cycleNodes = flow.filter((n) => !order.includes(n.id)).map((n) => n.id)
  return { order, cycleNodes, edges: validEdges }
}

/* ------------------------------------------------------------- validation */

export function validateWorkflow(nodes, edges) {
  const issues = []
  const flow = nodes.filter(isFlowNode)
  if (!flow.length) {
    issues.push({ level: 'error', message: 'Workflow trống — hãy kéo node vào canvas.' })
    return issues
  }
  const { cycleNodes } = computeOrder(flow, edges)

  flow.forEach((node) => {
    const def = getDef(node.data.type)
    if (!def) {
      issues.push({ level: 'error', nodeId: node.id, message: `Node "${node.data.label}" có type không hợp lệ.` })
      return
    }
    const incoming = edges.filter((e) => e.target === node.id)
    const outgoing = edges.filter((e) => e.source === node.id)

    if (!incoming.length && !outgoing.length)
      issues.push({ level: 'warning', nodeId: node.id, message: `"${node.data.label}" đang đứng một mình — chưa nối dây với node nào.` })
    else if (def.inputs.some((i) => i.required) && !incoming.length)
      issues.push({ level: 'error', nodeId: node.id, message: `"${node.data.label}" chưa được nối input bắt buộc.` })

    def.inputs
      .filter((i) => i.required)
      .forEach((i) => {
        if (incoming.length && !incoming.some((e) => (e.targetHandle || 'in') === i.id) && def.inputs.length > 1)
          issues.push({ level: 'warning', nodeId: node.id, message: `"${node.data.label}" thiếu input bắt buộc: ${i.label}.` })
      })

    if (def.outputs.length && !outgoing.length && !def.isTerminal && def.group !== "output")
      issues.push({ level: 'warning', nodeId: node.id, message: `"${node.data.label}" chưa nối output tới node nào.` })

    // thiếu cấu hình
    const cfg = node.data.config || {}
    const emptyRequired = (def.fields || []).filter((f) => f.required && !cfg[f.key])
    emptyRequired.forEach((f) => issues.push({ level: 'warning', nodeId: node.id, message: `"${node.data.label}" thiếu cấu hình: ${f.label}.` }))
  })

  cycleNodes.forEach((id) => {
    const n = flow.find((x) => x.id === id)
    issues.push({ level: 'error', nodeId: id, message: `Phát hiện vòng lặp tại "${n?.data.label || id}" — workflow không thể xác định thứ tự chạy.` })
  })

  const terminals = flow.filter((n) => getDef(n.data.type)?.isTerminal)
  if (!terminals.length) issues.push({ level: 'warning', message: 'Workflow chưa có node đầu ra (Export / Download / Copy).' })

  return issues
}

/* --------------------------------------------------------------- merging */

export function mergeContexts(list) {
  const out = {}
  list.forEach((ctx) => {
    Object.entries(ctx || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      if (Array.isArray(v) && Array.isArray(out[k])) {
        const merged = [...out[k], ...v]
        out[k] = k === 'images' ? merged : Array.from(new Set(merged.map((x) => JSON.stringify(x)))).map((x) => JSON.parse(x))
      } else out[k] = v
    })
  })
  return out
}

/* ------------------------------------------------------------------- run */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Chạy toàn bộ workflow.
 * callbacks: { onStatus(nodeId, status), onLog(entry), onNodeResult(nodeId, result, ctx) }
 */
export async function runWorkflow({ nodes, edges, callbacks = {}, speed = 320 }) {
  const { onStatus = () => {}, onLog = () => {}, onNodeResult = () => {} } = callbacks
  const flow = nodes.filter(isFlowNode)
  const byId = new Map(flow.map((n) => [n.id, n]))
  const { order, cycleNodes } = computeOrder(flow, edges)

  if (cycleNodes.length) {
    const err = `Workflow có vòng lặp (${cycleNodes.length} node) — vui lòng gỡ dây nối vòng.`
    onLog({ level: 'error', message: err })
    return { ok: false, error: err, contexts: {}, results: {} }
  }

  const contexts = {} // nodeId -> output context
  const results = {} // nodeId -> result object
  const skipped = new Set()
  let finalContext = {}
  const started = Date.now()

  onLog({ level: 'info', message: `▶ Bắt đầu chạy workflow — ${order.length} node theo thứ tự dây nối.` })

  for (const id of order) {
    const node = byId.get(id)
    const def = getDef(node.data.type)
    if (!def) continue

    const incoming = edges.filter((e) => e.target === id)

    if (node.data.disabled) {
      skipped.add(id)
      onStatus(id, 'disabled')
      onLog({ level: 'warn', nodeId: id, message: `⊘ Bỏ qua "${node.data.label}" (đã tắt).` })
      contexts[id] = mergeContexts(incoming.map((e) => contexts[e.source]).filter(Boolean))
      continue
    }

    // node bị bỏ nhánh bởi Condition
    const activeIncoming = incoming.filter((e) => {
      if (skipped.has(e.source)) return false
      const srcBranch = results[e.source]?.__activeBranch
      if (srcBranch) return (e.sourceHandle || 'out') === srcBranch
      return true
    })
    if (incoming.length && !activeIncoming.length) {
      skipped.add(id)
      onStatus(id, 'disabled')
      onLog({ level: 'warn', nodeId: id, message: `⊘ Nhánh không hoạt động — bỏ qua "${node.data.label}".` })
      continue
    }

    const ctx = mergeContexts(activeIncoming.map((e) => contexts[e.source]).filter(Boolean))

    if (def.inputs.some((i) => i.required) && !incoming.length) {
      onStatus(id, 'error')
      const msg = `✖ "${node.data.label}" thiếu input bắt buộc — workflow dừng lại.`
      onLog({ level: 'error', nodeId: id, message: msg })
      return { ok: false, error: msg, contexts, results, finalContext }
    }

    onStatus(id, 'running')
    onLog({ level: 'info', nodeId: id, message: `⟳ Đang chạy "${node.data.label}"...` })
    const t0 = performance.now()
    await sleep(def.delayMs ? def.delayMs(node.data.config || {}) : speed)

    try {
      const out = def.run({
        ctx,
        config: node.data.config || {},
        node,
        inputs: activeIncoming,
      })
      const result = { ...(out.result || {}) }
      if (out.activeBranch) result.__activeBranch = out.activeBranch
      results[id] = result
      contexts[id] = { ...ctx, ...(out.patch || {}) }
      finalContext = mergeContexts([finalContext, contexts[id]])

      const ms = Math.round(performance.now() - t0)
      if (out.warning) {
        onStatus(id, 'warning')
        onLog({ level: 'warn', nodeId: id, message: `⚠ "${node.data.label}": ${out.warning} (${ms}ms)` })
      } else {
        onStatus(id, 'success')
        onLog({ level: 'success', nodeId: id, message: `✔ "${node.data.label}" hoàn thành (${ms}ms)` })
      }
      onNodeResult(id, result, contexts[id])
    } catch (err) {
      onStatus(id, 'error')
      const msg = `✖ Lỗi tại "${node.data.label}": ${err.message}`
      onLog({ level: 'error', nodeId: id, message: msg })
      return { ok: false, error: msg, contexts, results, finalContext }
    }
  }

  const totalMs = Date.now() - started
  onLog({ level: 'success', message: `✅ Workflow hoàn tất trong ${(totalMs / 1000).toFixed(2)}s — ${order.length - skipped.size} node đã chạy.` })
  return { ok: true, contexts, results, finalContext, ms: totalMs }
}

/** Chạy 1 node riêng lẻ, lấy context từ các node cha đã có kết quả. */
export async function runSingleNode({ node, nodes, edges, contexts = {}, callbacks = {} }) {
  const { onStatus = () => {}, onLog = () => {}, onNodeResult = () => {} } = callbacks
  const def = getDef(node.data.type)
  if (!def) return { ok: false, error: 'Node type không hợp lệ' }
  const incoming = edges.filter((e) => e.target === node.id)
  const ctx = mergeContexts(incoming.map((e) => contexts[e.source]).filter(Boolean))

  onStatus(node.id, 'running')
  onLog({ level: 'info', nodeId: node.id, message: `⟳ Test node "${node.data.label}"...` })
  await sleep(280)
  try {
    const out = def.run({ ctx, config: node.data.config || {}, node, inputs: incoming })
    const result = { ...(out.result || {}) }
    if (out.activeBranch) result.__activeBranch = out.activeBranch
    onStatus(node.id, out.warning ? 'warning' : 'success')
    onLog({
      level: out.warning ? 'warn' : 'success',
      nodeId: node.id,
      message: out.warning ? `⚠ ${node.data.label}: ${out.warning}` : `✔ Test "${node.data.label}" thành công.`,
    })
    const nextCtx = { ...ctx, ...(out.patch || {}) }
    onNodeResult(node.id, result, nextCtx)
    return { ok: true, result, context: nextCtx }
  } catch (err) {
    onStatus(node.id, 'error')
    onLog({ level: 'error', nodeId: node.id, message: `✖ ${node.data.label}: ${err.message}` })
    return { ok: false, error: err.message }
  }
}

/** Trạng thái tĩnh (chưa chạy): ready / warning tuỳ đã đủ dây nối chưa. */
export function computeStaticStatus(node, edges) {
  const def = getDef(node.data.type)
  if (!def) return 'error'
  if (node.data.disabled) return 'disabled'
  const incoming = edges.filter((e) => e.target === node.id)
  if (def.inputs.some((i) => i.required) && !incoming.length) return 'warning'
  return 'ready'
}
