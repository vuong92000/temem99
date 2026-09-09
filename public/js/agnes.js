/* Adapter cho Agnes Video Generator qua server proxy /api/agnes. */
import { withTimeout } from './util.js';

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function taskIdFrom(body) {
  return body?.task_id || body?.taskId || body?.id || body?.task?.id || body?.task?.task_id || null;
}

function taskStatus(body) {
  return String(body?.status || body?.task?.status || body?.state || '').toLowerCase();
}

function taskProgress(body) {
  const value = body?.progress ?? body?.progress_percent ?? body?.task?.progress;
  const number = Number(value);
  return Number.isFinite(number) ? (number > 1 ? number / 100 : number) : null;
}

export async function generateAgnesVideo({
  prompt,
  durationSeconds = '5',
  resolution = '768x1152',
  onProgress,
  pollMs = 3000,
  timeoutMs = 15 * 60 * 1000,
} = {}) {
  if (!prompt?.trim()) throw new Error('Prompt Agnes đang trống.');
  const create = await withTimeout(fetch('/api/agnes/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt.trim(),
      mode: 't2v',
      duration: String(durationSeconds),
      resolution,
    }),
  }), 60000, 'Agnes không phản hồi khi tạo tác vụ');
  const createBody = await create.json().catch(() => ({}));
  if (!create.ok) throw new Error(createBody?.error || `Agnes trả về ${create.status}`);
  const taskId = taskIdFrom(createBody);
  if (!taskId) throw new Error('Agnes không trả về task_id. Kiểm tra API local.');

  const deadline = Date.now() + timeoutMs;
  let task = createBody;
  onProgress?.(.08, 'Agnes đã nhận tác vụ…');
  while (Date.now() < deadline) {
    const status = taskStatus(task);
    if (['completed', 'complete', 'succeeded', 'success', 'done', 'finished'].includes(status) || task.done === true) break;
    if (['failed', 'failure', 'error', 'cancelled', 'canceled', 'stopped'].includes(status) || task.error) {
      throw new Error(task?.error?.message || task?.message || `Agnes tạo video thất bại (${status})`);
    }
    await sleep(pollMs);
    const response = await withTimeout(fetch(`/api/agnes/tasks/${encodeURIComponent(taskId)}`), 60000, 'Không đọc được trạng thái Agnes');
    task = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(task?.error || `Agnes status trả về ${response.status}`);
    const progress = taskProgress(task);
    onProgress?.(progress == null ? Math.min(.92, .12 + (Date.now() % 9000) / 10000) : Math.min(.95, Math.max(.1, progress)), `Agnes đang dựng video… ${progress == null ? '' : `${Math.round(progress * 100)}%`}`);
  }
  if (task.done !== true && !['completed', 'complete', 'succeeded', 'success', 'done', 'finished'].includes(taskStatus(task))) {
    throw new Error('Agnes tạo video quá lâu, hãy thử lại sau.');
  }
  if (task.error) throw new Error(task.error.message || 'Agnes generation failed');

  const video = await withTimeout(fetch(`/api/agnes/video/${encodeURIComponent(taskId)}`), 120000, 'Không tải được video Agnes');
  if (!video.ok) {
    const detail = await video.text().catch(() => '');
    throw new Error(detail || `Agnes video trả về ${video.status}`);
  }
  const blob = await video.blob();
  onProgress?.(1, 'Video Agnes đã sẵn sàng.');
  return { blob, taskId, model: 'agnes-ai' };
}

export function agnesModelLabel() {
  return 'Agnes AI · self-hosted / cloud-free pipeline';
}
