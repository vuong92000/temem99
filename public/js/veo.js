/*
 * veo.js — adapter REST cho Gemini API / Veo 3.1.
 * API key chỉ được dùng trong trình duyệt hiện tại và không được lưu vào project.
 * Với production nên chuyển phần này sang server proxy có GEMINI_API_KEY.
 */

import { withTimeout } from './util.js';

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta';

function authHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  };
}

async function imageUrlToPart(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (match) return { bytesBase64Encoded: match[2], mimeType: match[1] };
  }
  const res = await withTimeout(fetch(imageUrl, { mode: 'cors' }), 60000, 'Không tải được ảnh tham chiếu');
  if (!res.ok) throw new Error(`Ảnh tham chiếu trả về ${res.status}`);
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/png';
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return { bytesBase64Encoded: btoa(binary), mimeType };
}

function operationNameFrom(body) {
  return body?.name || body?.operation?.name || body?.operationName || null;
}

function extractVideoUri(body) {
  const root = body?.response || body?.result || body;
  const candidates = [
    root?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri,
    root?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri,
    root?.generatedVideos?.[0]?.video?.uri,
    root?.generatedSamples?.[0]?.video?.uri,
    root?.videos?.[0]?.gcsUri,
    root?.videos?.[0]?.uri,
  ].filter(Boolean);
  return candidates[0] || null;
}

function extractInlineVideo(body) {
  const root = body?.response || body?.result || body;
  const candidates = [
    root?.generateVideoResponse?.generatedSamples?.[0]?.video?.bytesBase64Encoded,
    root?.generatedVideos?.[0]?.video?.videoBytes,
    root?.generatedVideos?.[0]?.video?.bytesBase64Encoded,
    root?.videos?.[0]?.bytesBase64Encoded,
  ].filter(Boolean);
  return candidates[0] || null;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function blobFromBase64(base64, mime = 'video/mp4') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Gọi Veo qua Gemini REST API. Veo trả operation bất đồng bộ, nên hàm này
 * tự poll tới khi có video rồi trả về Blob + metadata.
 */
export async function generateVeoVideo({
  apiKey,
  model = 'veo-3.1-generate-preview',
  prompt,
  negativePrompt = '',
  imageUrl = null,
  aspectRatio = '16:9',
  durationSeconds = '8',
  resolution = '720p',
  onProgress,
  pollMs = 10000,
  timeoutMs = 12 * 60 * 1000,
} = {}) {
  if (!apiKey?.trim()) throw new Error('Cần Gemini API key để gọi Google Veo.');
  if (!prompt?.trim()) throw new Error('Prompt video đang trống.');

  const instance = { prompt: prompt.trim() };
  if (imageUrl) instance.image = await imageUrlToPart(imageUrl);
  const parameters = {
    aspectRatio,
    durationSeconds: String(durationSeconds),
    resolution,
    sampleCount: 1,
  };
  if (negativePrompt?.trim()) parameters.negativePrompt = negativePrompt.trim();

  const start = await withTimeout(fetch(`${GEMINI_API}/models/${encodeURIComponent(model)}:predictLongRunning`, {
    method: 'POST',
    headers: authHeaders(apiKey.trim()),
    body: JSON.stringify({ instances: [instance], parameters }),
  }), 90000, 'Veo không phản hồi khi bắt đầu tác vụ');
  const startBody = await start.json().catch(() => ({}));
  if (!start.ok) throw new Error(startBody?.error?.message || `Google Veo trả về ${start.status}`);

  const name = operationNameFrom(startBody);
  if (!name) throw new Error('Veo không trả về operation name. Kiểm tra model/API key.');
  const deadline = Date.now() + timeoutMs;
  let operation = startBody;
  onProgress?.(0.08, 'Google Veo đã nhận tác vụ…');

  while (Date.now() < deadline) {
    if (operation.done === true) break;
    await sleep(pollMs);
    const status = await withTimeout(fetch(`${GEMINI_API}/${name}`, {
      headers: { 'x-goog-api-key': apiKey.trim() },
    }), 90000, 'Quá thời gian chờ trạng thái Veo');
    operation = await status.json().catch(() => ({}));
    if (!status.ok) throw new Error(operation?.error?.message || `Không đọc được trạng thái Veo (${status.status})`);
    onProgress?.(Math.min(.92, .12 + (Date.now() % 8000) / 10000), 'Veo đang dựng video…');
    if (operation.error) throw new Error(operation.error.message || 'Veo generation failed');
  }
  if (operation.done !== true) throw new Error('Veo tạo video quá lâu, hãy thử lại sau.');
  if (operation.error) throw new Error(operation.error.message || 'Veo generation failed');

  const inline = extractInlineVideo(operation);
  let blob;
  let uri = extractVideoUri(operation);
  if (inline) {
    blob = blobFromBase64(inline);
  } else if (uri) {
    const res = await withTimeout(fetch(uri, { headers: { 'x-goog-api-key': apiKey.trim() } }), 120000, 'Không tải được video Veo');
    if (!res.ok) throw new Error(`Không tải được video Veo (${res.status})`);
    blob = await res.blob();
  } else {
    throw new Error('Veo hoàn tất nhưng không tìm thấy video trong response.');
  }
  onProgress?.(1, 'Video Veo đã sẵn sàng.');
  return { blob, uri, model, durationSeconds: String(durationSeconds) };
}

export function veoModelLabel(model) {
  return {
    'veo-3.1-generate-preview': 'Veo 3.1 · chất lượng cao + audio',
    'veo-3.1-fast-generate-preview': 'Veo 3.1 Fast · thử nhanh',
    'veo-3.1-lite-generate-preview': 'Veo 3.1 Lite · tiết kiệm',
  }[model] || model;
}
