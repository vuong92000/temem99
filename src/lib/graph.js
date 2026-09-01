import { NODE_W, PORT_TOP, PORT_GAP } from "../data/nodeTemplates.js";

/**
 * Absolute canvas position of a port.
 * Ports live on the left (inputs) / right (outputs) edge of the card,
 * stacked PORT_GAP pixels apart starting at PORT_TOP.
 */
export function portPosition(node, portId, kind) {
  const list = kind === "output" ? node.outputs || [] : node.inputs || [];
  const index = Math.max(0, list.indexOf(portId));
  return {
    x: kind === "output" ? node.x + NODE_W : node.x,
    y: node.y + PORT_TOP + index * PORT_GAP,
  };
}

/** Smooth cubic bezier between two anchors. */
export function edgePath(a, b) {
  const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

/**
 * Validation rules for a new connection.
 * Returns { ok: boolean, reason?: string }
 */
export function validateConnection(connections, candidate) {
  if (candidate.fromNode === candidate.toNode) {
    return { ok: false, reason: "Không thể nối một Node với chính nó." };
  }
  const duplicate = connections.some(
    (c) =>
      c.fromNode === candidate.fromNode &&
      c.fromPort === candidate.fromPort &&
      c.toNode === candidate.toNode &&
      c.toPort === candidate.toPort
  );
  if (duplicate) return { ok: false, reason: "Kết nối này đã tồn tại." };

  const cycle = createsCycle(
    [...connections, { ...candidate, id: "__tmp__" }],
    candidate.fromNode,
    candidate.toNode
  );
  if (cycle) return { ok: false, reason: "Kết nối tạo vòng lặp (cycle) — Workflow phải là đồ thị có hướng không chu trình." };

  return { ok: true };
}

/** Depth-first search: is `target` reachable from `source`? */
function createsCycle(connections, source, target) {
  const adjacency = new Map();
  connections.forEach((c) => {
    if (!adjacency.has(c.fromNode)) adjacency.set(c.fromNode, []);
    adjacency.get(c.fromNode).push(c.toNode);
  });
  const stack = [target];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === source) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    (adjacency.get(current) || []).forEach((next) => stack.push(next));
  }
  return false;
}

/**
 * Kahn topological sort. Nodes that cannot be ordered (because of an
 * unexpected cycle) are appended at the end so execution never stalls.
 */
export function topologicalOrder(nodes, connections) {
  const indegree = new Map(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map();

  connections.forEach((c) => {
    if (!indegree.has(c.fromNode) || !indegree.has(c.toNode)) return;
    indegree.set(c.toNode, indegree.get(c.toNode) + 1);
    if (!adjacency.has(c.fromNode)) adjacency.set(c.fromNode, []);
    adjacency.get(c.fromNode).push(c.toNode);
  });

  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const ordered = [];
  while (queue.length) {
    const id = queue.shift();
    ordered.push(id);
    (adjacency.get(id) || []).forEach((next) => {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    });
  }

  if (ordered.length < nodes.length) {
    const placed = new Set(ordered);
    nodes.forEach((n) => {
      if (!placed.has(n.id)) ordered.push(n.id);
    });
  }
  return ordered;
}

/** Longest-path layering: every node sits one column right of its inputs. */
export function layeredLayout(nodes, connections) {
  const depth = new Map(nodes.map((n) => [n.id, 0]));
  const order = topologicalOrder(nodes, connections);

  order.forEach((id) => {
    const incoming = connections.filter((c) => c.toNode === id);
    const parentDepth = incoming.reduce((acc, c) => Math.max(acc, (depth.get(c.fromNode) ?? 0) + 1), 0);
    depth.set(id, parentDepth);
  });

  const columns = new Map();
  nodes.forEach((n) => {
    const d = depth.get(n.id) ?? 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d).push(n);
  });

  const COL_W = 320;
  const ROW_H = 210;
  const positioned = new Map();
  [...columns.keys()]
    .sort((a, b) => a - b)
    .forEach((d) => {
      columns
        .get(d)
        .slice()
        .sort((a, b) => a.y - b.y)
        .forEach((node, row) => {
          positioned.set(node.id, { x: 60 + d * COL_W, y: 80 + row * ROW_H });
        });
    });

  return nodes.map((n) => ({ ...n, ...(positioned.get(n.id) || {}) }));
}

/** Bounding box of all nodes (used by "fit view" and the mini map). */
export function graphBounds(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + 190); // approximate card height
  });
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Nodes whose declared inputs are not fed by any connection. */
export function unconnectedInputs(nodes, connections) {
  return nodes.filter((n) => (n.inputs || []).length > 0 && !connections.some((c) => c.toNode === n.id));
}

export const clone = (value) => JSON.parse(JSON.stringify(value));
