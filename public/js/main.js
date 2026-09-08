/* ╀────────────────────────────────────────────
   main.js — bộ điều phối ứng dụng VideoAI Studio
   ───────────────────────────────────────────── */

import { $, $$, clamp, toast, download, slugify, fmtTime, escapeHtml, sleep } from './util.js';
import { THEMES, detectTheme, loadImage, makeSceneCanvas, makeProceduralArt, LIBRARY_LIST } from './art.js';
import {
  service, generateScriptViaAI, heuristicScript, generateImageForPrompt,
  synthesizeVoice, checkTextService, checkImageService, STYLE_SUFFIX,
} from './ai.js';
import { getAudioContext, decodeToBuffer, BrowserTTS, scheduleMusic } from './audio.js';
import { Renderer, buildTimeline } from './renderer.js';
import { exportVideo, extForMime } from './exporter.js';

/* ═══════════ Trạng thái ═══════════ */

const RES = {
  '16:9': { w: 1280, h: 720 },
  '9:16': { w: 720, h: 1280 },
  '1:1': { w: 900, h: 900 },
};

const STORAGE_KEY = 'videoai-studio-v1';

const SAMPLES = [
  'Lịch sử của món Phở Việt Nam',
  '5 mẹo học tiếng Anh hiệu quả',
  'Khoa học đằng sau giấc ngủ',
  'Du lịch Đà Nẵng trong 3 ngày',
  'Vì sao bầu trời lại màu xanh?',
];

const state = {
  title: '',
  topic: '',
  aspect: '16:9',
  style: 'cinematic',
  transition: 'crossfade',
  voice: 'alloy',        // tên giọng AI | 'browser' | 'none'
  music: true,
  musicVol: 0.25,
  watermark: true,
  titleCard: true,
  endCard: true,
  scenes: [],            // {id,type,text,imagePrompt,imageKind,imageRef,seed,theme,buffer,voiceKind}
};

const assets = new Map();   // sceneId → {key, canvas}
let tl = { items: [], total: 0.1 };
let playhead = 0;
let playing = false;
let exporting = false;
let selectedSceneId = null;
let lastActiveSceneId = null;
let mode = 'ai';
let sceneCounter = 0;

const canvas = $('#previewCanvas');
const renderer = new Renderer(canvas);
const browserTTS = new BrowserTTS();

/* ═══════════ Helper DOM ═══════════ */

const ui = {
  serviceChip: $('#serviceChip'),
  screenCreate: $('#screen-create'),
  screenStudio: $('#screen-studio'),
  inputTopic: $('#inputTopic'),
  labelTopic: $('#labelTopic'),
  inputSceneCount: $('#inputSceneCount'),
  sceneCountVal: $('#sceneCountVal'),
  inputStyle: $('#inputStyle'),
  inputVoice: $('#inputVoice'),
  inputTransition: $('#inputTransition'),
  inputTitleCard: $('#inputTitleCard'),
  inputEndCard: $('#inputEndCard'),
  inputMusic: $('#inputMusic'),
  inputWatermark: $('#inputWatermark'),
  btnCreate: $('#btnCreate'),
  sampleChips: $('#sampleChips'),
  restoreBanner: $('#restoreBanner'),
  sceneList: $('#sceneList'),
  sceneBadge: $('#sceneBadge'),
  projectTitle: $('#projectTitle'),
  studioVoice: $('#studioVoice'),
  studioMusic: $('#studioMusic'),
  timeDisplay: $('#timeDisplay'),
  timeline: $('#timeline'),
  timelineFill: $('#timelineFill'),
  timelineTicks: $('#timelineTicks'),
  btnPlay: $('#btnPlay'),
  btnBigPlay: $('#btnBigPlay'),
  btnExport: $('#btnExport'),
  busyOverlay: $('#busyOverlay'),
  busyTitle: $('#busyTitle'),
  busyText: $('#busyText'),
  busyBar: $('#busyBar'),
  // export modal
  exportModal: $('#exportModal'),
  exportSetup: $('#exportSetup'),
  exportProgress: $('#exportProgress'),
  exportResult: $('#exportResult'),
  expRes: $('#expRes'), expDur: $('#expDur'), expScenes: $('#expScenes'),
  expVoice: $('#expVoice'), expMusic: $('#expMusic'), expMonitor: $('#expMonitor'),
  btnExportStart: $('#btnExportStart'),
  expStatus: $('#expStatus'), expBar: $('#expBar'),
  expVideo: $('#expVideo'), btnDownload: $('#btnDownload'), expHint: $('#expHint'),
  // record modal
  recordModal: $('#recordModal'),
  recText: $('#recText'), recTimer: $('#recTimer'), recDot: $('#recDot'),
  btnRecStart: $('#btnRecStart'), btnRecStop: $('#btnRecStop'),
  btnRecPlay: $('#btnRecPlay'), btnRecSave: $('#btnRecSave'),
  // library modal
  libModal: $('#libModal'), libGrid: $('#libGrid'),
};

const fileInput = (() => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  return inp;
})();

/* ═══════════ Busy overlay ═══════════ */

function busy(title, text = '', pct = 0) {
  ui.busyTitle.textContent = title;
  ui.busyText.textContent = text;
  ui.busyBar.style.width = `${clamp(pct * 100, 0, 100)}%`;
  ui.busyOverlay.classList.remove('hidden');
}
function setBusy(title, text, pct) {
  if (title != null) ui.busyTitle.textContent = title;
  if (text != null) ui.busyText.textContent = text;
  ui.busyBar.style.width = `${clamp(pct * 100, 0, 100)}%`;
}
function hideBusy() { ui.busyOverlay.classList.add('hidden'); }

/* ═══════════ Chip trạng thái dịch vụ ═══════════ */

