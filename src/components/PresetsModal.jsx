import React from "react";
import { X, ArrowRight, AlertCircle } from "lucide-react";
import { WORKFLOW_PRESETS } from "../data/presets.js";

export default function PresetsModal({ onClose, onSelect, currentCount }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Thư viện Workflow mẫu</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Chọn một pipeline có sẵn để nạp lên canvas — bạn vẫn chỉnh sửa thoải mái sau đó.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentCount > 0 && (
          <div className="flex items-start gap-2 text-[11px] text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Canvas hiện có {currentCount} node — nạp preset sẽ thay thế toàn bộ workflow hiện tại.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WORKFLOW_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                className="group text-left p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition">
                    {preset.name}
                  </span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {preset.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{preset.desc}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition">
                  Nạp workflow <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
