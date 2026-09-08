/* ─────────────────────────────────────────────
   renderer.js — dựng khung thời gian (timeline)
   và vẽ từng khung hình lên canvas
   ───────────────────────────────────────────── */

import { clamp, lerp, easeInOutSine, mulberry32 } from './util.js';
import { estimateReadTime } from './audio.js';

export const TRANS = 0.7; // thời lượng chuyển cảnh (giây)
const FONT = `"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif`;

/* ────────── Timeline ────────── */

export function sceneDuration(scene) {
  if (scene.type === 'title') return 3.0;
  if (scene.type === 'end') return 2.8;
  if (scene.buffer) return 0.55 + scene.buffer.duration + 0.6;
  return estimateReadTime(scene.text);
}

/** Chia lời bình thành các đoạn phụ đề ngắn */
export function planCaptions(text, dur) {
  const sentences = (text || '')
    .split(/(?<=[.!?…])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = [];
  for (const s of sentences) {
    const words = s.split(/\s+/);
    if (words.length <= 16) { chunks.push(s); continue; }
    let cur = [];
    for (const w of words) {
      cur.push(w);
      if (cur.length >= 14) { chunks.push(cur.join(' ')); cur = []; }
    }
    if (cur.length) chunks.push(cur.join(' '));
  }
  // Gộp các đoạn quá ngắn
  const merged = [];
  for (const c of chunks) {
    const last = merged[merged.length - 1];
    if (last && last.split(/\s+/).length + c.split(/\s+/).length <= 10) {
      merged[merged.length - 1] = last + ' ' + c;
    } else merged.push(c);
  }
  if (!merged.length) return [];

  const totalWords = merged.reduce((s, c) => s + c.split(/\s+/).length, 0) || 1;
  const t0 = 0.32, t1 = Math.max(t0 + 0.5, dur - 0.42);
  let acc = 0;
  return merged.map(c => {
    const w = c.split(/\s+/).length;
    const a = t0 + (t1 - t0) * acc / totalWords;
    acc += w;
    const b = t0 + (t1 - t0) * acc / totalWords;
    return { text: c, t0: a, t1: b };
  });
}

/**
 * Dựng timeline: thời điểm bắt đầu + phụ đề cho từng cảnh.
 * Các cảnh chồng nhau `TRANS` giây để làm mờ dần chồng nhau.
 */
export function buildTimeline(project) {
  const items = [];
  let t = 0;
  project.scenes.forEach((scene, i) => {
    const dur = sceneDuration(scene);
    items.push({
      scene, index: i,
      start: t, dur,
      captions: scene.type === 'body' ? planCaptions(scene.text, dur) : [],
    });
    t += dur - (i < project.scenes.length - 1 ? TRANS : 0);
  });
  return { items, total: Math.max(0.1, t + 0.3) };
}

/* ────────── Helpers vẽ ────────── */

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ────────── Renderer ────────── */

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._kb = new Map();
  }

  /** Tham số Ken Burns / camera preset tất định theo seed của cảnh. */
  kbFor(scene, motionStyle = 'slow-zoom') {
    const key = `${scene.id}:${scene.seed}:${motionStyle}`;
    let kb = this._kb.get(key);
    if (kb) return kb;
    const r = mulberry32((scene.seed || 1) >>> 0);
    const randomX = () => (r() * 2 - 1);
    const randomY = () => (r() * 2 - 1);
    let s0 = 1.03 + r() * 0.03;
    let s1 = 1.10 + r() * 0.05;
    let x0 = randomX() * 0.025, x1 = randomX() * 0.025;
    let y0 = randomY() * 0.025, y1 = randomY() * 0.025;

    if (motionStyle === 'pan-left') { s0 = s1 = 1.08; x0 = 0.055; x1 = -0.055; y0 = y1 = randomY() * 0.025; }
    if (motionStyle === 'pan-right') { s0 = s1 = 1.08; x0 = -0.055; x1 = 0.055; y0 = y1 = randomY() * 0.025; }
    if (motionStyle === 'push-in') { s0 = 1.01; s1 = 1.19; x0 = x1 = randomX() * 0.018; y0 = y1 = randomY() * 0.018; }
    if (motionStyle === 'parallax') { s0 = 1.08; s1 = 1.15; x0 = -0.045; x1 = 0.045; y0 = 0.035; y1 = -0.025; }
    if (motionStyle === 'static') { s0 = s1 = 1.015; x0 = x1 = y0 = y1 = 0; }

    // Pan bị chặn trong giới hạn của zoom nhỏ nhất để ảnh luôn phủ kín canvas.
    const slack = Math.max(0, (Math.min(s0, s1) - 1) / 2);
    const fit = v => clamp(v, -slack, slack);
    kb = { s0, s1, x0: fit(x0), x1: fit(x1), y0: fit(y0), y1: fit(y1) };
    this._kb.set(key, kb);
    return kb;
  }

  /** Vẽ khung hình tại thời điểm t (giây) */
  render(project, tl, assets, t) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const trans = project.transition || 'crossfade';
    for (const it of tl.items) {
      if (t < it.start - 0.001 || t > it.start + it.dur + 0.001) continue;
      const localT = t - it.start;
      let alpha = 1, slideP = null;
      if (trans === 'crossfade') {
        alpha = clamp(localT / TRANS, 0, 1);          // cảnh mới hiện dần đè lên cảnh cũ
      } else if (trans === 'fade') {
        alpha = clamp(Math.min(localT / TRANS, (it.dur - localT) / TRANS), 0, 1);
      } else if (trans === 'slide' && it.index > 0) {
        slideP = clamp(localT / TRANS, 0, 1);          // trượt vào từ phải
      }
      this.drawItem(it, localT, alpha, project, assets, slideP);
    }

    // Mờ dần toàn cục ở đầu & cuối video
    let g = 0;
    if (t < 0.5) g = 1 - t / 0.5;
    if (t > tl.total - 0.5) g = Math.max(g, (t - (tl.total - 0.5)) / 0.5);
    if (g > 0.003) {
      ctx.fillStyle = `rgba(0,0,0,${clamp(g, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawItem(it, localT, alpha, project, assets, slideP) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const min = Math.min(W, H);

    ctx.save();
    if (slideP != null) ctx.translate(W * (1 - slideP) * 0.3, 0);
    ctx.globalAlpha = clamp(alpha, 0, 1);

    // ── Ảnh nền + Ken Burns ──
    const kb = this.kbFor(it.scene, project.motionStyle || 'slow-zoom');
    const p = clamp(localT / it.dur, 0, 1);
    const e = easeInOutSine(p);
    const s = lerp(kb.s0, kb.s1, e);
    const dw = W * s, dh = H * s;
    const dx = (W - dw) / 2 + lerp(kb.x0, kb.x1, e) * W;
    const dy = (H - dh) / 2 + lerp(kb.y0, kb.y1, e) * H;

    const asset = assets.get(it.scene.id);
    if (asset && asset.canvas) {
      ctx.drawImage(asset.canvas, dx, dy, dw, dh);
    } else {
      const g = ctx.createLinearGradient(dx, dy, dx + dw, dy + dh);
      g.addColorStop(0, '#101623'); g.addColorStop(1, '#1c2440');
      ctx.fillStyle = g;
      ctx.fillRect(dx, dy, dw, dh);
    }

    // ── Lớp tối để chữ dễ đọc ──
    if (it.scene.type === 'body') {
      const g = ctx.createLinearGradient(0, dy + dh * 0.45, 0, dy + dh);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = g;
      ctx.fillRect(dx, dy, dw, dh);
    } else {
      ctx.fillStyle = 'rgba(5,8,15,0.45)';
      ctx.fillRect(dx, dy, dw, dh);
    }

    // ── Nội dung ──
    if (it.scene.type === 'title') this.drawTitle(project, it, localT);
    else if (it.scene.type === 'end') this.drawEnd(project, it, localT);
    else this.drawCaptions(it, localT);

    // ── Watermark ──
    if (project.watermark) {
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.font = `600 ${Math.round(min * 0.023)}px ${FONT}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('✦ VideoAI Studio', W - min * 0.03, H - min * 0.028);
      ctx.restore();
    }

    ctx.restore();
  }

  drawTitle(project, it, localT) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const min = Math.min(W, H);
    const inA = clamp(localT / 0.55, 0, 1);
    const rise = (1 - easeInOutSine(inA)) * 26;

    ctx.save();
    ctx.globalAlpha *= inA;
    ctx.textAlign = 'center';

    // nhãn nhỏ phía trên
    ctx.font = `700 ${Math.round(min * 0.026)}px ${FONT}`;
    try { ctx.letterSpacing = `${Math.round(min * 0.006)}px`; } catch { /* noop */ }
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText('VIDEOAI STUDIO TRÌNH BÀY', W / 2, H * 0.34 + rise);
    try { ctx.letterSpacing = '0px'; } catch { /* noop */ }

    // tiêu đề chính
    const fs = clamp(min * 0.085, 34, 72);
    ctx.font = `800 ${Math.round(fs)}px ${FONT}`;
    const lines = wrapText(ctx, project.title || 'Video của tôi', W * 0.84).slice(0, 3);
    const lh = fs * 1.22;
    const y0 = H * 0.46 - ((lines.length - 1) * lh) / 2 + rise;
    lines.forEach((L, i) => {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = fs * 0.25;
      ctx.fillText(L, W / 2, y0 + i * lh);
      ctx.shadowBlur = 0;
    });

    // thanh accent gradient
    const barW = Math.min(W * 0.3, 280) * clamp((localT - 0.25) / 0.7, 0, 1);
    const barY = y0 + (lines.length - 1) * lh + fs * 0.85;
    const barG = ctx.createLinearGradient(W / 2 - barW / 2, 0, W / 2 + barW / 2, 0);
    barG.addColorStop(0, '#7c5cff'); barG.addColorStop(1, '#22d3ee');
    ctx.fillStyle = barG;
    roundRect(ctx, W / 2 - barW / 2, barY, Math.max(2, barW), Math.max(3, min * 0.009), 99);
    ctx.fill();
    ctx.restore();
  }

  drawEnd(project, it, localT) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const min = Math.min(W, H);
    const inA = clamp(localT / 0.5, 0, 1);
    ctx.save();
    ctx.globalAlpha *= inA;
    ctx.textAlign = 'center';

    const fs = clamp(min * 0.075, 30, 64);
    ctx.font = `800 ${Math.round(fs)}px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = fs * 0.25;
    ctx.fillText('Cảm ơn đã xem!', W / 2, H * 0.45);
    ctx.shadowBlur = 0;

    ctx.font = `500 ${Math.round(min * 0.03)}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText(project.title || '', W / 2, H * 0.45 + fs * 0.9);

    ctx.font = `600 ${Math.round(min * 0.026)}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('💜 Tạo bởi VideoAI Studio', W / 2, H * 0.45 + fs * 1.8);
    ctx.restore();
  }

  drawCaptions(it, localT) {
    const chunk = it.captions.find(c => localT >= c.t0 && localT < c.t1);
    if (!chunk) return;
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const min = Math.min(W, H);

    const a = clamp(Math.min((localT - chunk.t0) / 0.25, (chunk.t1 - localT) / 0.25, 1), 0, 1);
    const fs = Math.round(clamp(min * 0.052, 24, 44));

    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = `600 ${fs}px ${FONT}`;

    const lines = wrapText(ctx, chunk.text, W * 0.86);
    const lh = fs * 1.4;
    const padX = fs * 0.65, padY = fs * 0.52;
    let boxW = 0;
    for (const L of lines) boxW = Math.max(boxW, ctx.measureText(L).width);
    boxW += padX * 2;
    const boxH = lines.length * lh + padY;
    const bx = (W - boxW) / 2;
    const by = H - boxH - H * 0.07 + (1 - a) * fs * 0.6;

    ctx.fillStyle = 'rgba(8,10,18,0.66)';
    roundRect(ctx, bx, by, boxW, boxH, fs * 0.42);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((L, i) => {
      ctx.fillText(L, W / 2, by + padY / 2 + i * lh + lh / 2);
    });
    ctx.restore();
  }
}