function updateServiceChip() {
  const known = [service.text, service.image, service.audio].filter(v => v !== null);
  if (!known.length) {
    ui.serviceChip.textContent = '⏳ Đang kiểm tra AI…';
    ui.serviceChip.className = 'chip';
    return;
  }
  const parts = [];
  parts.push(service.text === true ? 'văn bản ✓' : service.text === false ? 'văn bản ✗' : 'văn bản ?');
  parts.push(service.image === true ? 'ảnh ✓' : service.image === false ? 'ảnh ✗' : 'ảnh ?');
  parts.push(service.audio === true ? 'giọng ✓' : service.audio === false ? 'giọng ✗' : 'giọng ?');
  const good = [service.text, service.image].filter(v => v === true).length;
  ui.serviceChip.title = 'Trạng thái dịch vụ AI online (Pollinations.ai): ' + parts.join(' · ');
  if (good === 2) { ui.serviceChip.textContent = '⚡ AI online'; ui.serviceChip.className = 'chip ok'; }
  else if (good === 0) { ui.serviceChip.textContent = '🖥 Ưu tiên offline'; ui.serviceChip.className = 'chip off'; }
  else { ui.serviceChip.textContent = '⚡ AI một phần'; ui.serviceChip.className = 'chip off'; }
}

/* ═══════════ Tạo cảnh & asset ═══════════ */

function newId() { return 'sc' + Date.now().toString(36) + '_' + (sceneCounter++); }

function pushScene(type, props = {}) {
  const sc = {
    id: newId(), type,
    text: '', imagePrompt: '',
    imageKind: 'proc', imageRef: null,
    seed: Math.floor(Math.random() * 1e9),
    theme: null, buffer: null, voiceKind: null,
    ...props,
  };
  state.scenes.push(sc);
  return sc;
}

/** Ảnh dự phòng khi AI không dùng được: thư viện → thủ tục */
async function fallbackAsset(sc, w, h) {
  const theme = sc.theme || detectTheme(sc.text || state.title || '', 0);
  sc.theme = theme;
  const th = THEMES[theme];
  if (th && th.lib) {
    try {
      const img = await loadImage(`library/${th.lib}`);
      sc.imageKind = 'library';
      return makeSceneCanvas(img, w, h, theme, sc.seed);
    } catch { /* xuống thủ tục */ }
  }
  sc.imageKind = 'proc';
  return makeProceduralArt(w, h, sc.seed, theme);
}

/** Chuẩn bị ảnh nền cho 1 cảnh (có cache theo key) */
async function ensureAsset(sc) {
  const { w, h } = RES[state.aspect];
  const key = `${sc.id}|${sc.imageKind}|${sc.imageRef}|${sc.seed}|${w}x${h}`;
  const cached = assets.get(sc.id);
  if (cached && cached.key === key) return cached.canvas;

  let cnv;
  try {
    if (sc.imageKind === 'ai' && sc.imageRef) {
      const img = await loadImage(sc.imageRef, { cors: true, timeoutMs: 60000 });
      cnv = makeSceneCanvas(img, w, h, sc.theme, sc.seed);
    } else if (sc.imageKind === 'upload' && sc.imageRef) {
      const img = await loadImage(sc.imageRef);
      cnv = makeSceneCanvas(img, w, h, sc.theme, sc.seed);
    } else if (sc.imageKind === 'library' && THEMES[sc.theme]?.lib) {
      const img = await loadImage(`library/${THEMES[sc.theme].lib}`);
      cnv = makeSceneCanvas(img, w, h, sc.theme, sc.seed);
    } else {
      cnv = makeProceduralArt(w, h, sc.seed, sc.theme || 'cool');
      sc.imageKind = 'proc';
    }
  } catch (e) {
    cnv = await fallbackAsset(sc, w, h);
  }
  assets.set(sc.id, { key, canvas: cnv });
  updateThumb(sc);
  return cnv;
}

function updateThumb(sc) {
  const asset = assets.get(sc.id);
  const thumb = ui.sceneList.querySelector(`.scene-card[data-id="${sc.id}"] canvas`);
  if (asset && thumb) {
    const tctx = thumb.getContext('2d');
    tctx.fillStyle = '#000';
    tctx.fillRect(0, 0, thumb.width, thumb.height);
    tctx.drawImage(asset.canvas, 0, 0, thumb.width, thumb.height);
  }
}

/* ═══════════ Timeline & phát ═══════════ */

function rebuild() {
  tl = buildTimeline(state);
  ui.sceneBadge.textContent = String(state.scenes.filter(s => s.type === 'body').length);
  renderTicks();
  playhead = clamp(playhead, 0, tl.total - 0.01);
  updateTimeUI();
  renderFrame();
  saveSoon();
}

function renderFrame() { renderer.render(state, tl, assets, playhead); }

function itemAt(t) {
  let found = null;
  for (const it of tl.items) if (t >= it.start) found = it;
  return found;
}

function renderTicks() {
  ui.timelineTicks.innerHTML = '';
  for (const it of tl.items) {
    if (it.index === 0) continue;
    const d = document.createElement('div');
    d.className = 'tick';
    d.style.left = `${(it.start / tl.total) * 100}%`;
    ui.timelineTicks.appendChild(d);
  }
}

function updateTimeUI() {
  ui.timeDisplay.textContent = `${fmtTime(playhead)} / ${fmtTime(tl.total)}`;
  ui.timelineFill.style.width = `${(playhead / tl.total) * 100}%`;
  const it = itemAt(playhead);
  const activeId = it ? it.scene.id : null;
  if (activeId !== lastActiveSceneId) {
    $$('.scene-card', ui.sceneList).forEach(c => c.classList.toggle('active', c.dataset.id === activeId));
    lastActiveSceneId = activeId;
  }
}

let t0ctx = 0, playheadAtPlay = 0, rafId = null, musicHandle = null, lastSpokenId = null;

