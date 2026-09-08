/* ─────────────────────────────────────────────
   audio.js — AudioContext dùng chung, giọng đọc
   trình duyệt (Web Speech API) và nhạc nền tự sinh
   ───────────────────────────────────────────── */

import { mulberry32, clamp } from './util.js';

let _ctx = null;

/** AudioContext dùng chung cho toàn app (tự resume khi cần) */
export function getAudioContext() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    _ctx = new AC();
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

export async function decodeToBuffer(arrayBuffer) {
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

/** ước lượng thời gian đọc 1 đoạn văn (không có audio thật) */
export function estimateReadTime(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return clamp(words / 2.7 + 1.2, 2.8, 11);
}

/* ═══════════ Giọng đọc trình duyệt ═══════════ */

export class BrowserTTS {
  constructor() {
    this.voice = null;
    this.voices = [];
    this.supported = 'speechSynthesis' in window;
    if (this.supported) {
      this.refresh();
      speechSynthesis.addEventListener('voiceschanged', () => this.refresh());
    }
  }

  refresh() {
    if (!this.supported) return;
    this.voices = speechSynthesis.getVoices();
    this.voice =
      this.voices.find(v => /^vi([-_]|$)/i.test(v.lang)) ||
      this.voices.find(v => /vietnam|tiếng việt|tieng viet/i.test(v.name)) ||
      null;
  }

  get hasViVoice() {
    return !!this.voice;
  }

  /** Đọc 1 đoạn — trả về Promise kết thúc khi đọc xong */
  speak(text, { rate = 1, pitch = 1 } = {}) {
    return new Promise(resolve => {
      if (!this.supported || !text) return resolve(false);
      try { speechSynthesis.cancel(); } catch { /* noop */ }
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.lang = this.voice ? this.voice.lang : 'vi-VN';
      u.rate = Number(rate) || 1; u.pitch = Number(pitch) || 1; u.volume = 1;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      this._current = u;
      speechSynthesis.speak(u);
      resolve(true); // không chờ kết thúc — caller tự quản lý theo timeline
    });
  }

  cancel() {
    if (!this.supported) return;
    try { speechSynthesis.cancel(); } catch { /* noop */ }
  }
}

/* ═══════════ Nhạc nền tự sinh (Web Audio) ═══════════ */

const midi2freq = m => 440 * Math.pow(2, (m - 69) / 12);

// Tiến trình hợp âm Am – F – C – G (âm vực trầm, dịu)
const CHORDS = [
  [57, 60, 64, 71],
  [53, 57, 60, 67],
  [48, 52, 55, 64],
  [55, 59, 62, 66],
];

function makeImpulse(ctx, seconds = 2.4, decay = 2.4) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function makeNoiseBuffer(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Lập trình nhạc nền ambient lên một AudioContext (dùng được cả cho
 * nghe trực tiếp lẫnOfflineAudioContext khi xuất video).
 * Trả về hàm stop() để dọn dẹp khi tạm dừng.
 */
export function scheduleMusic(ctx, dest, t0, duration, vol = 0.25) {
  const master = ctx.createGain();
  master.gain.value = vol;
  master.connect(dest);

  const dry = ctx.createGain(); dry.gain.value = 0.75; dry.connect(master);
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx, 2.4, 2.2);
  wet.connect(conv); conv.connect(master);

  const bus = ctx.createGain();
  bus.connect(dry); bus.connect(wet);

  const sources = [];

  // ── Đệm hợp âm (pad) — mỗi hợp âm 4 giây ──
  const nChords = Math.ceil(duration / 4) + 1;
  for (let i = 0; i < nChords; i++) {
    const ct = t0 + i * 4;
    if (ct >= t0 + duration) break;
    const chord = CHORDS[i % CHORDS.length];

    for (const m of chord) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ct);
      g.gain.linearRampToValueAtTime(0.15, ct + 1.4);
      g.gain.setValueAtTime(0.15, ct + 2.6);
      g.gain.linearRampToValueAtTime(0.0001, ct + 4.3);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1050; f.Q.value = 0.4;
      g.connect(f); f.connect(bus);

      for (const det of [-5, 4]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midi2freq(m);
        o.detune.value = det;
        o.connect(g);
        o.start(ct); o.stop(ct + 4.4);
        sources.push(o);
      }
    }

    // ── Hạt cười (pluck) nhẹ theo hợp âm ──
    const r = mulberry32(i * 991 + 7);
    for (let k = 0; k < 8; k++) {
      const pt = ct + k * 0.5;
      if (pt >= t0 + duration - 0.1) break;
      const m = chord[(k + i) % chord.length] + 12 + (r() < 0.3 ? 12 : 0);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midi2freq(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, pt);
      g.gain.linearRampToValueAtTime(0.042, pt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0006, pt + 0.95);
      o.connect(g); g.connect(bus);
      o.start(pt); o.stop(pt + 1.05);
      sources.push(o);
    }
  }

  // ── Lớp "không khí" noise rất khẽ ──
  const ns = ctx.createBufferSource();
  ns.buffer = makeNoiseBuffer(ctx, 2);
  ns.loop = true;
  const nf = ctx.createBiquadFilter();
  nf.type = 'bandpass'; nf.frequency.value = 5200; nf.Q.value = 0.6;
  const ng = ctx.createGain(); ng.gain.value = 0.012;
  ns.connect(nf); nf.connect(ng); ng.connect(bus);
  ns.start(t0); ns.stop(t0 + duration + 0.3);
  sources.push(ns);

  return {
    master,
    stop() {
      try {
        for (const s of sources) { try { s.stop(); } catch { /* đã dừng */ } }
        master.disconnect();
      } catch { /* noop */ }
    },
  };
}
