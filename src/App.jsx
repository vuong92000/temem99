import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Redo2,
  Grid,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  RefreshCw,
  HelpCircle,
  X,
  ChevronRight,
  Magnet,
  Library,
} from "lucide-react";

import { NODE_TEMPLATES, getTemplate } from "./data/nodeTemplates.js";
import { WORKFLOW_PRESETS, DEFAULT_PRESET_ID } from "./data/presets.js";
import { loadState, saveState, clearState } from "./lib/storage.js";
import {
  portPosition,
  validateConnection,
  topologicalOrder,
  layeredLayout,
  graphBounds,
  unconnectedInputs,
  clone,
} from "./lib/graph.js";
import { generateWorkflowResult, toMarkdown, toPlainText, toPromptPack } from "./lib/generator.js";
import NodeLibrary from "./components/NodeLibrary.jsx";
import NodeCard from "./components/NodeCard.jsx";
import Connections from "./components/Connections.jsx";
import Inspector from "./components/Inspector.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import MiniMap from "./components/MiniMap.jsx";
import PresetsModal from "./components/PresetsModal.jsx";

const EXPORT_FORMAT_MAP = {
  JSON: "json",
  Markdown: "md",
  TXT: "txt",
  "Prompt Pack": "prompts",
  "All-in-One": "json",
};

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  /* ------------------------------------------------------------------ *
   * Graph state + history
   * ------------------------------------------------------------------ */
  const persisted = useRef(loadState()).current;
  const fallbackPreset =
    WORKFLOW_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) || WORKFLOW_PRESETS[0];

  const [graph, setGraph] = useState(
    () => persisted?.graph || { nodes: clone(fallbackPreset.nodes), connections: clone(fallbackPreset.connections) }
  );
  const graphRef = useRef(graph);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  /* ------------------------------------------------------------------ *
   * UI state
   * ------------------------------------------------------------------ */
  const [selectedNodeId, setSelectedNodeId] = useState("node-5");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [connecting, setConnecting] = useState(null);
  const [hoverPort, setHoverPort] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [executionResult, setExecutionResult] = useState(() => persisted?.result || null);
  const [activeTab, setActiveTab] = useState("script");
  const [toast, setToast] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [savedAt, setSavedAt] = useState(() => persisted?.savedAt || null);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const viewRef = useRef({ zoom, pan });

  useEffect(() => {
    viewRef.current = { zoom, pan };
  }, [zoom, pan]);

  /* ------------------------------------------------------------------ *
   * Notifications
   * ------------------------------------------------------------------ */
  const notify = useCallback((msg, type = "info") => {
    setToast({ msg, type, id: Date.now() });
    window.setTimeout(() => setToast((current) => (current && current.msg === msg ? null : current)), 3000);
  }, []);

  const addLog = useCallback((msg, level = "info") => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg, level }]);
  }, []);

  /* ------------------------------------------------------------------ *
   * Autosave / restore (localStorage)
   * ------------------------------------------------------------------ */
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      if (persisted) {
        notify(`Đã khôi phục workflow đã lưu lúc ${new Date(persisted.savedAt || Date.now()).toLocaleString()}`, "info");
      }
      return;
    }
    const timer = window.setTimeout(() => {
      if (saveState(graphRef.current, executionResult)) setSavedAt(Date.now());
    }, 600);
    return () => window.clearTimeout(timer);
  }, [graph, executionResult, persisted, notify]);

  /* ------------------------------------------------------------------ *
   * Graph mutations (with undo history)
   * ------------------------------------------------------------------ */
  const applyGraph = useCallback(
    (updater, { history = true } = {}) => {
      const current = graphRef.current;
      const next = typeof updater === "function" ? updater(current) : updater;
      if (!next) return;
      graphRef.current = next;
      setGraph(next);
      if (history) {
        setPast((p) => [...p.slice(-49), current]);
        setFuture([]);
      }
    },
    []
  );

  const undo = useCallback(() => {
    if (!past.length) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [graphRef.current, ...f]);
    graphRef.current = previous;
    setGraph(previous);
    notify("Đã hoàn tác (Undo)", "info");
  }, [past, notify]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, graphRef.current]);
    graphRef.current = next;
    setGraph(next);
    notify("Đã làm lại (Redo)", "info");
  }, [future, notify]);

  /* ------------------------------------------------------------------ *
   * Canvas helpers
   * ------------------------------------------------------------------ */
  const toGraphCoords = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const { zoom: z, pan: p } = viewRef.current;
    return { x: (clientX - rect.left - p.x) / z, y: (clientY - rect.top - p.y) / z };
  }, []);

  const fitView = useCallback(
    (nodes = graphRef.current.nodes) => {
      if (!nodes.length || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const b = graphBounds(nodes);
      const pad = 60;
      const nextZoom = clamp(
        Math.min((rect.width - pad * 2) / b.width, (rect.height - pad * 2) / b.height),
        MIN_ZOOM,
        1.1
      );
      setZoom(nextZoom);
      setPan({
        x: rect.width / 2 - (b.minX + b.width / 2) * nextZoom,
        y: rect.height / 2 - (b.minY + b.height / 2) * nextZoom,
      });
    },
    []
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setViewport({ width, height });
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  /* Wheel zoom (needs a non-passive native listener) */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (event) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const { zoom: z, pan: p } = viewRef.current;
      const nextZoom = clamp(z * (1 - event.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM);
      const ratio = nextZoom / z;
      viewRef.current = {
        zoom: nextZoom,
        pan: { x: px - (px - p.x) * ratio, y: py - (py - p.y) * ratio },
      };
      setZoom(nextZoom);
      setPan(viewRef.current.pan);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ------------------------------------------------------------------ *
   * Node operations
   * ------------------------------------------------------------------ */
  const createNode = useCallback((template, position) => {
    const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      id,
      type: template.type,
      label: template.label,
      x: Math.round(position.x),
      y: Math.round(position.y),
      status: "idle",
      config: clone(template.defaultConfig || {}),
      inputs: [...(template.inputs || [])],
      outputs: [...(template.outputs || [])],
    };
  }, []);

  const handleAddNode = useCallback(
    (template, position) => {
      const spot =
        position ||
        (() => {
          const { zoom: z, pan: p } = viewRef.current;
          return { x: (viewport.width / 2 - p.x) / z - 120, y: (viewport.height / 2 - p.y) / z - 80 };
        })();
      const node = createNode(template, spot);
      applyGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
      setSelectedNodeId(node.id);
      notify(`Đã thêm node ${template.label}`, "success");
    },
    [applyGraph, createNode, notify, viewport]
  );

  const handleDuplicateNode = useCallback(
    (nodeId) => {
      const target = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!target) return;
      const duplicate = {
        ...clone(target),
        id: `node-${Date.now()}`,
        label: `${target.label} (Bản sao)`,
        x: target.x + 40,
        y: target.y + 40,
        status: "idle",
      };
      applyGraph((g) => ({ ...g, nodes: [...g.nodes, duplicate] }));
      setSelectedNodeId(duplicate.id);
      notify("Đã nhân bản Node thành công", "success");
    },
    [applyGraph, notify]
  );

  const handleDeleteNode = useCallback(
    (nodeId) => {
      applyGraph((g) => ({
        nodes: g.nodes.filter((n) => n.id !== nodeId),
        connections: g.connections.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId),
      }));
      setSelectedNodeId((current) => (current === nodeId ? null : current));
      notify("Đã xóa node khỏi canvas", "info");
    },
    [applyGraph, notify]
  );

  const handleDeleteConnection = useCallback(
    (connectionId) => {
      applyGraph((g) => ({ ...g, connections: g.connections.filter((c) => c.id !== connectionId) }));
      notify("Đã xóa đường nối", "info");
    },
    [applyGraph, notify]
  );

  const handleLabelChange = useCallback(
    (nodeId, label) => {
      applyGraph(
        (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)) }),
        { history: false }
      );
    },
    [applyGraph]
  );

  const handleConfigChange = useCallback(
    (nodeId, key, value) => {
      applyGraph(
        (g) => ({
          ...g,
          nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n)),
        }),
        { history: false }
      );
    },
    [applyGraph]
  );

  /* ------------------------------------------------------------------ *
   * Pointer interactions: pan, drag node, draw connection
   * ------------------------------------------------------------------ */
  const handleCanvasMouseDown = (event) => {
    if (event.button === 1 || event.target === canvasRef.current || event.target.tagName === "svg") {
      panRef.current = { startX: event.clientX - viewRef.current.pan.x, startY: event.clientY - viewRef.current.pan.y };
      setSelectedNodeId(null);
    }
  };

  const handleNodeMouseDown = (event, node) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelectedNodeId(node.id);
    const point = toGraphCoords(event.clientX, event.clientY);
    dragRef.current = {
      id: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      snapshot: graphRef.current,
      moved: false,
    };
  };

  const handleCanvasMouseMove = (event) => {
    if (panRef.current) {
      setPan({ x: event.clientX - panRef.current.startX, y: event.clientY - panRef.current.startY });
      return;
    }
    if (dragRef.current) {
      const point = toGraphCoords(event.clientX, event.clientY);
      const { id, offsetX, offsetY } = dragRef.current;
      let moved = dragRef.current.moved;
      const GRID = 20;
      const snap = (value) => (snapToGrid ? Math.round(value / GRID) * GRID : Math.round(value));
      applyGraph(
        (g) => ({
          ...g,
          nodes: g.nodes.map((n) => {
            if (n.id !== id) return n;
            const nx = snap(point.x - offsetX);
            const ny = snap(point.y - offsetY);
            if (Math.abs(n.x - nx) > 2 || Math.abs(n.y - ny) > 2) moved = true;
            return { ...n, x: nx, y: ny };
          }),
        }),
        { history: false }
      );
      dragRef.current.moved = moved;
      return;
    }
    if (connecting) {
      const point = toGraphCoords(event.clientX, event.clientY);
      setConnecting((prev) => (prev ? { ...prev, mouseX: point.x, mouseY: point.y } : prev));
    }
  };

  const endPointerInteraction = useCallback(() => {
    panRef.current = null;
    if (dragRef.current?.moved) {
      const snapshot = dragRef.current.snapshot;
      setPast((p) => [...p.slice(-49), snapshot]);
      setFuture([]);
    }
    dragRef.current = null;
  }, []);

  /* Finish (or cancel) a pending connection anywhere on the window */
  useEffect(() => {
    if (!connecting) return;
    const onUp = () => {
      const target = hoverPort;
      if (target && target.kind === "input") {
        const candidate = {
          fromNode: connecting.fromNode,
          fromPort: connecting.fromPort,
          toNode: target.nodeId,
          toPort: target.portId,
        };
        const check = validateConnection(graphRef.current.connections, candidate);
        if (check.ok) {
          applyGraph((g) => ({
            ...g,
            connections: [...g.connections, { id: `c-${Date.now()}`, ...candidate }],
          }));
          notify("Kết nối thành công!", "success");
        } else {
          notify(check.reason, "error");
        }
      }
      setConnecting(null);
      setHoverPort(null);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [connecting, hoverPort, applyGraph, notify]);

  const handlePortMouseDown = (event, nodeId, portId, kind) => {
    if (kind !== "output") return;
    const node = graphRef.current.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const anchor = portPosition(node, portId, "output");
    setConnecting({ fromNode: nodeId, fromPort: portId, mouseX: anchor.x, mouseY: anchor.y });
  };

  const handlePortHover = useCallback((nodeId, portId, kind) => {
    setHoverPort(nodeId ? { nodeId, portId, kind } : null);
  }, []);

  /* ------------------------------------------------------------------ *
   * Drop from the node library
   * ------------------------------------------------------------------ */
  const handleDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/node-type");
    if (!type) return;
    const template = NODE_TEMPLATES.find((t) => t.type === type);
    if (!template) return;
    handleAddNode(template, toGraphCoords(event.clientX, event.clientY));
  };

  /* ------------------------------------------------------------------ *
   * Layout actions
   * ------------------------------------------------------------------ */
  const handleAutoLayout = () => {
    const next = layeredLayout(graphRef.current.nodes, graphRef.current.connections);
    applyGraph((g) => ({ ...g, nodes: next }));
    notify("Đã tự động căn chỉnh vị trí các Node", "success");
    window.setTimeout(() => fitView(next), 30);
  };

  const handleResetCanvas = () => {
    if (graphRef.current.nodes.length && !window.confirm("Xóa toàn bộ Workflow hiện tại?")) return;
    applyGraph({ nodes: [], connections: [] });
    setExecutionResult(null);
    setLogs([]);
    setSelectedNodeId(null);
    clearState();
    setSavedAt(null);
    notify("Đã xóa toàn bộ Workflow", "info");
  };

  const handleLoadPreset = (preset) => {
    const nodes = clone(preset.nodes);
    applyGraph({ nodes, connections: clone(preset.connections) });
    setSelectedNodeId(nodes[0]?.id || null);
    setExecutionResult(null);
    setLogs([]);
    setShowPresets(false);
    notify(`Đã nạp workflow "${preset.name}"`, "success");
    window.setTimeout(() => fitView(nodes), 30);
  };

  /* ------------------------------------------------------------------ *
   * Import / export
   * ------------------------------------------------------------------ */
  const downloadFile = (filename, content, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveWorkflow = () => {
    downloadFile(
      "ai_video_workflow.json",
      JSON.stringify({ version: 2.5, ...graphRef.current }, null, 2),
      "application/json"
    );
    notify("Đã tải xuống tệp JSON Workflow", "success");
  };

  const handleImportWorkflow = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.nodes) || !Array.isArray(data.connections)) throw new Error("Sai định dạng");
        applyGraph({
          nodes: data.nodes.map((n) => ({ ...n, status: n.status || "idle" })),
          connections: data.connections,
        });
        notify(`Đã nhập Workflow: ${data.nodes.length} nodes`, "success");
        window.setTimeout(() => fitView(data.nodes), 30);
      } catch (error) {
        notify(`Không thể đọc tệp: ${error.message}`, "error");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleExportResult = (format) => {
    if (!executionResult) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "md") downloadFile(`script-${stamp}.md`, toMarkdown(executionResult));
    if (format === "txt") downloadFile(`script-${stamp}.txt`, toPlainText(executionResult));
    if (format === "prompts") downloadFile(`prompts-${stamp}.txt`, toPromptPack(executionResult));
    if (format === "json")
      downloadFile(`script-${stamp}.json`, JSON.stringify(executionResult, null, 2), "application/json");
    notify(`Đã xuất kịch bản định dạng ${format.toUpperCase()}`, "success");
  };

  const handleCopy = async (format = "auto") => {
    if (!executionResult) return;
    const chosen = format === "auto" ? EXPORT_FORMAT_MAP[executionResult.exportFormat] || "json" : format;
    const text =
      chosen === "md"
        ? toMarkdown(executionResult)
        : chosen === "txt"
        ? toPlainText(executionResult)
        : chosen === "prompts"
        ? toPromptPack(executionResult)
        : JSON.stringify(executionResult, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      notify(`Đã copy kịch bản (định dạng ${chosen.toUpperCase()}) vào Clipboard!`, "success");
    } catch {
      notify("Trình duyệt chặn clipboard — hãy dùng nút xuất JSON.", "error");
    }
  };

  /* ------------------------------------------------------------------ *
   * Workflow execution (mock engine, topologically ordered)
   * ------------------------------------------------------------------ */
  const setNodeStatus = (nodeId, status) =>
    applyGraph(
      (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n)) }),
      { history: false }
    );

  const runWorkflow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setActiveTab("logs");
    notify("Đang kích hoạt hệ thống AI Workflow Engine...", "info");

    const { nodes, connections } = graphRef.current;
    if (!nodes.length) {
      addLog("Canvas trống — hãy thêm ít nhất một Node trước khi chạy.", "error");
      setIsRunning(false);
      return;
    }

    addLog("Khởi tạo kiểm tra đồ thị Workflow...", "info");
    await delay(350);

    const missing = unconnectedInputs(nodes, connections);
    if (missing.length) {
      addLog(
        `Cảnh báo: ${missing.length} Node chưa nối cổng Input (${missing
          .map((n) => n.label)
          .join(", ")}) — sẽ dùng thiết lập mặc định.`,
        "warning"
      );
    }

    const order = topologicalOrder(nodes, connections);
    const ordered = order.map((id) => nodes.find((n) => n.id === id)).filter(Boolean);
    addLog(`Thứ tự thực thi tối ưu (topological): ${ordered.map((n) => n.label).join(" → ")}`, "info");
    await delay(250);

    applyGraph(
      (g) => ({ ...g, nodes: g.nodes.map((n) => ({ ...n, status: "idle" })) }),
      { history: false }
    );

    for (let i = 0; i < ordered.length; i += 1) {
      const node = ordered[i];
      setNodeStatus(node.id, "running");
      addLog(`Đang thực thi [${i + 1}/${ordered.length}]: ${node.label}...`, "info");
      await delay(320);
      const template = getTemplate(node.type);
      addLog(`  ↳ ${node.label}: xử lý ${template.label} hoàn tất.`, "success");
      setNodeStatus(node.id, "success");
    }

    addLog("Đang tổng hợp kịch bản, prompt và cấu hình video...", "info");
    await delay(500);

    const result = generateWorkflowResult(graphRef.current.nodes, graphRef.current.connections);
    setExecutionResult(result);
    setActiveTab("script");
    addLog(`Hoàn tất! Đã tạo ${result.scenes.length} cảnh · ${result.duration} · ${result.aspectRatio}.`, "success");
    setIsRunning(false);
    notify("Workflow chạy hoàn tất! Xem kết quả ở Bottom Panel.", "success");
  }, [isRunning, addLog, applyGraph, notify]);

  const handleTestNode = useCallback(
    async (nodeId) => {
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setNodeStatus(nodeId, "running");
      addLog(`Thử nghiệm riêng lẻ Node: ${node.label}...`, "info");
      await delay(500);
      setNodeStatus(nodeId, "success");
      addLog(`Node ${node.label} phản hồi OK.`, "success");
      notify(`Đã test riêng lẻ Node ${node.label}`, "success");
    },
    [addLog, notify]
  );

  /* ------------------------------------------------------------------ *
   * Keyboard shortcuts
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveWorkflow();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (typing) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNodeId) {
          event.preventDefault();
          handleDeleteNode(selectedNodeId);
        }
      }
      if (event.key === "Escape") {
        setConnecting(null);
        setShowHelp(false);
        setSelectedNodeId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, selectedNodeId, handleDeleteNode, handleSaveWorkflow]);

  /* ------------------------------------------------------------------ *
   * Derived data
   * ------------------------------------------------------------------ */
  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) || null;

  const connectedPortsByNode = useMemo(() => {
    const map = new Map();
    graph.connections.forEach((c) => {
      if (!map.has(c.toNode)) map.set(c.toNode, new Set());
      map.get(c.toNode).add(`in:${c.toPort}`);
      if (!map.has(c.fromNode)) map.set(c.fromNode, new Set());
      map.get(c.fromNode).add(`out:${c.fromPort}`);
    });
    return map;
  }, [graph.connections]);

  const nodesMissingInput = useMemo(() => {
    const set = new Set();
    graph.nodes.forEach((n) => {
      if ((n.inputs || []).length && !graph.connections.some((c) => c.toNode === n.id)) set.add(n.id);
    });
    return set;
  }, [graph.nodes, graph.connections]);

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* ------------------------------ HEADER ------------------------------ */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
              AI Video Workflow Builder
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO v2.5
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Trực quan hóa quy trình kịch bản &amp; prompt AI · {graph.nodes.length} nodes ·{" "}
              {graph.connections.length} links
              {savedAt && (
                <span className="text-emerald-500/80">
                  {" "}
                  · đã lưu {new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            disabled={!past.length}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!future.length}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 my-auto mx-1" />

          <button
            onClick={handleAutoLayout}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Auto Layout</span>
          </button>

          <button
            onClick={() => setShowPresets(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
            title="Thư viện workflow mẫu"
          >
            <Library className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Presets</span>
          </button>

          <button
            onClick={handleResetCanvas}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 hover:text-rose-300 text-xs text-slate-300 border border-slate-700/80 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reset</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 my-auto mx-1" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Nhập Workflow (JSON)"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportWorkflow}
            className="hidden"
          />

          <button
            onClick={handleSaveWorkflow}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Save JSON</span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Hướng dẫn & phím tắt"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className={`flex items-center space-x-2 px-5 py-1.5 rounded-lg font-medium text-xs text-white shadow-lg transition-all ${
              isRunning
                ? "bg-purple-800 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 shadow-purple-500/25 active:scale-95"
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>RUN WORKFLOW</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ------------------------------ BODY ------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        <NodeLibrary onAddNode={(template) => handleAddNode(template)} />

        {/* Canvas */}
        <main
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={endPointerInteraction}
          onMouseLeave={endPointerInteraction}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`flex-1 relative overflow-hidden bg-slate-950 ${
            panRef.current ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Zoom controls */}
          <div className="absolute top-4 left-4 z-20 bg-slate-900/90 border border-slate-800 backdrop-blur rounded-lg flex items-center p-1 space-x-1 shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800" />
            <button onClick={() => fitView()} className="p-1.5 rounded hover:bg-slate-800 text-slate-300" title="Fit view">
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800" />
            <button
              onClick={() => setSnapToGrid((v) => !v)}
              className={`p-1.5 rounded transition ${
                snapToGrid ? "bg-indigo-600/30 text-indigo-300" : "hover:bg-slate-800 text-slate-400"
              }`}
              title={snapToGrid ? "Đang bắt dính lưới 20px — tắt để di chuyển tự do" : "Bắt dính lưới 20px"}
            >
              <Magnet className="w-4 h-4" />
            </button>
          </div>

          {/* Hint */}
          {!graph.nodes.length && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none">
              <Grid className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Canvas trống — kéo một Node từ thư viện bên trái vào đây</p>
            </div>
          )}

          <Connections
            nodes={graph.nodes}
            connections={graph.connections}
            connecting={connecting}
            pan={pan}
            zoom={zoom}
            onDeleteConnection={handleDeleteConnection}
          />

          {/* Node layer */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          >
            {graph.nodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                isRunning={node.status === "running"}
                hasMissingInputs={nodesMissingInput.has(node.id)}
                connectingFrom={connecting}
                hoverPort={hoverPort}
                connectedPorts={connectedPortsByNode.get(node.id) || new Set()}
                onNodeMouseDown={handleNodeMouseDown}
                onPortMouseDown={handlePortMouseDown}
                onPortMouseUp={() => {}}
                onPortHover={handlePortHover}
                onDuplicate={handleDuplicateNode}
                onDelete={handleDeleteNode}
                onTest={handleTestNode}
              />
            ))}
          </div>

          <MiniMap
            nodes={graph.nodes}
            pan={pan}
            zoom={zoom}
            viewport={viewport}
            onNavigate={(nextPan) => setPan(nextPan)}
          />
        </main>

        <Inspector
          node={selectedNode}
          nodes={graph.nodes}
          connections={graph.connections}
          onLabelChange={(label) => handleLabelChange(selectedNode.id, label)}
          onConfigChange={(key, value) => handleConfigChange(selectedNode.id, key, value)}
          onTest={handleTestNode}
          onDelete={handleDeleteNode}
          onNotify={notify}
        />
      </div>

      {/* ----------------------------- RESULTS ----------------------------- */}
      <ResultsPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        result={executionResult}
        logs={logs}
        isRunning={isRunning}
        onCopy={handleCopy}
        onExport={handleExportResult}
        onRerun={runWorkflow}
      />

      {/* ------------------------------- TOAST ----------------------------- */}
      {toast && (
        <div
          key={toast.id}
          className={`fixed bottom-6 right-6 z-50 bg-slate-800 border text-slate-100 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-toast-in ${
            toast.type === "success"
              ? "border-emerald-500/40"
              : toast.type === "error"
              ? "border-rose-500/50"
              : toast.type === "warning"
              ? "border-amber-500/50"
              : "border-slate-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              toast.type === "success"
                ? "bg-emerald-400"
                : toast.type === "error"
                ? "bg-rose-400"
                : toast.type === "warning"
                ? "bg-amber-400"
                : "bg-indigo-400"
            }`}
          />
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-1 text-slate-500 hover:text-slate-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ----------------------------- PRESETS ----------------------------- */}
      {showPresets && (
        <PresetsModal
          currentCount={graph.nodes.length}
          onClose={() => setShowPresets(false)}
          onSelect={handleLoadPreset}
        />
      )}

      {/* ------------------------------- HELP ------------------------------ */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" /> Hướng dẫn nhanh
              </h2>
              <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="text-xs text-slate-300 space-y-2">
              {[
                ["Thêm Node", "Click hoặc kéo thả một node từ thư viện bên trái lên canvas."],
                ["Nối dây", "Giữ chuột từ chấm tròn bên phải (output) của node này sang chấm bên trái (input) của node kia."],
                ["Xóa dây nối", "Click vào đường nối, sau đó click lại vào biểu tượng X hiện ra ở giữa."],
                ["Cấu hình", "Chọn node và chỉnh thông số ở panel bên phải — kết quả sẽ đổi theo khi chạy lại."],
                ["Di chuyển canvas", "Giữ chuột trái và kéo trên vùng nền, hoặc cuộn chuột để zoom."],
                ["Chạy", "Nhấn RUN WORKFLOW để thực thi theo thứ tự topological và tạo kịch bản."],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">{title}:</strong> {body}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-800 pt-3">
              <div className="text-[11px] font-semibold text-slate-400 mb-2">Phím tắt</div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Ctrl/⌘ + Z — Undo",
                  "Ctrl/⌘ + Shift + Z — Redo",
                  "Delete — Xóa node đang chọn",
                  "Esc — Bỏ chọn / hủy nối",
                  "Scroll — Zoom canvas",
                ].map((shortcut) => (
                  <span
                    key={shortcut}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {shortcut}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