function play() {
  if (playing || exporting) return;
  if (playhead >= tl.total - 0.05) { playhead = 0; }
  playing = true;
  updatePlayUI();
  const ac = getAudioContext();
  t0ctx = ac.currentTime + 0.06;
  playheadAtPlay = playhead;
  if (state.music) {
    musicHandle = scheduleMusic(ac, ac.destination, t0ctx,
      Math.min(tl.total - playhead + 1.5, 240), state.musicVol);
  }
  lastSpokenId = null;
  const loop = () => {
    if (!playing) return;
    const t = playheadAtPlay + (getAudioContext().currentTime - t0ctx);
    if (t >= tl.total) {
      playhead = tl.total - 0.01;
      pause();
      renderFrame(); updateTimeUI();
      return;
    }
    playhead = Math.max(0, t);
    if (state.voice === 'browser') {
      const it = itemAt(playhead);
      if (it && it.scene.type === 'body' && it.scene.id !== lastSpokenId && playhead - it.start < 1.5) {
        lastSpokenId = it.scene.id;
        browserTTS.speak(it.scene.text);
      }
    }
    renderFrame(); updateTimeUI();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function pause() {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(rafId);
  if (musicHandle) { musicHandle.stop(); musicHandle = null; }
  browserTTS.cancel();
  updatePlayUI();
}

function togglePlay() { playing ? pause() : play(); }

function seek(t) {
  pause();
  playhead = clamp(t, 0, tl.total - 0.01);
  renderFrame(); updateTimeUI();
}

function updatePlayUI() {
  ui.btnPlay.textContent = playing ? '⏸' : '▶';
  ui.btnBigPlay.classList.toggle('hidden', playing);
}

/* ═══════════ Luồng tạo video ═══════════ */

function collectCreateOpts() {
  return {
    mode,
    topic: ui.inputTopic.value,
    sceneCount: parseInt(ui.inputSceneCount.value, 10) || 5,
    aspect: $('#segAspect button.active').dataset.v,
    style: ui.inputStyle.value,
    voice: ui.inputVoice.value,
    transition: ui.inputTransition.value,
    titleCard: ui.inputTitleCard.checked,
    endCard: ui.inputEndCard.checked,
    music: ui.inputMusic.checked,
    watermark: ui.inputWatermark.checked,
  };
}

function applyOptsToState(o) {
  Object.assign(state, {
    topic: o.topic, aspect: o.aspect, style: o.style, voice: o.voice,
    transition: o.transition, titleCard: o.titleCard, endCard: o.endCard,
    music: o.music, watermark: o.watermark,
  });
}

function deriveTitle(topic, parts) {
  if (parts && parts.length && parts[0].text) {
    const first = parts[0].text.split(/(?<=[.!?…])\s+/)[0].trim();
    if (first && first.length <= 70) return first.replace(/[.]$/, '');
  }
  const t = (topic || 'Video của tôi').trim();
  return t.length > 70 ? t.slice(0, 67) + '…' : t;
}

async function createFlow() {
  const opts = collectCreateOpts();
  if (!opts.topic.trim()) {
    toast('Vui lòng nhập <b>chủ đề</b> hoặc dán <b>kịch bản</b> trước nhé!', 'warn');
    ui.inputTopic.focus();
    return;
  }
  applyOptsToState(opts);
  const n = opts.sceneCount;
  const bodyTarget = n;

  busy('✍️ Đang viết kịch bản…', 'Đang nhờ AI viết kịch bản cho video của bạn…', 0.06);

  let parts = null;
  if (opts.mode === 'ai') {
    try {
      parts = await generateScriptViaAI(opts.topic, { sceneCount: n, style: opts.style });
      service.text = true;
      updateServiceChip();
    } catch (e) {
      console.warn('AI script failed:', e);
      service.text = false;
      toast('⚠️ Không gọi được <b>AI viết kịch bản online</b> — đã dùng phương án dự phòng (chia văn bản thành cảnh).', 'warn', 6500);
    }
  }
  if (!parts) parts = heuristicScript(opts.topic, { sceneCount: n, style: opts.style });

  state.title = deriveTitle(opts.topic, parts);
  const overallTheme = detectTheme(opts.topic + ' ' + parts.map(p => p.text).join(' '), 0);

  // Dựng danh sách cảnh
  state.scenes = [];
  assets.clear();
  if (state.titleCard) {
    pushScene('title', { text: state.title, theme: overallTheme });
  }
  parts.forEach((p, i) => {
    pushScene('body', {
      text: p.text,
      imagePrompt: p.imagePrompt || '',
      theme: detectTheme(p.text + ' ' + (p.imagePrompt || ''), i),
    });
  });
  if (state.endCard) {
    pushScene('end', { text: 'Cảm ơn đã xem!', theme: overallTheme });
  }

  const bodyScenes = state.scenes.filter(s => s.type === 'body');
  const { w, h } = RES[state.aspect];
  canvas.width = w; canvas.height = h;

  // ── Giọng đọc ──
  if (state.voice !== 'none' && state.voice !== 'browser') {
    let switched = false;
    for (let i = 0; i < bodyScenes.length; i++) {
      const sc = bodyScenes[i];
      setBusy('🔊 Đang tạo giọng đọc…', `Lời bình cảnh ${i + 1}/${bodyScenes.length}…`, 0.15 + 0.4 * (i / bodyScenes.length));
      try {
        const ab = await synthesizeVoice(sc.text, state.voice);
        sc.buffer = await decodeToBuffer(ab);
        sc.voiceKind = 'ai';
        service.audio = true;
        updateServiceChip();
      } catch (e) {
        console.warn('TTS failed:', e);
        service.audio = false;
        updateServiceChip();
        switched = true;
        break;
      }
    }
    if (switched) {
      state.voice = browserTTS.hasViVoice ? 'browser' : 'none';
      syncVoiceUI();
      toast(
        state.voice === 'browser'
          ? '⚠️ Không dùng được <b>giọng đọc AI online</b> — đã chuyển sang giọng đọc của trình duyệt. (Video xuất ra sẽ không kèm giọng đọc — bạn có thể thu âm giọng mình bằng nút 🎙 ở từng cảnh.)'
          : '⚠️ Không dùng được <b>giọng đọc AI online</b> và trình duyệt không có giọng tiếng Việt — tạm tắt lời bình. Bạn có thể thu âm bằng nút 🎫.',
        'warn', 9000
      );
    }
  } else if (state.voice === 'browser' && !browserTTS.hasViVoice) {
    toast('ℹ️ Trình duyệt không có giọng tiếng Việt — giọng đọc có thể không chuẩn.', 'warn', 6000);
  }

  // ── Hình ảnh ──
  let useAIImage = service.image !== false;
  for (let i = 0; i < state.scenes.length; i++) {
    const sc = state.scenes[i];
    setBusy('🖼 Đang dựng hình…', `Hình nền cảnh ${i + 1}/${state.scenes.length}…`, 0.55 + 0.44 * (i / state.scenes.length));
    let done = false;
    if (useAIImage && sc.type === 'body' && sc.imagePrompt) {
      try {
        const { img, url } = await generateImageForPrompt(sc.imagePrompt, sc.seed, w, h);
        sc.imageKind = 'ai';
        sc.imageRef = url;
        assets.set(sc.id, { key: `${sc.id}|ai|${url}|${sc.seed}|${w}x${h}`, canvas: makeSceneCanvas(img, w, h, sc.theme, sc.seed) });
        service.image = true;
        done = true;
        await sleep(400); // dễ hoà với rate-limit miễn phí
      } catch (e) {
        console.warn('AI image failed:', e);
        service.image = false;
        useAIImage = false;
        updateServiceChip();
        toast('⚠️ Không tạo được <b>ảnh AI online</b> — các cảnh sẽ dùng ảnh thư viện AI có sẵn. Vẫn có thể thử lại từng cảnh bằng nút 🖼 AI.', 'warn', 7000);
      }
    }
    if (!done) {
      const cnv = await fallbackAsset(sc, w, h);
      assets.set(sc.id, { key: `${sc.id}|${sc.imageKind}|${sc.imageRef}|${sc.seed}|${w}x${h}`, canvas: cnv });
    }
  }
  updateServiceChip();

  hideBusy();
  playhead = 0;
  enterStudio();
  saveProject();
  toast('✨ Video đã sẵn sàng! Nhấn <b>▶</b> để xem trước, chỉnh cảnh ở bảng bên trái.', 'ok', 6000);
}

/* ═══════════ Studio ═══════════ */

function enterStudio() {
  ui.screenCreate.classList.add('hidden');
  ui.screenStudio.classList.remove('hidden');
  ui.projectTitle.value = state.title;
  syncVoiceUI();
  ui.studioMusic.checked = state.music;
  const { w, h } = RES[state.aspect];
  canvas.width = w; canvas.height = h;
  playhead = 0; playing = false;
  updatePlayUI();
  renderSceneList();
  rebuild();
  // Bảo đảm asset (khi khôi phục dự án)
  (async () => {
    for (const sc of state.scenes) { await ensureAsset(sc); }
    renderFrame();
    state.scenes.forEach(updateThumb);
  })();
}

function syncVoiceUI() {
  ui.studioVoice.value = state.voice;
  ui.inputVoice.value = state.voice;
}

function kindLabel(sc) {
  return { ai: '🖼 AI', library: '📚 Thư viện', upload: '⬆ Ảnh riêng', proc: '🎨 Trừu tượng' }[sc.imageKind] || '';
}

function voiceBadge(sc) {
  if (sc.voiceKind === 'ai') return '<span class="m voice">🔊 AI</span>';
  if (sc.voiceKind === 'mic') return '<span class="m mic">🎙 Thu âm</span>';
  if (sc.buffer) return '<span class="m voice">🔊</span>';
  if (state.voice === 'browser') return '<span class="m">🖥️ Đọc trực tiếp</span>';
  return '';
}

function sceneDurLabel(sc) {
  const it = tl.items.find(x => x.scene.id === sc.id);
  return it ? it.dur.toFixed(1) : '–';
}

function renderSceneList() {
  ui.sceneList.innerHTML = '';
  state.scenes.forEach((sc, i) => {
    const card = document.createElement('div');
    card.className = 'scene-card' + (sc.type !== 'body' ? ' cardtype' : '') + (sc.id === selectedSceneId ? ' selected' : '');
    card.dataset.id = sc.id;

    const isTitle = sc.type === 'title', isEnd = sc.type === 'end';
    const textVal = isTitle ? (state.title || 'Màn mở đầu') : isEnd ? 'Cảm ơn đã xem!' : sc.text;
    const typeIcon = isTitle ? '🎬' : isEnd ? '🏁' : '';

    card.innerHTML = `
      <div class="scene-thumb">
        <canvas width="184" height="104"></canvas>
        <span class="scene-num">${i + 1}</span>
        ${typeIcon ? `<span class="scene-num" style="right:3px;left:auto">${typeIcon}</span>` : ''}
      </div>
      <div class="scene-body">
        <textarea class="scene-text" rows="3" ${sc.type !== 'body' ? 'disabled' : ''}
          placeholder="${isTitle ? 'Màn mở đầu (dùng tên video)' : isEnd ? 'Màn kết thúc' : 'Lời bình của cảnh…'}">${escapeHtml(textVal)}</textarea>
        <div class="scene-meta">
          <span class="m">⏱ ${sceneDurLabel(sc)}s</span>
          ${voiceBadge(sc)}
          <span class="m">${kindLabel(sc)}</span>
        </div>
        ${sc.type === 'body' ? `
        <div class="scene-tools">
          <button class="tool" data-act="aiImage" title="Tạo ảnh AI riêng cho cảnh này">🖼 AI</button>
          <button class="tool" data-act="libImage" title="Chọn ảnh từ thư viện">📚</button>
          <button class="tool" data-act="upload" title="Tải ảnh của bạn lên">⬆️</button>
          <button class="tool" data-act="procImage" title="Sinh ảnh trừu tượng mới">🎨</button>
          <button class="tool" data-act="aiVoice" title="Tạo giọng đọc AI lại cho cảnh này">🔊</button>
          <button class="tool" data-act="micVoice" title="Thu giọng của bạn">🎙</button>
          <button class="tool" data-act="delVoice" title="Xoá giọng đọc của cảnh">🔇</button>
          <button class="tool" data-act="up" title="Đưa lên trước">↑</button>
          <button class="tool" data-act="down" title="Chuyển xuống sau">↓</button>
          <button class="tool del" data-act="delete" title="Xoá cảnh">🗑</button>
        </div>` : ''}
      </div>`;
    ui.sceneList.appendChild(card);
    updateThumb(sc);
  });
}

/** Cập nhật nhẹ nhàng phần meta của 1 card (không đụng textarea đang gõ) */
function refreshSceneCard(sc) {
  const card = ui.sceneList.querySelector(`.scene-card[data-id="${sc.id}"]`);
  if (!card) return;
  const meta = card.querySelector('.scene-meta');
  if (meta) {
    meta.innerHTML = `<span class="m">⏱ ${sceneDurLabel(sc)}s</span> ${voiceBadge(sc)} <span class="m">${kindLabel(sc)}</span>`;
  }
  updateThumb(sc);
}

/* ── Hành động trên từng cảnh ── */

async function handleSceneAction(sc, act) {
  const idx = state.scenes.indexOf(sc);
  switch (act) {
    case 'aiImage': {
      busy('🖼 Tạo ảnh AI…', 'Đang tạo hình nền mới cho cảnh…', 0.4);
      try {
        sc.seed = Math.floor(Math.random() * 1e9);
        if (!sc.imagePrompt) {
          sc.theme = sc.theme || detectTheme(sc.text, idx);
          sc.imagePrompt = `${THEMES[sc.theme].en}, ${STYLE_SUFFIX[state.style] || ''}`;
        }
        const { w, h } = RES[state.aspect];
        const { img, url } = await generateImageForPrompt(sc.imagePrompt, sc.seed, w, h);
        sc.imageKind = 'ai'; sc.imageRef = url;
        assets.set(sc.id, { key: `${sc.id}|ai|${url}|${sc.seed}|${w}x${h}`, canvas: makeSceneCanvas(img, w, h, sc.theme, sc.seed) });
        service.image = true; updateServiceChip();
        hideBusy();
        refreshSceneCard(sc); renderFrame(); saveSoon();
        toast('🖼 Đã tạo ảnh AI mới cho cảnh này.', 'ok', 2500);
      } catch (e) {
        hideBusy();
        toast('Không tạo được ảnh AI (mạng hoặc giới hạn tốc độ). Thử lại sau hoặc dùng 📚/🎨.', 'err');
      }
      break;
    }
    case 'libImage':
      openLibModal(sc);
      break;
    case 'upload':
      fileInput.onchange = () => {
        const f = fileInput.files && fileInput.files[0];
        fileInput.value = '';
        if (!f) return;
        const rd = new FileReader();
        rd.onload = async () => {
          sc.imageKind = 'upload';
          sc.imageRef = rd.result;
          await ensureAsset(sc);
          refreshSceneCard(sc); renderFrame();
          toast('⬆️ Đã dùng ảnh của bạn cho cảnh này.', 'ok', 2500);
          saveSoon();
        };
        rd.readAsDataURL(f);
      };
      fileInput.click();
      break;
    case 'procImage':
      sc.seed = Math.floor(Math.random() * 1e9);
      sc.imageKind = 'proc';
      await ensureAsset(sc);
      refreshSceneCard(sc); renderFrame(); saveSoon();
      break;
    case 'aiVoice': {
      busy('🔊 Tạo giọng đọc AI…', 'Đang đọc lời bình của cảnh…', 0.5);
      try {
        const ab = await synthesizeVoice(sc.text, state.voice === 'browser' || state.voice === 'none' ? 'alloy' : state.voice);
        sc.buffer = await decodeToBuffer(ab);
        sc.voiceKind = 'ai';
        service.audio = true;
        hideBusy();
        rebuild(); refreshSceneCard(sc);
        toast('🔊 Đã tạo giọng đọc AI cho cảnh này.', 'ok', 2500);
      } catch (e) {
        hideBusy();
        toast('Không tạo được giọng đọc AI. Bạn có thể thu âm giọng mình bằng nút 🎙.', 'err', 5000);
      }
      break;
    }
    case 'micVoice':
      openRecordModal(sc);
      break;
    case 'delVoice':
      sc.buffer = null; sc.voiceKind = null;
      rebuild(); refreshSceneCard(sc);
      break;
    case 'up':
      if (idx > 0) {
        state.scenes.splice(idx - 1, 0, state.scenes.splice(idx, 1)[0]);
        renderSceneList(); rebuild();
      }
      break;
    case 'down':
      if (idx < state.scenes.length - 1) {
        state.scenes.splice(idx + 1, 0, state.scenes.splice(idx, 1)[0]);
        renderSceneList(); rebuild();
      }
      break;
    case 'delete': {
      const bodyCount = state.scenes.filter(s => s.type === 'body').length;
      if (sc.type === 'body' && bodyCount <= 1) {
        toast('Cần giữ ít nhất một cảnh nội dung.', 'warn');
        return;
      }
      state.scenes.splice(idx, 1);
      assets.delete(sc.id);
      renderSceneList(); rebuild();
      break;
    }
  }
}

/* ═══════════ Modal chọn ảnh thư viện ═══════════ */

let libTarget = null;

function openLibModal(sc) {
  libTarget = sc;
  if (!ui.libGrid.childElementCount) {
    const items = [...LIBRARY_LIST, { key: 'warm', label: 'Trừu tượng ấm', proc: true }, { key: 'cool', label: 'Trừu tượng lạnh', proc: true }];
    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'lib-item' + (it.proc ? ' proc' : '');
      d.dataset.key = it.key;
      if (it.proc) {
        d.style.background = `linear-gradient(135deg, ${THEMES[it.key].palette[0]}, ${THEMES[it.key].palette[2]}, ${THEMES[it.key].palette[3]})`;
        d.textContent = '🎨';
      } else {
        const img = document.createElement('img');
        img.src = it.src; img.alt = it.label; img.loading = 'lazy';
        d.appendChild(img);
      }
      const s = document.createElement('span');
      s.textContent = it.label;
      d.appendChild(s);
      ui.libGrid.appendChild(d);
    });
  }
  ui.libModal.classList.remove('hidden');
}

