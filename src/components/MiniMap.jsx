import React, { useMemo } from "react";
import { graphBounds } from "../lib/graph.js";
import { NODE_W } from "../data/nodeTemplates.js";

const MAP_W = 176;
const MAP_H = 104;

export default function MiniMap({ nodes, pan, zoom, viewport, onNavigate }) {
  const { box, scale, offsetX, offsetY } = useMemo(() => {
    const b = graphBounds(nodes);
    const padding = 40;
    const width = b.width + padding * 2;
    const height = b.height + padding * 2;
    const s = Math.min(MAP_W / width, MAP_H / height);
    return {
      box: b,
      scale: s,
      offsetX: (MAP_W - width * s) / 2 - (b.minX - padding) * s,
      offsetY: (MAP_H - height * s) / 2 - (b.minY - padding) * s,
    };
  }, [nodes]);

  const toMap = (x, y) => ({ left: x * scale + offsetX, top: y * scale + offsetY });

  const viewTopLeft = { x: -pan.x / zoom, y: -pan.y / zoom };
  const viewW = (viewport.width || 0) / zoom;
  const viewH = (viewport.height || 0) / zoom;

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const graphX = (mx - offsetX) / scale;
    const graphY = (my - offsetY) / scale;
    onNavigate({
      x: -(graphX * zoom) + (viewport.width || 0) / 2,
      y: -(graphY * zoom) + (viewport.height || 0) / 2,
    });
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-lg hidden md:block">
      <div className="text-[9px] text-slate-500 mb-1 px-0.5 font-semibold tracking-wide">MINI MAP</div>
      <div
        onClick={handleClick}
        className="relative bg-slate-950 rounded overflow-hidden cursor-pointer"
        style={{ width: MAP_W, height: MAP_H }}
      >
        {/* node chips */}
        {nodes.map((n) => {
          const p = toMap(n.x, n.y);
          return (
            <div
              key={n.id}
              className="absolute bg-indigo-500/80 rounded-[1px]"
              style={{ left: p.left, top: p.top, width: Math.max(3, NODE_W * scale), height: Math.max(2, 26 * scale) }}
            />
          );
        })}
        {/* viewport rectangle */}
        <div
          className="absolute border border-indigo-400/70 bg-indigo-400/10 pointer-events-none"
          style={{
            left: toMap(viewTopLeft.x, viewTopLeft.y).left,
            top: toMap(viewTopLeft.x, viewTopLeft.y).top,
            width: Math.max(6, viewW * scale),
            height: Math.max(6, viewH * scale),
          }}
        />
      </div>
    </div>
  );
}
