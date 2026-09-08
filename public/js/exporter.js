/* ─────────────────────────────────────────────
   exporter.js — xuất video (WebM/MP4 tuỳ trình duyệt)
   1. Trộn sẵn toàn bộ âm thanh bằng OfflineAudioContext
   2. Phát realtime + ghi canvas qua MediaRecorder
   ───────────────────────────────────────────── */

import { getAudioContext, scheduleMusic } from './audio.js';

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=h264,aac',
  'video/mp4',
];

export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_CANDIDATES.find(m => MediaRecorder.isTypeSupported(m)) || null;
}

export function extForMime(mime) {
  return mime && mime.startsWith('video/mp4') ? 'mp4' : 'webm';
}

/**
 * Trộn toàn bộ âm thanh (lời bình + nhạc nền) thành 1 AudioBuffer.
 */
async function mixAudio(project, tl) {
  const hasVoice = tl.items.some(it => it.scene.buffer);
  if (!hasVoice && !project.music) return null;

  const sr = 44100;
  const off = new OfflineAudioContext(2, Math.ceil((tl.total + 0.4) * sr), sr);

  for (const it of tl.items) {
    if (!it.scene.buffer) continue;
    const src = off.createBufferSource();
    src.buffer = it.scene.buffer;
    src.connect(off.destination);
    src.start(it.start + 0.55);
  }
  if (project.music) {
    scheduleMusic(off, off.destination, 0, tl.total, project.musicVol ?? 0.25);
  }
  return await off.startRendering();
}

/**
 * Xuất video.
 * @param {object} opts
 *   project, tl, assets        — dữ liệu dự án
 *   canvas                     — canvas dùng để ghi (phải đang hiển thị)
 *   renderAt(t)                — vẽ khung hình tại thời điểm t
 *   monitorAudio (bool)        — phát tiếng trong lúc ghi
 *   onProgress(p, t)           — tiến độ 0..1
 * @returns {Promise<{blob: Blob, mime: string}>}
 */
export async function exportVideo({ project, tl, canvas, renderAt, monitorAudio = true, onProgress }) {
  const mime = pickMime();
  if (!mime) throw new Error('Trình duyệt này không hỗ trợ ghi video (MediaRecorder). Hãy thử Chrome hoặc Edge.');

  // ── 1. Trộn âm thanh ──
  const mixed = await mixAudio(project, tl);

  // ── 2. Chuẩn bị phát + ghi ──
  const ac = getAudioContext();
  if (ac.state === 'suspended') await ac.resume();

  const dest = ac.createMediaStreamDestination();
  let srcNode = null;
  if (mixed) {
    srcNode = ac.createBufferSource();
    srcNode.buffer = mixed;
    srcNode.connect(dest);
    if (monitorAudio) srcNode.connect(ac.destination);
  }

  const fps = 30;
  const vStream = canvas.captureStream(fps);
  const tracks = [...vStream.getVideoTracks()];
  if (mixed) tracks.push(...dest.stream.getAudioTracks());
  const stream = new MediaStream(tracks);

  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 6_000_000,
    audioBitsPerSecond: 160_000,
  });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(res => { rec.onstop = res; });

  // Vẽ khung đầu tiên TRƯỚC khi ghi để không bắt đầu bằng khung đen
  renderAt(0);
  await new Promise(r => requestAnimationFrame(r));

  const t0 = ac.currentTime + 0.12;
  if (srcNode) srcNode.start(t0);
  rec.start(400);

  // ── 3. Vòng ghi realtime — lấy clock từ AudioContext để đồng bộ âm thanh ──
  await new Promise(resolve => {
    const loop = () => {
      const t = ac.currentTime - t0;
      if (t >= tl.total) {
        renderAt(tl.total - 0.01);
        onProgress?.(1, tl.total);
        resolve();
        return;
      }
      renderAt(Math.max(0, t));
      onProgress?.(Math.max(0, t / tl.total), t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  // dừng lại gọn gàng
  await new Promise(r => setTimeout(r, 250));
  rec.stop();
  try { srcNode && srcNode.stop(); } catch { /* noop */ }
  await stopped;

  return { blob: new Blob(chunks, { type: mime }), mime };
}