ui.libGrid.addEventListener('click', async e => {
  const item = e.target.closest('.lib-item');
  if (!item || !libTarget) return;
  const sc = libTarget;
  sc.theme = item.dataset.key;
  sc.imageKind = THEMES[sc.theme]?.lib ? 'library' : 'proc';
  sc.imageRef = null;
  ui.libModal.classList.add('hidden');
  busy('🖼 Đang đổi ảnh nền…', '', 0.5);
  await ensureAsset(sc);
  hideBusy();
  refreshSceneCard(sc); renderFrame(); saveSoon();
});

/* ═══════════ Modal thu âm ═══════════ */

const rec = { scene: null, recorder: null, chunks: [], blob: null, url: null, timer: null, t0: 0 };

function openRecordModal(sc) {
  rec.scene = sc;
  rec.blob = null;
  if (rec.url) { URL.revokeObjectURL(rec.url); rec.url = null; }
  ui.recText.textContent = sc.text || '(Cảnh này chưa có lời bình — hãy gõ nội dung trước khi thu.)';
  ui.recTimer.textContent = '0:00';
  ui.recDot.classList.add('hidden');
  ui.btnRecStart.textContent = '⏺ Bắt đầu thu';
  ui.btnRecStart.classList.remove('hidden');
  ui.btnRecStop.classList.add('hidden');
  ui.btnRecPlay.classList.add('hidden');
  ui.btnRecSave.classList.add('hidden');
  ui.recordModal.classList.remove('hidden');
}

