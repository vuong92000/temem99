import React from "react";
import { portPosition, edgePath } from "../lib/graph.js";

function bezierMid(a, b) {
  const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
  const p1 = { x: a.x + dx, y: a.y };
  const p2 = { x: b.x - dx, y: b.y };
  return {
    x: (a.x + 3 * p1.x + 3 * p2.x + b.x) / 8,
    y: (a.y + 3 * p1.y + 3 * p2.y + b.y) / 8,
  };
}

export default function Connections({ nodes, connections, connecting, pan, zoom, onDeleteConnection }) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const anchorOf = (nodeId, portId, kind) => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    return portPosition(node, portId, kind);
  };

  let pendingPath = "";
  if (connecting) {
    const start = anchorOf(connecting.fromNode, connecting.fromPort, "output");
    if (start) pendingPath = edgePath(start, { x: connecting.mouseX, y: connecting.mouseY });
  }

  return (
    <svg className="absolute inset-0 w-full h-full z-0" style={{ overflow: "visible" }}>
      <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
        {connections.map((conn) => {
          const from = anchorOf(conn.fromNode, conn.fromPort, "output");
          const to = anchorOf(conn.toNode, conn.toPort, "input");
          if (!from || !to) return null;
          const path = edgePath(from, to);
          const mid = bezierMid(from, to);
          const source = nodeMap.get(conn.fromNode);
          const running = source?.status === "running";
          const done = source?.status === "success";

          return (
            <g key={conn.id} className="group cursor-pointer" onClick={() => onDeleteConnection(conn.id)}>
              {/* invisible fat hit area */}
              <path d={path} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: "stroke" }} />
              <path
                d={path}
                fill="none"
                stroke={running ? "#a855f7" : done ? "#6366f1" : "#475569"}
                strokeWidth={2.5}
                strokeDasharray={running ? "6 6" : undefined}
                className={`transition-all group-hover:stroke-rose-400 ${running ? "animate-dash-flow" : ""}`}
                style={{ pointerEvents: "none" }}
              />
              <g className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ pointerEvents: "none" }}>
                <circle cx={mid.x} cy={mid.y} r={8} fill="#0f172a" stroke="#f43f5e" strokeWidth={1.5} />
                <path
                  d={`M ${mid.x - 3} ${mid.y - 3} L ${mid.x + 3} ${mid.y + 3} M ${mid.x + 3} ${mid.y - 3} L ${mid.x - 3} ${mid.y + 3}`}
                  stroke="#f43f5e"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </g>
            </g>
          );
        })}

        {pendingPath && (
          <path
            d={pendingPath}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="5 5"
            className="animate-dash-flow"
          />
        )}
      </g>
    </svg>
  );
}
