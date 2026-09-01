import React, { useState, useMemo } from "react";
import { Plus, Search, Layers } from "lucide-react";
import { NODE_CATEGORIES, NODE_TEMPLATES } from "../data/nodeTemplates.js";

export default function NodeLibrary({ onAddNode }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NODE_TEMPLATES;
    return NODE_TEMPLATES.filter(
      (t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.type.includes(q)
    );
  }, [query]);

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 z-20">
      <div className="p-3 border-b border-slate-800 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Thư viện Node</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">{NODE_TEMPLATES.length} Nodes</span>
        </h2>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm node..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {Object.keys(NODE_CATEGORIES).map((catKey) => {
          const cat = NODE_CATEGORIES[catKey];
          const catNodes = filtered.filter((t) => t.category === catKey);
          if (!catNodes.length) return null;

          return (
            <div key={catKey} className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-400 px-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                {cat.title}
                <span className="ml-auto text-[9px] text-slate-600">{catNodes.length}</span>
              </div>
              <div className="space-y-1.5">
                {catNodes.map((template) => {
                  const Icon = template.icon;
                  return (
                    <div
                      key={template.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/node-type", template.type);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onAddNode(template)}
                      className="group p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 cursor-grab active:cursor-grabbing transition flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`p-1.5 rounded-md shrink-0 ${cat.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 truncate transition">
                            {template.label}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{template.desc}</div>
                        </div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 transition" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="flex flex-col items-center justify-center text-slate-600 py-10 gap-2">
            <Layers className="w-6 h-6 opacity-50" />
            <span className="text-[11px]">Không tìm thấy node phù hợp</span>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
        Mẹo: <span className="text-slate-400">click</span> để thêm node, hoặc <span className="text-slate-400">kéo thả</span> trực tiếp
        lên canvas.
      </div>
    </aside>
  );
}