function stopRecTimer() {
  if (rec.timer) { clearInterval(rec.timer); rec.timer = null; }
  ui.recDot.classList.add('hidden');
}

ui.btnRecStart.addEventListener('click', async () => {
  if (!rec.scene) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      .find(m => MediaRecorder.isTypeSupported(m)) || '';
    rec.recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.chunks = [];
    rec.recorder.ondataavailable = e => { if (e.data.size) rec.chunks.push(e.data); };
    rec.recorder.onstop = () => {
      rec.blob = new Blob(rec.chunks, { type: rec.recorder.mimeType || 'audio/webm' });
      rec.url = URL.createObjectURL(rec.blob);
      stream.getTracks().forEach(t => t.stop());
      stopRecTimer();
      ui.btnRecPlay.classList.remove('hidden');
      ui.btnRecSave.classList.remove('hidden');
      ui.btnRecStart.textContent = '⏺ Thu lại';
    };
    rec.recorder.start(250);
    rec.t0 = Date.now();
    ui.recDot.classList.remove('hidden');
    ui.btnRecStart.classList.add('hidden');
    ui.btnRecStop.classList.remove('hidden');
    rec.timer = setInterval(() => {
      ui.recTimer.textContent = fmtTime((Date.now() - rec.t0) / 1000);
    }, 250);
  } catch (e) {
    toast('Không truy cập được micro — hãy kiểm tra quyền truy cập của trình duyệt.', 'err');
  }
});

