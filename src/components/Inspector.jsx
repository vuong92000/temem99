import React, { useRef } from "react";
import { Sliders, Trash2, Play, Link2, ArrowRight, FileUp, ImageOff } from "lucide-react";
import { getTemplate, getCategory } from "../data/nodeTemplates.js";
import { fileToThumbnail } from "../lib/image.js";

function ImageField({ value, onChange, onNotify }) {
  const inputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await fileToThumbnail(file);
      onChange(dataUrl);
      onNotify?.(`Đã tải ảnh "${file.name}" (tự nén về <360px)`, "success");
    } catch (error) {
      onNotify?.(error.message || "Không thể xử lý ảnh", "error");
    }
    event.target.value = "";
  };

  return (
    <div>
      <label className="text-[11px] font-medium text-slate-400 block mb-1">Ảnh tham chiếu</label>
      {value ? (
        <div className="space-y-1.5">
          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <img src={value} alt="Ảnh tham chiếu" className="w-full max-h-40 object-contain" />
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1"
            >
              <FileUp className="w-3 h-3" /> Đổi ảnh
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-2 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-[10px] text-rose-300 border border-rose-800/30 transition flex items-center justify-center gap-1"
            >
              <ImageOff className="w-3 h-3" /> Xóa
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="p-3 border border-dashed border-slate-700 rounded-lg text-center hover:border-indigo-500/50 cursor-pointer transition"
        >
          <FileUp className="w-5 h-5 mx-auto text-slate-400 mb-1" />
          <span className="text-[11px] text-indigo-400 font-medium">Tải ảnh lên mẫu</span>
          <p className="text-[9px] text-slate-500 mt-0.5">PNG, JPG — tự nén còn dưới 360px</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

function Field({ field, value, onChange, onNotify }) {
  const label = <label className="text-[11px] font-medium text-slate-400 block mb-1">{field.label}</label>;
  const base =
    "w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition";

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={base}>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          rows={field.rows || 3}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} resize-none leading-relaxed`}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        {label}
        <input
          type="number"
          min={field.min}
          max={field.max}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className={base}
        />
      </div>
    );
  }

  if (field.type === "slider") {
    return (
      <div>
        {label}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 1}
            step={field.step ?? 0.1}
            value={value ?? field.min ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-[11px] text-indigo-300 w-10 text-right tabular-nums">{value ?? 0}</span>
        </div>
      </div>
    );
  }

  if (field.type === "image") {
    return <ImageField value={value} onChange={onChange} onNotify={onNotify} />;
  }

  if (field.type === "chips") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])
                }
                className={`px-2 py-1 rounded-full text-[10px] border transition ${
                  active
                    ? "bg-indigo-600/25 border-indigo-500/60 text-indigo-200"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {label}
      <input
        type="text"
        value={value ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    </div>
  );
}

export default function Inspector({
  node,
  nodes,
  connections,
  onLabelChange,
  onConfigChange,
  onTest,
  onDelete,
  onNotify,
}) {
  if (!node) {
    return (
      <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0 z-20">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cấu hình Node</span>
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <Sliders className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">Nhấp chọn bất kỳ Node nào trên Canvas để điều chỉnh thông số chi tiết</p>
        </div>
      </aside>
    );
  }

  const template = getTemplate(node.type);
  const CategoryConfig = getCategory(node.type);
  const Icon = template.icon;

  const incoming = connections.filter((c) => c.toNode === node.id);
  const outgoing = connections.filter((c) => c.fromNode === node.id);
  const nameOf = (id) => nodes.find((n) => n.id === id)?.label || id;

  return (
    <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0 z-20">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Cấu hình Node</span>
        </h2>
        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          {node.id}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className={`flex items-center gap-2 p-2 rounded-lg border ${CategoryConfig.color}`}>
          <Icon className="w-4 h-4" />
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{template.label}</div>
            <div className="text-[10px] opacity-80 line-clamp-1">{template.desc}</div>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1">Tên Node tùy chỉnh</label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {(template.fields || []).map((field) => (
          <Field
            key={field.key}
            field={field}
            value={node.config?.[field.key]}
            onChange={(value) => onConfigChange(field.key, value)}
            onNotify={onNotify}
          />
        ))}

        {/* Ports & wiring */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Link2 className="w-3 h-3" /> Kết nối ({incoming.length + outgoing.length})
          </div>
          {!incoming.length && !outgoing.length && (
            <p className="text-[10px] text-slate-500 italic">Node chưa được nối với bất kỳ node nào.</p>
          )}
          {incoming.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="truncate max-w-[110px]">{nameOf(c.fromNode)}</span>
              <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-slate-300 truncate">{c.toPort.replace(/_/g, " ")}</span>
            </div>
          ))}
          {outgoing.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="text-slate-300 truncate">{c.fromPort.replace(/_/g, " ")}</span>
              <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate max-w-[110px]">{nameOf(c.toNode)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-800 space-y-2">
          <button
            onClick={() => onTest(node.id)}
            className="w-full py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition flex items-center justify-center space-x-1"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Thử nghiệm Node này</span>
          </button>

          <button
            onClick={() => onDelete(node.id)}
            className="w-full py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/30 text-xs font-medium transition flex items-center justify-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Node khỏi Workflow</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
