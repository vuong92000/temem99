/**
 * autoLayout.js — Tự động sắp xếp node bằng dagre (layered graph layout).
 */
import dagre from 'dagre'

export const NODE_W = 280
export const NODE_H = 132

export function autoLayout(nodes, edges, direction = 'LR') {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    nodesep: 48,
    ranksep: 110,
    marginx: 60,
    marginy: 60,
  })

  const flow = nodes.filter((n) => n.type !== 'groupBox')
  flow.forEach((n) => {
    g.setNode(n.id, {
      width: n.width || NODE_W,
      height: n.data?.collapsed ? 64 : n.height || NODE_H,
    })
  })
  edges.forEach((e) => {
    if (flow.find((n) => n.id === e.source) && flow.find((n) => n.id === e.target)) g.setEdge(e.source, e.target)
  })

  dagre.layout(g)

  return nodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return n
    return {
      ...n,
      parentNode: undefined,
      extent: undefined,
      position: { x: Math.round(pos.x - (n.width || NODE_W) / 2), y: Math.round(pos.y - (n.data?.collapsed ? 64 : n.height || NODE_H) / 2) },
    }
  })
}

/** Sắp xếp lưới đơn giản cho node rời rạc. */
export function gridLayout(nodes, cols = 4) {
  return nodes.map((n, i) => ({
    ...n,
    position: { x: 80 + (i % cols) * (NODE_W + 60), y: 80 + Math.floor(i / cols) * (NODE_H + 80) },
  }))
}