ui.btnRecStop.addEventListener('click', () => {
  if (rec.recorder && rec.recorder.state !== 'inactive') rec.recorder.stop();
  ui.btnRecStop.classList.add('hidden');
});

ui.btnRecPlay.addEventListener('click', () => {
  if (rec.url) new Audio(rec.url).play();
});

ui.btnRecSave.addEventListener('click', async () => {
  if (!rec.blob || !rec.scene) return;
  try {
    const ab = await rec.blob.arrayBuffer();
    rec.scene.buffer = await decodeToBuffer(ab);
    rec.scene.voiceKind = 'mic';
    ui.recordModal.classList.add('hidden');
    rebuild(); refreshSceneCard(rec.scene);
    toast('🎙 Đã dùng bản thu âm của bạn cho cảnh này.', 'ok');
  } catch (e) {
    toast('Không đọc được file âm thanh vừa thu.', 'err');
  }
});

/* ═══════════ Xuất video ═══════════ */

function fillExportSetup() {
  const { w, h } = RES[state.aspect];
  ui.expRes.textContent = `${w} × ${h} (${state.aspect})`;
  ui.expDur.textContent = fmtTime(tl.total);
  ui.expScenes.textContent = String(state.scenes.length);
  ui.expVoice.textContent =
    tl.items.some(it => it.scene.buffer) ? 'Có (AI/thu âm)'
    : state.voice === 'browser' ? 'Chỉ khi xem trước (trình duyệt)'
    : 'Không';
  ui.expMusic.textContent = state.music ? 'Có' : 'Không';
}

ui.btnExport.addEventListener('click', () => {
  pause();
  fillExportSetup();
  ui.exportSetup.classList.remove('hidden');
  ui.exportProgress.classList.add('hidden');
  ui.exportResult.classList.add('hidden');
  ui.exportModal.classList.remove('hidden');
});

ui.btnExportStart.addEventListener('click', async () => {
  if (exporting) return;
  exporting = true;
  ui.exportSetup.classList.add('hidden');
  ui.exportProgress.classList.remove('hidden');
  ui.exportResult.classList.add('hidden');
  ui.expStatus.textContent = 'Đang trộn âm thanh…';
  ui.expBar.style.width = '0%';
  let outUrl = null;
  try {
    const { blob, mime } = await exportVideo({
      project: state, tl,
      canvas,
      renderAt: t => renderer.render(state, tl, assets, t),
      monitorAudio: ui.expMonitor.checked,
      onProgress: (p) => {
        ui.expBar.style.width = `${(p * 100).toFixed(1)}%`;
        ui.expStatus.textContent = `🎥 Đang quay video… ${Math.round(p * 100)}%`;
      },
    });
    if (outUrl) URL.revokeObjectURL(outUrl);
    outUrl = URL.createObjectURL(blob);
    ui.expVideo.src = outUrl;
    const ext = extForMime(mime);
    ui.btnDownload.onclick = () => download(blob, `${slugify(state.title)}.${ext}`);
    ui.expHint.textContent = ext === 'mp4'
      ? '✅ Video MP4 — phát được trên hầu hết thiết bị.'
      : 'Video định dạng WebM — mở bằng Chrome/Edge hoặc tải lên YouTube/TikTok trực tiếp. Cần MP4 thì chuyển bằng công cụ chuyển đổi.';
    ui.exportProgress.classList.add('hidden');
    ui.exportResult.classList.remove('hidden');
    toast('✅ Xuất video thành công!', 'ok');
  } catch (e) {
    console.error(e);
    ui.exportProgress.classList.add('hidden');
    ui.exportSetup.classList.remove('hidden');
    toast('Xuất video lỗi: ' + e.message, 'err', 7000);
  } finally {
    exporting = false;
  }
});

