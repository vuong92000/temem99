import React from "react";
import { Film, Clapperboard, Sparkles, Code, Copy, Download, FileJson, FileText, RefreshCw } from "lucide-react";

const TABS = [
  { id: "script", label: "Kịch Bản Chi Tiết", icon: Film },
  { id: "storyboard", label: "Storyboard", icon: Clapperboard },
  { id: "prompts", label: "Prompt Pack AI", icon: Sparkles },
  { id: "json", label: "JSON Output", icon: Code },
  { id: "logs", label: "Execution Logs", icon: Code, dynamic: "logs" },
];

function EmptyState({ icon: Icon, children }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-6">
      <Icon className="w-8 h-8 opacity-40" />
      <p className="text-xs text-center max-w-md">{children}</p>
    </div>
  );
}

export default function ResultsPanel({
  activeTab,
  setActiveTab,
  result,
  logs,
  isRunning,
  onCopy,
  onExport,
  onRerun,
}) {
  const exportButtons = result ? (
    <div className="flex items-center space-x-1.5">
      <button
        onClick={() => onCopy("auto")}
        className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition"
        title={`Copy kết quả theo định dạng của Export Node (${result.exportFormat || "JSON"})`}
      >
        <Copy className="w-3 h-3" />
        <span className="hidden sm:inline">Copy {result.exportFormat || "JSON"}</span>
      </button>
      <button
        onClick={() => onExport("json")}
        className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition"
      >
        <FileJson className="w-3 h-3" />
        <span className="hidden sm:inline">JSON</span>
      </button>
      <button
        onClick={() => onExport("md")}
        className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition"
      >
        <FileText className="w-3 h-3" />
        <span className="hidden sm:inline">Markdown</span>
      </button>
      <button
        onClick={() => onExport("txt")}
        className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition"
      >
        <Download className="w-3 h-3" />
        <span className="hidden sm:inline">TXT</span>
      </button>
      <button
        onClick={() => onExport("prompts")}
        className="flex items-center space-x-1 text-[11px] text-purple-300 hover:text-white bg-purple-900/30 hover:bg-purple-900/50 px-2.5 py-1 rounded border border-purple-800/50 transition"
      >
        <Sparkles className="w-3 h-3" />
        <span className="hidden sm:inline">Prompt Pack</span>
      </button>
      <button
        onClick={onRerun}
        disabled={isRunning}
        className="flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 px-2.5 py-1 rounded border border-indigo-500/40 transition disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isRunning ? "animate-spin" : ""}`} />
        <span className="hidden md:inline">{isRunning ? "Đang chạy..." : "Chạy lại"}</span>
      </button>
    </div>
  ) : null;

  return (
    <footer className="h-72 bg-slate-900/95 border-t border-slate-800 flex flex-col shrink-0 z-20">
      <div className="h-9 border-b border-slate-800 px-3 flex items-center justify-between bg-slate-950 shrink-0">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-t-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
                  active
                    ? "bg-slate-900 text-indigo-400 border-t-2 border-indigo-500"
                    : "text-slate-400 hover:text-slate-200 border-t-2 border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>
                  {tab.label}
                  {tab.dynamic === "logs" ? ` (${logs.length})` : ""}
                </span>
              </button>
            );
          })}
        </div>
        {exportButtons}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/60">
        {/* SCRIPT */}
        {activeTab === "script" &&
          (result ? (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-sm font-bold text-indigo-300">{result.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{result.concept}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                    Tỷ lệ: {result.aspectRatio}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                    Thời lượng: {result.duration}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-800/40">
                    Style: {result.style}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-900/30 text-emerald-300 rounded border border-emerald-800/40">
                    VO: {result.voice}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-900/30 text-amber-300 rounded border border-amber-800/40">
                    Camera: {result.camera}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.scenes.map((s) => (
                  <div key={s.sceneNumber} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                      <span className="text-xs font-semibold text-indigo-400">SCENE #{s.sceneNumber}</span>
                      <span className="text-[10px] text-slate-500">
                        {s.shotType} · {s.seconds}s
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div>
                        <strong className="text-slate-400">Visual:</strong> <span className="text-slate-200">{s.visual}</span>
                      </div>
                      <div>
                        <strong className="text-slate-400">Hành động:</strong>{" "}
                        <span className="text-slate-300">{s.action}</span>
                      </div>
                      <div>
                        <strong className="text-slate-400">Lời thoại (VO):</strong>{" "}
                        <span className="text-emerald-300 font-medium">{s.dialogue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="text-[11px] font-semibold text-slate-300 mb-1">Quy tắc nhất quán (Consistency Rules)</div>
                <p className="text-[11px] text-slate-400">{result.consistencyRules}</p>
              </div>
            </div>
          ) : (
            <EmptyState icon={Clapperboard}>
              Nhấn <strong className="text-indigo-400">RUN WORKFLOW</strong> ở góc trên bên phải để tạo kịch bản chi tiết
            </EmptyState>
          ))}

        {/* STORYBOARD */}
        {activeTab === "storyboard" &&
          (result ? (
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {result.scenes.map((s) => (
                <div key={s.sceneNumber} className="min-w-[190px] w-[190px] space-y-1.5">
                  <div
                    className={`w-full rounded-lg border border-slate-700 bg-slate-950 overflow-hidden flex flex-col ${
                      s.ratio === "16:9" ? "aspect-video" : s.ratio === "1:1" ? "aspect-square" : s.ratio === "4:5" ? "aspect-[4/5]" : "aspect-[9/16]"
                    }`}
                  >
                    <div className="flex-1 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center p-2">
                      <span className="text-[9px] text-slate-500 text-center line-clamp-6">{s.visual}</span>
                    </div>
                    <div className="px-1.5 py-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] text-indigo-400">#{s.sceneNumber}</span>
                      <span className="text-[9px] text-slate-500">{s.seconds}s</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-snug">
                    <span className="text-slate-500">Shot:</span> {s.shotType}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-snug line-clamp-3">{s.action}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Clapperboard}>Chưa có storyboard. Vui lòng thực thi Workflow.</EmptyState>
          ))}

        {/* PROMPTS */}
        {activeTab === "prompts" &&
          (result ? (
            <div className="space-y-3 max-w-5xl mx-auto">
              <div className="text-xs font-semibold text-slate-300">
                Danh sách Prompt tạo ảnh &amp; Video Motion theo từng Cảnh:
              </div>
              {result.scenes.map((s) => (
                <div key={s.sceneNumber} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-medium text-purple-400">Scene #{s.sceneNumber} Prompts</div>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800/80">
                      <strong className="text-indigo-300">Image Prompt:</strong> {s.imagePrompt}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800/80">
                      <strong className="text-pink-300">Video Motion Prompt:</strong> {s.videoPrompt}
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg">
                <div className="text-xs font-medium text-rose-300 mb-1">Negative Prompt Rules</div>
                <div className="text-[11px] font-mono text-slate-400">{result.negativePrompt}</div>
              </div>
            </div>
          ) : (
            <EmptyState icon={Sparkles}>Chưa có kết quả Prompt. Vui lòng thực thi Workflow.</EmptyState>
          ))}

        {/* JSON */}
        {activeTab === "json" &&
          (result ? (
            <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto custom-scrollbar">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <EmptyState icon={Code}>Chưa có dữ liệu JSON. Vui lòng thực thi Workflow.</EmptyState>
          ))}

        {/* LOGS */}
        {activeTab === "logs" && (
          <div className="font-mono text-[11px] space-y-1">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span
                    className={
                      log.level === "success"
                        ? "text-emerald-400"
                        : log.level === "warning"
                        ? "text-amber-400"
                        : log.level === "error"
                        ? "text-rose-400"
                        : "text-indigo-300"
                    }
                  >
                    {log.msg}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic">Chưa có nhật ký hoạt động. Sẵn sàng thực thi.</div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
