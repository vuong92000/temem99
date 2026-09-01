/**
 * Local persistence so a refresh never costs the user their workflow.
 * Everything is wrapped in try/catch: private mode / quota errors must
 * never break the editor.
 */
const KEY = "avwb.state.v1";

const hasStorage = () => {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

export function loadState() {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.graph?.nodes) || !Array.isArray(data?.graph?.connections)) return null;
    return {
      graph: data.graph,
      result: data.result || null,
      savedAt: data.savedAt || null,
    };
  } catch {
    return null;
  }
}

export function saveState(graph, result) {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, savedAt: Date.now(), graph, result })
    );
    return true;
  } catch (error) {
    // Most likely a quota error caused by large base64 images.
    if (typeof console !== "undefined") console.warn("[workflow] autosave skipped:", error?.name);
    return false;
  }
}

export function clearState() {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
