import React from "react";
import { Copy, Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { NODE_W, PORT_TOP, PORT_GAP, getTemplate, getCategory } from "../data/nodeTemplates.js";

const formatValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
};

const prettyKey = (key) => key.replace(/_/g, " ");

function Port({ portId, kind, index, active, connected, onMouseDown, onMouseUp, onMouseEnter, onMouseLeave }) {
  const isOutput = kind === "output";
  return (
    <div
      className="absolute flex items-center"
      style={{
        top: PORT_TOP + index * PORT_GAP,
        [isOutput ? "right" : "left"]: 0,
        transform: isOutput ? "translate(50%, -50%)" : "translate(-50%, -50%)",
      }}
    >
      <div
        role="button"
        title={`${isOutput ? "Output" : "Input"}: ${portId}`}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onMouseUp?.(e);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`w-3 h-3 rounded-full border-2 transition-all duration-150 cursor-crosshair ${
          isOutput
            ? "bg-indigo-500 border-indigo-300"
            : connected
            ? "bg-slate-500 border-slate-400"
            : "bg-slate-800 border-slate-600"
        } ${active ? "scale-150 ring-4 ring-purple-500/40" : "hover:scale-125"} ${
          isOutput ? "hover:bg-purple-400" : "hover:bg-indigo-400 hover:border-indigo-300"
        }`}
        style={{ transform: active ? "scale(1.5)" : undefined }}
      />
      <span
        className={`absolute text-[8px] uppercase tracking-wide whitespace-nowrap pointer-events-none opacity-0 group-hover/node:opacity-70 transition-opacity ${
          isOutput ? "right-5 text-indigo-300" : "left-5 text-slate-400"
        }`}
      >
        {prettyKey(portId)}
      </span>
    </div>
  );
}

export default function NodeCard({
  node,
  isSelected,
  isRunning,
  hasMissingInputs,
  connectingFrom,
  hoverPort,
  connectedPorts,
  onNodeMouseDown,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onDuplicate,
  onDelete,
  onTest,
}) {
  const template = getTemplate(node.type);
  const CategoryConfig = getCategory(node.type);
  const Icon = template.icon;

  return (
    <div
      onMouseDown={(e) => onNodeMouseDown(e, node)}
      style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: NODE_W }}
      className={`group/node absolute rounded-xl border bg-slate-900/95 backdrop-blur shadow-xl transition-[box-shadow,border-color] ${
        isSelected
          ? "border-indigo-500 shadow-indigo-500/20 ring-2 ring-indigo-500/30 z-10"
          : "border-slate-800 hover:border-slate-700"
      } ${isRunning ? "animate-pulse-ring" : ""}`}
    >
      {/* Header */}
      <div className="p-2.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-800/30 rounded-t-xl">
        <div className="flex items-center space-x-2 min-w-0">
          <div className={`p-1.5 rounded-lg border shrink-0 ${CategoryConfig.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-slate-200 truncate">{node.label}</h3>
            <p className="text-[9px] text-slate-400 capitalize truncate">{node.type.replace(/_/g, " ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasMissingInputs && <AlertCircle className="w-3.5 h-3.5 text-amber-400" title="Thiếu kết nối đầu vào" />}
          {node.status === "running" && <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
          {node.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {node.status === "error" && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
          {node.status === "idle" && <div className="w-2 h-2 rounded-full bg-slate-600" />}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 text-[11px] space-y-2 text-slate-300">
        {node.type === "image_node" && (
          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
            {node.config?.imageData ? (
              <img
                src={node.config.imageData}
                alt={node.config?.imageType || "Ảnh tham chiếu"}
                className="w-full h-16 object-cover rounded mb-1 border border-slate-800"
              />
            ) : (
              <div className="w-full h-12 rounded bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800 mb-1 flex items-center justify-center">
                <span className="text-[9px] text-slate-500">{node.config?.imageType || "Chưa chọn"}</span>
              </div>
            )}
            <span className="text-[10px] text-slate-400 line-clamp-2">
              {node.config?.description || "Chưa có mô tả hình ảnh"}
            </span>
          </div>
        )}

        {(template.preview || [])
          .filter((key) => key !== "description")
          .slice(0, node.type === "image_node" ? 1 : 3)
          .map((key) => (
            <div key={key} className="flex items-start justify-between gap-2">
              <span className="text-[10px] text-slate-500 capitalize shrink-0">{prettyKey(key)}:</span>
              <span className="text-[10px] text-indigo-300 text-right line-clamp-1">{formatValue(node.config?.[key])}</span>
            </div>
          ))}

        {/* Port labels summary */}
        <div className="flex justify-between items-center pt-2 text-[9px] text-slate-500 border-t border-slate-800/60">
          <div className="flex flex-col gap-[6px]">
            {(node.inputs || []).map((p, i) => (
              <span key={p + i} className="capitalize pl-2">
                {prettyKey(p)}
              </span>
            ))}
            {!node.inputs?.length && <span className="pl-2 italic opacity-60">no input</span>}
          </div>
          <div className="flex flex-col gap-[6px] items-end">
            {(node.outputs || []).map((p, i) => (
              <span key={p + i} className="capitalize pr-2">
                {prettyKey(p)}
              </span>
            ))}
            {!node.outputs?.length && <span className="pr-2 italic opacity-60">no output</span>}
          </div>
        </div>
      </div>

      {/* Edge ports (absolutely positioned so connection math is exact) */}
      {(node.inputs || []).map((p, i) => (
        <Port
          key={`in-${p}-${i}`}
          portId={p}
          kind="input"
          index={i}
          connected={connectedPorts.has(`in:${p}`)}
          active={hoverPort?.nodeId === node.id && hoverPort?.portId === p && hoverPort?.kind === "input"}
          onMouseUp={(e) => onPortMouseUp(e, node.id, p, "input")}
          onMouseEnter={() => onPortHover(node.id, p, "input")}
          onMouseLeave={() => onPortHover(null)}
        />
      ))}
      {(node.outputs || []).map((p, i) => (
        <Port
          key={`out-${p}-${i}`}
          portId={p}
          kind="output"
          index={i}
          connected={connectedPorts.has(`out:${p}`)}
          active={connectingFrom?.fromNode === node.id && connectingFrom?.fromPort === p}
          onMouseDown={(e) => onPortMouseDown(e, node.id, p, "output")}
          onMouseEnter={() => onPortHover(node.id, p, "output")}
          onMouseLeave={() => onPortHover(null)}
        />
      ))}

      {/* Quick actions */}
      {isSelected && (
        <div className="absolute -top-8 right-0 flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-md">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onTest(node.id)}
            className="p-1 hover:bg-slate-700 rounded text-emerald-300"
            title="Chạy thử node này"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onDuplicate(node.id)}
            className="p-1 hover:bg-slate-700 rounded text-slate-300"
            title="Nhân bản"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(node.id)}
            className="p-1 hover:bg-rose-900/50 rounded text-rose-300"
            title="Xóa"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