window.addEventListener('beforeunload', e => {
  if (exporting) { e.preventDefault(); e.returnValue = ''; }
});

/* ═══════════ Lưu / khôi phục dự án ═══════════ */

let saveTimer = null;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProject, 900);
}

function saveProject() {
  if (!state.scenes.length) return;
  try {
    const data = {
      v: 1, savedAt: Date.now(),
      title: state.title, topic: state.topic, aspect: state.aspect, style: state.style,
      transition: state.transition, voice: state.voice, music: state.music,
      musicVol: state.musicVol, watermark: state.watermark,
      titleCard: state.titleCard, endCard: state.endCard,
      scenes: state.scenes.map(sc => ({
        type: sc.type, text: sc.text, seed: sc.seed, theme: sc.theme,
        imageKind: sc.imageKind === 'upload' ? 'library' : sc.imageKind,
        imageRef: sc.imageKind === 'ai' ? sc.imageRef : null,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* localStorage đầy — bỏ qua */ }
}

function restoreProject(data) {
  state.title = data.title || 'Video của tôi';
  state.topic = data.topic || '';
  state.aspect = RES[data.aspect] ? data.aspect : '16:9';
  state.style = data.style || 'cinematic';
  state.transition = data.transition || 'crossfade';
  state.voice = data.voice || 'none';
  state.music = !!data.music;
  state.watermark = data.watermark !== false;
  state.titleCard = data.titleCard !== false;
  state.endCard = data.endCard !== false;
  state.scenes = [];
  assets.clear();
  (data.scenes || []).forEach(sc => {
    pushScene(sc.type || 'body', {
      text: sc.text || '',
      seed: sc.seed ?? Math.floor(Math.random() * 1e9),
      theme: sc.theme || null,
      imageKind: ['ai', 'library', 'proc', 'upload'].includes(sc.imageKind) ? sc.imageKind : 'proc',
      imageRef: sc.imageKind === 'ai' ? sc.imageRef : null,
    });
  });
  if (!state.scenes.length) return false;
  enterStudio();
  toast('📋 Đã khôi phục dự án. Lưu ý: giọng đọc không được lưu — nhấn <b>🔊↻</b> để tạo lại.', 'info', 7000);
  return true;
}

/* ═══════════ Gắn sự kiện ═══════════ */

// Tabs chế độ
$$('#modeTabs .tab').forEach(t => {
  t.addEventListener('click', () => {
    $$('#modeTabs .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    mode = t.dataset.mode;
    if (mode === 'ai') {
      ui.labelTopic.textContent = 'Chủ đề video';
      ui.inputTopic.placeholder = 'Ví dụ: Trí tuệ nhân tạo và tương lai của nhân loại\n\nMẹo: càng mô tả rõ bạn muốn nói về điều gì, kịch bản càng chuẩn.';
    } else {
      ui.labelTopic.textContent = 'Kịch bản của bạn (AI sẽ chia thành các cảnh)';
      ui.inputTopic.placeholder = 'Dán toàn bộ kịch bản/lời bình vào đây, mỗi câu cách nhau bằng dấu chấm…';
    }
  });
});

// Số cảnh
ui.inputSceneCount.addEventListener('input', () => {
  ui.sceneCountVal.textContent = ui.inputSceneCount.value;
});

// Tỉ lệ khung hình
$$('#segAspect button').forEach(b => {
  b.addEventListener('click', () => {
    $$('#segAspect button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  });
});

// Ý tưởng mẫu
SAMPLES.forEach(s => {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'sample-chip';
  chip.textContent = s;
  chip.addEventListener('click', () => { ui.inputTopic.value = s; ui.inputTopic.focus(); });
  ui.sampleChips.appendChild(chip);
});

ui.btnCreate.addEventListener('click', createFlow);

// Nút khôi phục
$('#btnRestore').addEventListener('click', () => {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { /* noop */ }
  if (data && restoreProject(data)) ui.restoreBanner.classList.add('hidden');
});
$('#btnDiscardRestore').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  ui.restoreBanner.classList.add('hidden');
});

// Studio — tiêu đề
ui.projectTitle.addEventListener('input', () => {
  state.title = ui.projectTitle.value;
  const t = state.scenes.find(s => s.type === 'title');
  if (t) {
    const card = ui.sceneList.querySelector(`.scene-card[data-id="${t.id}"] .scene-text`);
    if (card) card.value = state.title || 'Màn mở đầu';
  }
  renderFrame(); saveSoon();
});

// Studio — giọng đọc
ui.studioVoice.addEventListener('change', () => {
  state.voice = ui.studioVoice.value;
  syncVoiceUI();
  if (state.voice !== 'none' && state.voice !== 'browser' && !state.scenes.some(s => s.voiceKind === 'ai')) {
    toast('Đã chọn giọng AI — nhấn <b>🔊↻</b> để tạo giọng đọc cho các cảnh.', 'info', 5000);
  }
  saveSoon();
});

$('#btnRegenVoice').addEventListener('click', async () => {
  if (state.voice === 'none' || state.voice === 'browser') {
    toast('Hãy chọn một giọng AI trong ô chọn giọng đọc trước.', 'warn');
    return;
  }
  const bodyScenes = state.scenes.filter(s => s.type === 'body' && s.text.trim());
  if (!bodyScenes.length) return;
  busy('🔊 Tạo lại giọng đọc…', 'Cảnh 1/' + bodyScenes.length + '…', 0.05);
  let ok = 0;
  for (let i = 0; i < bodyScenes.length; i++) {
    setBusy(null, `Cảnh ${i + 1}/${bodyScenes.length}…`, 0.05 + 0.9 * (i + 1) / bodyScenes.length);
    try {
      const ab = await synthesizeVoice(bodyScenes[i].text, state.voice);
      bodyScenes[i].buffer = await decodeToBuffer(ab);
      bodyScenes[i].voiceKind = 'ai';
      ok++;
    } catch { /* cảnh lỗi thì bỏ qua */ }
  }
  hideBusy();
  rebuild();
  state.scenes.forEach(refreshSceneCard);
  if (ok) toast(`🔊 Đã tạo giọng đọc cho ${ok}/${bodyScenes.length} cảnh.`, 'ok');
  else toast('Không tạo được giọng đọc AI — kiểm tra kết nối mạng.', 'err', 6000);
});

// Studio — nhạc
ui.studioMusic.addEventListener('change', () => {
  state.music = ui.studioMusic.checked;
  saveSoon();
});

// Quay lại màn tạo
$('#btnBackCreate').addEventListener('click', () => {
  pause();
  // Điền lại các tuỳ chọn từ trạng thái hiện tại
  ui.inputTopic.value = state.topic || '';
  ui.inputSceneCount.value = String(Math.max(3, Math.min(8, state.scenes.filter(s => s.type === 'body').length)));
  ui.sceneCountVal.textContent = ui.inputSceneCount.value;
  $$('#segAspect button').forEach(b => b.classList.toggle('active', b.dataset.v === state.aspect));
  ui.inputStyle.value = state.style;
  ui.inputVoice.value = state.voice;
  ui.inputTransition.value = state.transition;
  ui.inputTitleCard.checked = state.titleCard;
  ui.inputEndCard.checked = state.endCard;
  ui.inputMusic.checked = state.music;
  ui.inputWatermark.checked = state.watermark;
  ui.screenStudio.classList.add('hidden');
  ui.screenCreate.classList.remove('hidden');
  window.scrollTo({ top: 0 });
});

// Thêm cảnh
$('#btnAddScene').addEventListener('click', async () => {
  const sc = pushScene('body', { theme: detectTheme('', state.scenes.length) });
  await ensureAsset(sc);
  selectedSceneId = sc.id;
  rebuild();
  renderSceneList();
  ui.sceneList.scrollTop = ui.sceneList.scrollHeight;
});

// Danh sách cảnh — uỷ quyền sự kiện
ui.sceneList.addEventListener('input', e => {
  const card = e.target.closest('.scene-card');
  if (!card || !e.target.classList.contains('scene-text')) return;
  const sc = state.scenes.find(s => s.id === card.dataset.id);
  if (!sc || sc.type !== 'body') return;
  sc.text = e.target.value;
  // dựng lại timeline nhẹ (không render lại list để không mất focus)
  tl = buildTimeline(state);
  renderTicks();
  updateTimeUI(); renderFrame();
  refreshDurOnly(sc);
  saveSoon();
});

function refreshDurOnly(sc) {
  const card = ui.sceneList.querySelector(`.scene-card[data-id="${sc.id}"] .m`);
  if (card) card.textContent = `⏱ ${sceneDurLabel(sc)}s`;
}

ui.sceneList.addEventListener('click', e => {
  const card = e.target.closest('.scene-card');
  if (!card) return;
  const sc = state.scenes.find(s => s.id === card.dataset.id);
  if (!sc) return;

  const tool = e.target.closest('.tool');
  if (tool) {
    e.stopPropagation();
    handleSceneAction(sc, tool.dataset.act);
    return;
  }
  if (e.target.closest('.scene-text')) return; // đang gõ chữ — không tua

  // Chọn cảnh & tua tới đầu cảnh
  selectedSceneId = sc.id;
  $$('.scene-card', ui.sceneList).forEach(c => c.classList.toggle('selected', c.dataset.id === sc.id));
  const it = tl.items.find(x => x.scene.id === sc.id);
  if (it) seek(it.start + 0.05);
});

// Phát / dừng
ui.btnPlay.addEventListener('click', togglePlay);
ui.btnBigPlay.addEventListener('click', togglePlay);
$('#canvasWrap').addEventListener('click', e => {
  if (e.target === ui.btnBigPlay) return;
  togglePlay();
});

// Tua bằng thanh thời gian
let scrubbing = false, wasPlayingBeforeScrub = false;
function scrubTo(e) {
  const r = ui.timeline.getBoundingClientRect();
  if (!r.width) return;
  const p = clamp((e.clientX - r.left) / r.width, 0, 1);
  playhead = p * tl.total;
  renderFrame(); updateTimeUI();
}
ui.timeline.addEventListener('pointerdown', e => {
  scrubbing = true;
  wasPlayingBeforeScrub = playing;
  if (playing) pause();
  ui.timeline.setPointerCapture(e.pointerId);
  scrubTo(e);
});
ui.timeline.addEventListener('pointermove', e => { if (scrubbing) scrubTo(e); });
ui.timeline.addEventListener('pointerup', () => {
  if (scrubbing && wasPlayingBeforeScrub) play();
  scrubbing = false;
});

// Phím tắt
document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (['TEXTAREA', 'INPUT', 'SELECT', 'BUTTON'].includes(tag)) return;
  if (ui.screenStudio.classList.contains('hidden')) return;
  e.preventDefault();
  togglePlay();
});

// Đóng các modal
$$('.overlay [data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const ov = btn.closest('.overlay');
    if (ov === ui.exportModal && exporting) {
      toast('Đang quay video — vui lòng đợi hoàn tất.', 'warn');
      return;
    }
    ov.classList.add('hidden');
    if (ov === ui.recordModal) {
      stopRecTimer();
      if (rec.recorder && rec.recorder.state !== 'inactive') rec.recorder.stop();
    }
  });
});

// Hướng dẫn
$('#btnHelp').addEventListener('click', () => $('#helpModal').classList.remove('hidden'));

/* ═══════════ Khởi động ═══════════ */

function init() {
  updateServiceChip();

  // Kiểm tra dịch vụ AI online trong nền
  setTimeout(async () => {
    await Promise.all([checkTextService(), checkImageService()]);
    updateServiceChip();
  }, 1200);

  // Gợi ý khôi phục dự án
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.scenes && data.scenes.length) ui.restoreBanner.classList.remove('hidden');
    }
  } catch { /* noop */ }

  // Font tải xong thì vẽ lại cho đẹp
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (!ui.screenStudio.classList.contains('hidden')) renderFrame();
    });
  }

  // Mặc định chủ đề mẫu
  if (!ui.inputTopic.value) ui.inputTopic.value = '';
}

init();
