/* ╀────────────────────────────────────────────
   main.js — bộ điều phối ứng dụng VideoAI Studio
   ───────────────────────────────────────────── */

import { $, $$, clamp, toast, download, slugify, fmtTime, escapeHtml, sleep } from './util.js';
import { THEMES, detectTheme, loadImage, makeSceneCanvas, makeProceduralArt, LIBRARY_LIST } from './art.js';
import {
  service, generateScriptViaAI, generateWizardScriptViaAI, heuristicScript, heuristicWizardScript, generateShortFilmPlanViaAI, heuristicShortFilmPlan, generateImageForPrompt,
  synthesizeVoice, generatePromptKitViaAI, getLocalPromptKit,
  checkTextService, checkImageService, STYLE_SUFFIX, MOTION_PRESETS, VOICE_TONES, FILM_GENRES,
} from './ai.js';
import { getAudioContext, decodeToBuffer, BrowserTTS, scheduleMusic } from './audio.js';
import { isLocalVoice, synthesizeLocalVoice } from './local-tts.js';
import { Renderer, buildTimeline } from './renderer.js';
import { exportVideo, extForMime } from './exporter.js';
import { generateVeoVideo, veoModelLabel } from './veo.js';
import { generateAgnesVideo, generateAgnesCreativeVideo, agnesModelLabel } from './agnes.js';
import { getGeminiStatus, startGoogleGeminiLogin, logoutGoogleGemini, generateGeminiImage } from './gemini.js';

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
  creativeMode: 'storyboard',
  brief: '',
  filmGenre: 'drama',
  filmBible: null,
  imageMode: 'hybrid',
  motionStyle: 'slow-zoom',
  voiceTone: 'natural',
  voiceRate: '1',
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
let draftPlan = null;
let wizardPlan = null;
let agnesReturnScreen = 'create';
let agnesObjectUrl = null;

const CREATIVE_MODES = {
  storyboard: 'Tạo storyboard có hook, diễn biến và kết luận; mỗi cảnh có prompt ảnh và prompt camera.',
  presentation: 'Tạo video thuyết trình có tiêu đề, luận điểm rõ ràng và nhịp đọc chuyên nghiệp.',
  product: 'Tạo video giới thiệu sản phẩm theo mạch vấn đề → lợi ích → bằng chứng → kêu gọi hành động.',
  social: 'Tạo video dọc ngắn với hook mạnh, câu ngắn, hình ảnh bắt mắt và camera chuyển động rõ.',
  promptlab: 'Ưu tiên bộ prompt chi tiết, nhất quán nhân vật/bối cảnh và dễ đưa sang model ảnh/video khác.',
};

const OPEN_SOURCE_REFERENCES = [
  {
    name: 'Timeline Studio / ai-video-editor',
    url: 'https://github.com/MartinDelophy/ai-video-editor',
    tag: 'timeline + local-first',
    text: 'Tham khảo cách tổ chức timeline, track, captions và workflow local-first; bản này giữ canvas timeline zero-dependency.',
  },
  {
    name: 'OpenCut-AI',
    url: 'https://github.com/Ekaanth/OpenCut-AI',
    tag: 'AI editor + text workflow',
    text: 'Tham khảo scene editing, edit-by-text, template gallery và voice workflow; chưa vendored backend nặng vào repo này.',
  },
  {
    name: 'VideoSOS',
    url: 'https://github.com/timoncool/videosos',
    tag: 'image/video/voice models',
    text: 'Tham khảo mô hình media đa phương thức và image-to-video; VideoAI Studio dùng adapter Pollinations + fallback offline.',
  },
  {
    name: 'Automated Video Generator',
    url: 'https://github.com/itsPremkumar/Automated-Video-Generator',
    tag: 'agentic pipeline',
    text: 'Tham khảo pipeline topic → script → voice → visuals → render và ý tưởng prompt director.',
  },
  {
    name: 'VietTTS',
    url: 'https://github.com/dangvansam/viet-tts',
    tag: 'Vietnamese TTS · Apache source',
    text: 'Adapter local qua /api/tts cho giọng Việt; model/audio có điều khoản riêng, cần kiểm tra trước khi dùng thương mại.',
  },
  {
    name: 'Kokoro / kokoro-onnx',
    url: 'https://github.com/thewh1teagle/kokoro-onnx',
    tag: 'lightweight local TTS',
    text: 'Adapter local CPU/ONNX với nhiều giọng; mã adapter và model có license riêng, đọc kỹ trước khi phân phối.',
  },
  {
    name: 'Piper TTS',
    url: 'https://github.com/OHF-Voice/piper1-gpl',
    tag: 'CPU / edge TTS',
    text: 'Adapter endpoint local cho Piper; phù hợp máy yếu và chạy offline khi đã tải voice model.',
  },
  {
    name: 'Agnes Video Generator',
    url: 'https://github.com/lcy362/agnes-video-generator',
    tag: 'self-hosted video pipeline · MIT',
    text: 'Nguồn tạo video multi-scene có task API, narration, subtitles, keyframes và digital anchor; VideoAI Studio kết nối qua /api/agnes.',
  },
];

const canvas = $('#previewCanvas');
const renderer = new Renderer(canvas);
const browserTTS = new BrowserTTS();

/* ═══════════ Helper DOM ═══════════ */

const ui = {
  serviceChip: $('#serviceChip'),
  btnGeminiAuth: $('#btnGeminiAuth'),
  screenCreate: $('#screen-create'),
  screenStudio: $('#screen-studio'),
  screenAgnes: $('#screen-agnes'), btnAgnesTab: $('#btnAgnesTab'), btnAgnesBack: $('#btnAgnesBack'),
  agnesModeTabs: $('#agnesModeTabs'), agnesCreativeFields: $('#agnesCreativeFields'), agnesSimpleFields: $('#agnesSimpleFields'),
  agnesIdea: $('#agnesIdea'), agnesRequirements: $('#agnesRequirements'), agnesStyle: $('#agnesStyle'), agnesChaining: $('#agnesChaining'), agnesNarration: $('#agnesNarration'), agnesPrompt: $('#agnesPrompt'),
  btnAgnesGenerate: $('#btnAgnesGenerate'), agnesConfigStatus: $('#agnesConfigStatus'), agnesProgressPanel: $('#agnesProgressPanel'), agnesStatus: $('#agnesStatus'), agnesBar: $('#agnesBar'), agnesTaskBadge: $('#agnesTaskBadge'), agnesEmpty: $('#agnesEmpty'), agnesVideo: $('#agnesVideo'), btnAgnesDownload: $('#btnAgnesDownload'),
  inputTopic: $('#inputTopic'),
  labelTopic: $('#labelTopic'),
  inputBrief: $('#inputBrief'),
  inputImageMode: $('#inputImageMode'),
  inputFilmGenre: $('#inputFilmGenre'),
  inputMotionStyle: $('#inputMotionStyle'),
  inputVoiceTone: $('#inputVoiceTone'),
  inputVoiceRate: $('#inputVoiceRate'),
  btnGeneratePlan: $('#btnGeneratePlan'),
  planStatus: $('#planStatus'),
  planPreview: $('#planPreview'),
  modeDescription: $('#modeDescription'),
  wizardTitle: $('#wizardTitle'), wizardSceneCount: $('#wizardSceneCount'),
  btnWizardGenerate: $('#btnWizardGenerate'), wizardStatus: $('#wizardStatus'),
  wizardPreview: $('#wizardPreview'),
  inputSceneCount: $('#inputSceneCount'),
  sceneCountVal: $('#sceneCountVal'),
  inputStyle: $('#inputStyle'),
  inputVoice: $('#inputVoice'),
  inputTransition: $('#inputTransition'),
  inputTitleCard: $('#inputTitleCard'),
  inputEndCard: $('#inputEndCard'),
  inputMusic: $('#inputMusic'),
  inputWatermark: $('#inputWatermark'),
  btnCreate: $('#btnCreate'), btnCreateVeoLite: $('#btnCreateVeoLite'),
  sampleChips: $('#sampleChips'),
  restoreBanner: $('#restoreBanner'),
  sceneList: $('#sceneList'),
  sceneBadge: $('#sceneBadge'),
  filmBiblePanel: $('#filmBiblePanel'),
  projectTitle: $('#projectTitle'),
  studioVoice: $('#studioVoice'),
  studioVoiceTone: $('#studioVoiceTone'),
  studioMusic: $('#studioMusic'),
  sourcesModal: $('#sourcesModal'),
  sourceList: $('#sourceList'),
  timeDisplay: $('#timeDisplay'),
  timeline: $('#timeline'),
  timelineFill: $('#timelineFill'),
  timelineTicks: $('#timelineTicks'),
  btnPlay: $('#btnPlay'),
  btnBigPlay: $('#btnBigPlay'),
  btnExport: $('#btnExport'),
  btnVeo: $('#btnVeo'),
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
  // Google Veo modal
  veoModal: $('#veoModal'), videoProvider: $('#videoProvider'), veoApiKey: $('#veoApiKey'), veoModel: $('#veoModel'),
  veoApiKeyField: $('#veoApiKeyField'), veoApiHint: $('#veoApiHint'), agnesHint: $('#agnesHint'), veoModelField: $('#veoModelField'),
  veoAspect: $('#veoAspect'), veoDuration: $('#veoDuration'), veoResolution: $('#veoResolution'),
  veoPrompt: $('#veoPrompt'), veoNegative: $('#veoNegative'), veoReferenceBox: $('#veoReferenceBox'),
  btnVeoGenerate: $('#btnVeoGenerate'), veoProgress: $('#veoProgress'), veoStatus: $('#veoStatus'), veoBar: $('#veoBar'),
  veoResult: $('#veoResult'), veoVideo: $('#veoVideo'), btnVeoDownload: $('#btnVeoDownload'), veoResultHint: $('#veoResultHint'),
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
    text: '', imagePrompt: '', referencePrompt: '', motionPrompt: '',
    referenceImageRef: null, videoRef: null, videoEl: null,
    imageKind: 'proc', imageRef: null,
    seed: Math.floor(Math.random() * 1e9),
    theme: null, characterCodes: [], buffer: null, voiceKind: null,
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
        browserTTS.speak(it.scene.text, { rate: Number(state.voiceRate) || 1 });
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
    brief: ui.inputBrief.value.trim(),
    creativeMode: document.querySelector('#creativeModes .creative-mode.active')?.dataset.creativeMode || 'storyboard',
    imageMode: ui.inputImageMode.value,
    filmGenre: ui.inputFilmGenre.value,
    motionStyle: ui.inputMotionStyle.value,
    voiceTone: ui.inputVoiceTone.value,
    voiceRate: ui.inputVoiceRate.value,
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
    topic: o.topic, brief: o.brief, creativeMode: o.creativeMode,
    filmGenre: o.filmGenre, imageMode: o.imageMode, motionStyle: o.motionStyle,
    voiceTone: o.voiceTone, voiceRate: o.voiceRate,
    aspect: o.aspect, style: o.style, voice: o.voice,
    transition: o.transition, titleCard: o.titleCard, endCard: o.endCard,
    music: o.music, watermark: o.watermark,
  });
}

function planSignature(o) {
  return [o.mode, o.topic.trim(), o.sceneCount, o.style, o.creativeMode, o.filmGenre, o.motionStyle, o.brief.trim()].join('|');
}

function normalizePlan(parts, opts) {
  return (parts || []).slice(0, opts.sceneCount).map((p, i) => {
    const local = getLocalPromptKit(p.text || opts.topic, opts);
    const characterCodes = [...new Set((Array.isArray(p.characterCodes) ? p.characterCodes : String(p.characterCodes || '').split(/[,|]/))
      .map(code => String(code).trim().replace(/\bCHAR(?:ACTER)?\s*(\d+)/gi, 'CHART $1'))
      .filter(code => /CHART\s*\d+/i.test(code)))];
    const chartHint = characterCodes.length ? `Character continuity: ${characterCodes.join(', ')}.` : '';
    const imagePrompt = String(p.imagePrompt || p.promptEnglish || local.imagePrompt).trim();
    return {
      text: String(p.text || '').trim(),
      imagePrompt: [imagePrompt, chartHint].filter(Boolean).join(' ').trim(),
      referencePrompt: [String(p.referencePrompt || imagePrompt || local.imagePrompt).trim(), chartHint].filter(Boolean).join(' ').trim(),
      motionPrompt: [String(p.motionPrompt || local.motionPrompt).trim(), chartHint].filter(Boolean).join(' ').trim(),
      negativePrompt: String(p.negativePrompt || local.negativePrompt).trim(),
      characterCodes: characterCodes.length ? characterCodes : (p.characterCodes ? ['CHART 1'] : []),
      shotType: String(p.shotType || '').trim(),
      dialogue: String(p.dialogue || '').trim(),
    };
  }).filter(p => p.text);
}

async function getPlan(opts, { announce = true } = {}) {
  let parts = null;
  let filmBible = null;
  if (opts.creativeMode === 'shortfilm') {
    if (opts.mode === 'ai') {
      try {
        filmBible = await generateShortFilmPlanViaAI(opts.topic, {
          sceneCount: opts.sceneCount,
          style: opts.style,
          motionStyle: opts.motionStyle,
          brief: opts.brief,
          genre: opts.filmGenre,
        });
        parts = filmBible.scenes;
        service.text = true;
        updateServiceChip();
      } catch (e) {
        console.warn('AI short film failed:', e);
        service.text = false;
        updateServiceChip();
        if (announce) toast('⚠️ AI phim ngắn tạm thời offline — đã dùng đạo diễn local với film bible dự phòng.', 'warn', 6000);
      }
    }
    if (!filmBible) {
      filmBible = heuristicShortFilmPlan(opts.topic, {
        sceneCount: opts.sceneCount,
        style: opts.style,
        motionStyle: opts.motionStyle,
        brief: opts.brief,
        genre: opts.filmGenre,
      });
      parts = filmBible.scenes;
    }
  } else {
    if (opts.mode === 'ai') {
      try {
        parts = await generateScriptViaAI(opts.topic, {
          sceneCount: opts.sceneCount,
          style: opts.style,
          creativeMode: opts.creativeMode,
          motionStyle: opts.motionStyle,
          brief: opts.brief,
        });
        service.text = true;
        updateServiceChip();
      } catch (e) {
        console.warn('AI script failed:', e);
        service.text = false;
        updateServiceChip();
        if (announce) toast('⚠️ AI Director tạm thời offline — đã dựng đề cương local từ gợi ý của bạn.', 'warn', 5000);
      }
    }
    if (!parts) {
      parts = heuristicScript(opts.topic, {
        sceneCount: opts.sceneCount,
        style: opts.style,
        motionStyle: opts.motionStyle,
        creativeMode: opts.creativeMode,
      });
    }
  }
  return { parts: normalizePlan(parts, opts), filmBible };
}

function renderPlanPreview(parts, filmBible = null) {
  if (!parts?.length) {
    ui.planPreview.classList.add('hidden');
    ui.planPreview.innerHTML = '';
    return;
  }
  const bibleHtml = filmBible ? `<div class="film-bible">
    <div class="film-bible-title">🎞 ${escapeHtml(filmBible.title || 'Phim ngắn AI')}</div>
    <p>${escapeHtml(filmBible.logline || '')}</p>
    <small>🌍 ${escapeHtml(filmBible.worldPrompt || '')}</small>
    <small>👤 Nhân vật: ${(filmBible.characters || []).map(c => escapeHtml(c.name || '')).join(' · ') || 'đang tạo'}</small>
  </div>` : '';
  ui.planPreview.innerHTML = `<div class="plan-preview-head"><b>✅ ${filmBible ? 'Film bible + ' : ''}đề cương ${parts.length} cảnh đã sẵn sàng</b><span>Kiểm tra trước khi tạo video</span></div>` + bibleHtml +
    parts.map((p, i) => `<article class="plan-item">
      <div class="plan-num">${String(i + 1).padStart(2, '0')}</div>
      <div><b>${p.shotType ? `🎥 ${escapeHtml(p.shotType)} · ` : ''}${escapeHtml(p.text.slice(0, 140))}${p.text.length > 140 ? '…' : ''}</b>
      ${p.dialogue ? `<small>💬 ${escapeHtml(p.dialogue.slice(0, 120))}</small>` : ''}
      <small>🖼 ${escapeHtml(p.imagePrompt.slice(0, 150))}${p.imagePrompt.length > 150 ? '…' : ''}</small>
      <small>🎥 ${escapeHtml(p.motionPrompt.slice(0, 120))}${p.motionPrompt.length > 120 ? '…' : ''}</small></div>
    </article>`).join('');
  ui.planPreview.classList.remove('hidden');
}

function renderWizardPreview(parts, title) {
  if (!parts?.length) {
    ui.wizardPreview.classList.add('hidden');
    ui.wizardPreview.innerHTML = '';
    return;
  }
  ui.wizardPreview.innerHTML = `
    <div class="wizard-preview-head">
      <b>✅ ${escapeHtml(title)} · ${parts.length} cảnh đã tạo</b>
      <small>Kiểm tra prompt trước khi nạp vào hàng đợi</small>
    </div>
    <div class="wizard-preview-list">
      ${parts.map((part, index) => `<article class="wizard-scene">
        <span class="wizard-scene-number">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <b class="wizard-scene-title">${escapeHtml(part.text.slice(0, 180))}${part.text.length > 180 ? '…' : ''}</b>
          <small class="wizard-scene-prompt">${escapeHtml(part.imagePrompt.slice(0, 280))}${part.imagePrompt.length > 280 ? '…' : ''}</small>
          ${part.characterCodes?.length ? `<span class="wizard-character">👤 ${escapeHtml(part.characterCodes.join(' · '))}</span>` : ''}
        </div>
      </article>`).join('')}
    </div>
    <button id="btnWizardLoad" type="button" class="btn wizard-load">📥 Nạp Prompt vào hàng đợi sản xuất</button>
  `;
  ui.wizardPreview.classList.remove('hidden');
  ui.wizardPreview.querySelector('#btnWizardLoad').addEventListener('click', loadWizardPlan);
}

function loadWizardPlan() {
  if (!wizardPlan?.parts?.length) {
    toast('Hãy tạo kịch bản trong AI Script Wizard trước.', 'warn');
    return;
  }
  const title = wizardPlan.title;
  ui.inputTopic.value = title;
  ui.inputSceneCount.value = String(wizardPlan.parts.length);
  ui.sceneCountVal.textContent = String(wizardPlan.parts.length);
  mode = 'ai';
  $$('#modeTabs .tab').forEach(tab => tab.classList.toggle('active', tab.dataset.mode === 'ai'));
  const opts = { ...collectCreateOpts(), topic: title, mode: 'ai', sceneCount: wizardPlan.parts.length };
  draftPlan = { signature: planSignature(opts), parts: wizardPlan.parts, filmBible: null };
  renderPlanPreview(wizardPlan.parts);
  ui.planStatus.textContent = '✅ Prompt Wizard đã nạp — bấm Tạo video để đưa vào Studio.';
  ui.inputTopic.focus();
  toast('📥 Đã nạp kịch bản và prompt tiếng Anh vào hàng đợi sản xuất.', 'ok', 4500);
}

function deriveTitle(topic, parts) {
  if (parts && parts.length && parts[0].text) {
    const first = parts[0].text.split(/(?<=[.!?…])\s+/)[0].trim();
    if (first && first.length <= 70) return first.replace(/[.]$/, '');
  }
  const t = (topic || 'Video của tôi').trim();
  return t.length > 70 ? t.slice(0, 67) + '…' : t;
}

async function generateConfiguredImage(prompt, seed, w, h) {
  if (state.imageMode === 'gemini') {
    return generateGeminiImage(prompt, { aspectRatio: state.aspect, imageSize: '1K' });
  }
  return generateImageForPrompt(prompt, seed, w, h);
}

async function createFlow({ openVeoLite = false } = {}) {
  const opts = collectCreateOpts();
  if (!opts.topic.trim()) {
    toast('Vui lòng nhập <b>chủ đề</b> hoặc dán <b>kịch bản</b> trước nhé!', 'warn');
    ui.inputTopic.focus();
    return;
  }
  applyOptsToState(opts);
  const n = opts.sceneCount;

  busy('✍️ Đang viết kịch bản…', 'AI Director đang dựng storyboard và bộ prompt cho từng cảnh…', 0.06);

  const sig = planSignature(opts);
  let plan = draftPlan && draftPlan.signature === sig ? draftPlan : null;
  if (!plan) plan = await getPlan(opts);
  const parts = normalizePlan(plan.parts, opts);
  state.filmBible = plan.filmBible || null;
  draftPlan = null;
  ui.planPreview.classList.add('hidden');
  ui.planStatus.textContent = 'Đề cương sẽ được tạo lại khi bạn đổi gợi ý.';

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
      referencePrompt: p.referencePrompt || p.imagePrompt || '',
      motionPrompt: p.motionPrompt || '',
      characterCodes: p.characterCodes || [],
      negativePrompt: p.negativePrompt || '',
      shotType: p.shotType || '',
      dialogue: p.dialogue || '',
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
        const ab = isLocalVoice(state.voice)
          ? await synthesizeLocalVoice(sc.text, state.voice, { rate: state.voiceRate })
          : await synthesizeVoice(sc.text, state.voice, {
            tone: state.voiceTone,
            rate: state.voiceRate,
          });
        sc.buffer = await decodeToBuffer(ab);
        sc.voiceKind = isLocalVoice(state.voice) ? 'local' : 'ai';
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
  let useAIImage = state.imageMode === 'gemini' || (state.imageMode !== 'offline' && service.image !== false);
  for (let i = 0; i < state.scenes.length; i++) {
    const sc = state.scenes[i];
    setBusy('🖼 Đang dựng hình…', `Hình nền cảnh ${i + 1}/${state.scenes.length}…`, 0.55 + 0.44 * (i / state.scenes.length));
    let done = false;
    if (useAIImage && sc.type === 'body' && sc.imagePrompt) {
      try {
        const { img, url } = await generateConfiguredImage(sc.imagePrompt, sc.seed, w, h);
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
  toast(
    openVeoLite
      ? '🎬 Kịch bản đã sẵn sàng — đang mở Veo 3.1 Lite để tạo clip cảnh đầu tiên.'
      : '✨ Video đã sẵn sàng! Nhấn <b>▶</b> để xem trước, chỉnh cảnh ở bảng bên trái.',
    'ok', 6000,
  );
  if (openVeoLite) {
    const firstBody = state.scenes.find(s => s.type === 'body');
    if (firstBody) setTimeout(() => openVeoModal(firstBody, { model: 'veo-3.1-lite-generate-preview' }), 120);
  }
}

/* ═══════════ Studio ═══════════ */

function renderFilmBible() {
  const bible = state.filmBible;
  if (!bible || state.creativeMode !== 'shortfilm') {
    ui.filmBiblePanel.classList.add('hidden');
    ui.filmBiblePanel.innerHTML = '';
    return;
  }
  ui.filmBiblePanel.innerHTML = `<b>🎞 ${escapeHtml(bible.title || 'Phim ngắn AI')}</b>
    <p>${escapeHtml(bible.logline || '')}</p>
    <small>👤 ${(bible.characters || []).map(c => escapeHtml(c.name || '')).join(' · ') || 'Nhân vật đang được phát triển'}</small>`;
  ui.filmBiblePanel.classList.remove('hidden');
}

function enterStudio() {
  ui.screenCreate.classList.add('hidden');
  ui.screenStudio.classList.remove('hidden');
  ui.projectTitle.value = state.title;
  syncVoiceUI();
  ui.studioVoiceTone.value = state.voiceTone || 'natural';
  ui.studioMusic.checked = state.music;
  const { w, h } = RES[state.aspect];
  canvas.width = w; canvas.height = h;
  playhead = 0; playing = false;
  updatePlayUI();
  renderFilmBible();
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
  if (ui.studioVoiceTone) ui.studioVoiceTone.value = state.voiceTone || 'natural';
  if (ui.inputVoiceTone) ui.inputVoiceTone.value = state.voiceTone || 'natural';
  if (ui.inputVoiceRate) ui.inputVoiceRate.value = String(state.voiceRate || '1');
  if (ui.inputMotionStyle) ui.inputMotionStyle.value = state.motionStyle || 'slow-zoom';
  if (ui.inputImageMode) ui.inputImageMode.value = state.imageMode || 'hybrid';
  if (ui.inputFilmGenre) ui.inputFilmGenre.value = state.filmGenre || 'drama';
}

function kindLabel(sc) {
  return { ai: '🖼 AI', library: '📚 Thư viện', upload: '⬆ Ảnh riêng', proc: '🎨 Trừu tượng' }[sc.imageKind] || '';
}

function videoBadge(sc) {
  return sc.videoRef ? '<span class="m video">🎬 Veo</span>' : '';
}

function voiceBadge(sc) {
  if (sc.voiceKind === 'local') return '<span class="m voice">🔊 Local TTS</span>';
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
          ${videoBadge(sc)}
          <span class="m">${kindLabel(sc)}</span>
        </div>
        ${state.creativeMode === 'shortfilm' && sc.type === 'body' ? `<div class="film-shot"><b>🎞 ${escapeHtml(sc.shotType || 'cinematic shot')}</b>${sc.dialogue ? `<span>💬 ${escapeHtml(sc.dialogue)}</span>` : ''}</div>` : ''}
        ${sc.type === 'body' ? `
        <details class="prompt-details">
          <summary>🧠 Prompt Lab <span>ảnh + chuyển động</span></summary>
          <div class="prompt-fields">
            <label>Prompt hình ảnh
              <textarea class="scene-prompt" data-kind="image" rows="3" placeholder="Prompt tiếng Anh để tạo ảnh…">${escapeHtml(sc.imagePrompt || '')}</textarea>
            </label>
            <label>Prompt ảnh tham chiếu
              <textarea class="scene-prompt" data-kind="reference" rows="2" placeholder="Prompt để tạo keyframe/reference image…">${escapeHtml(sc.referencePrompt || sc.imagePrompt || '')}</textarea>
            </label>
            ${sc.referenceImageRef ? `<div class="reference-inline"><img src="${escapeHtml(sc.referenceImageRef)}" alt="Ảnh tham chiếu"><span>🪄 Ảnh tham chiếu sẵn sàng cho Veo</span></div>` : ''}
            <label>Prompt chuyển động
              <textarea class="scene-prompt" data-kind="motion" rows="2" placeholder="Camera, hướng đi, tốc độ…">${escapeHtml(sc.motionPrompt || '')}</textarea>
            </label>
            ${state.creativeMode === 'shortfilm' ? `<label>Thoại nhân vật
              <textarea class="scene-prompt" data-kind="dialogue" rows="2" placeholder="Một câu thoại ngắn…">${escapeHtml(sc.dialogue || '')}</textarea>
            </label>` : ''}
            <button class="tool prompt-generate" data-act="promptKit">✨ Tạo lại prompt ảnh + chuyển động</button>
          </div>
        </details>
        <div class="scene-tools">
          <button class="tool" data-act="aiImage" title="Tạo ảnh AI riêng cho cảnh này">🖼 AI</button>
          <button class="tool" data-act="referenceImage" title="Tạo ảnh tham chiếu bằng prompt">🪄 Ref</button>
          <button class="tool" data-act="veo" title="Tạo video clip bằng Google Veo">🎬 Veo</button>
          <button class="tool" data-act="libImage" title="Chọn ảnh từ thư viện">📚</button>
          <button class="tool" data-act="upload" title="Tải ảnh của bạn lên">⬆️</button>
          <button class="tool" data-act="procImage" title="Sinh ảnh trừu tượng mới">🎨</button>
          <button class="tool" data-act="aiVoice" title="Tạo giọng đọc AI chân thật lại cho cảnh này">🔊</button>
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
    meta.innerHTML = `<span class="m">⏱ ${sceneDurLabel(sc)}s</span> ${voiceBadge(sc)} ${videoBadge(sc)} <span class="m">${kindLabel(sc)}</span>`;
  }
  const imagePrompt = card.querySelector('.scene-prompt[data-kind="image"]');
  const referencePrompt = card.querySelector('.scene-prompt[data-kind="reference"]');
  const motionPrompt = card.querySelector('.scene-prompt[data-kind="motion"]');
  if (imagePrompt && document.activeElement !== imagePrompt) imagePrompt.value = sc.imagePrompt || '';
  if (referencePrompt && document.activeElement !== referencePrompt) referencePrompt.value = sc.referencePrompt || sc.imagePrompt || '';
  if (motionPrompt && document.activeElement !== motionPrompt) motionPrompt.value = sc.motionPrompt || '';
  updateThumb(sc);
}

/* ── Hành động trên từng cảnh ── */

async function handleSceneAction(sc, act) {
  const idx = state.scenes.indexOf(sc);
  switch (act) {
    case 'referenceImage': {
      busy('🪄 Tạo ảnh tham chiếu…', 'Đang tạo keyframe từ prompt để dùng cho Google Veo.', 0.45);
      try {
        const kit = sc.referencePrompt || sc.imagePrompt
          ? { imagePrompt: sc.referencePrompt || sc.imagePrompt }
          : getLocalPromptKit(sc.text, { style: state.style, motionStyle: state.motionStyle, creativeMode: state.creativeMode });
        const { url } = await generateConfiguredImage(kit.imagePrompt, sc.seed, RES[state.aspect].w, RES[state.aspect].h);
        sc.referencePrompt = kit.imagePrompt;
        sc.referenceImageRef = url;
        service.image = true;
        updateServiceChip();
        hideBusy();
        renderSceneList();
        toast('🪄 Đã tạo ảnh tham chiếu. Mở 🎬 Veo để animate cảnh này.', 'ok', 4000);
        saveSoon();
      } catch (e) {
        hideBusy();
        toast('Không tạo được ảnh tham chiếu — kiểm tra dịch vụ ảnh hoặc dùng prompt khác.', 'err', 6000);
      }
      break;
    }
    case 'veo':
      openVeoModal(sc);
      break;
    case 'promptKit': {
      busy('🧠 Prompt Lab…', 'Đang tối ưu prompt hình ảnh và chuyển động cho cảnh này.', 0.35);
      try {
        let kit;
        try {
          kit = await generatePromptKitViaAI(sc.text, {
            style: state.style,
            motionStyle: state.motionStyle,
            creativeMode: state.creativeMode,
          });
          service.text = true;
        } catch (e) {
          kit = e.fallback || getLocalPromptKit(sc.text, {
            style: state.style,
            motionStyle: state.motionStyle,
            creativeMode: state.creativeMode,
          });
        }
        sc.imagePrompt = kit.imagePrompt;
        sc.motionPrompt = kit.motionPrompt;
        sc.negativePrompt = kit.negativePrompt;
        hideBusy();
        refreshSceneCard(sc);
        saveSoon();
        toast('🧠 Đã cập nhật prompt ảnh + prompt chuyển động cho cảnh.', 'ok', 3000);
      } catch (e) {
        hideBusy();
        toast('Không tạo được prompt — hãy thử lại hoặc chỉnh prompt thủ công.', 'err');
      }
      break;
    }
    case 'aiImage': {
      busy('🖼 Tạo ảnh AI…', 'Đang tạo hình nền mới cho cảnh…', 0.4);
      try {
        sc.seed = Math.floor(Math.random() * 1e9);
        if (!sc.imagePrompt) {
          const kit = getLocalPromptKit(sc.text, {
            style: state.style,
            motionStyle: state.motionStyle,
            creativeMode: state.creativeMode,
          });
          sc.theme = sc.theme || detectTheme(sc.text, idx);
          sc.imagePrompt = kit.imagePrompt;
          sc.motionPrompt = sc.motionPrompt || kit.motionPrompt;
        }
        const { w, h } = RES[state.aspect];
        const { img, url } = await generateConfiguredImage(sc.imagePrompt, sc.seed, w, h);
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
        const ab = isLocalVoice(state.voice)
          ? await synthesizeLocalVoice(sc.text, state.voice, { rate: state.voiceRate })
          : await synthesizeVoice(
            sc.text,
            state.voice === 'browser' || state.voice === 'none' ? 'alloy' : state.voice,
            { tone: state.voiceTone, rate: state.voiceRate },
          );
        sc.buffer = await decodeToBuffer(ab);
        sc.voiceKind = isLocalVoice(state.voice) ? 'local' : 'ai';
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

/* ═══════════ Agnes Video Generator tab ═══════════ */

function openAgnesTab() {
  agnesReturnScreen = ui.screenStudio.classList.contains('hidden') ? 'create' : 'studio';
  ui.screenCreate.classList.add('hidden');
  ui.screenStudio.classList.add('hidden');
  ui.screenAgnes.classList.remove('hidden');
}

function closeAgnesTab() {
  ui.screenAgnes.classList.add('hidden');
  if (agnesReturnScreen === 'studio' && state.scenes.length) ui.screenStudio.classList.remove('hidden');
  else ui.screenCreate.classList.remove('hidden');
}

function syncAgnesModeUI() {
  const creative = ui.agnesModeTabs.querySelector('.active')?.dataset.agnesMode !== 'simple';
  ui.agnesCreativeFields.classList.toggle('hidden', !creative);
  ui.agnesSimpleFields.classList.toggle('hidden', creative);
  ui.btnAgnesGenerate.textContent = creative ? '🎬 Tạo video Agnes multi-scene' : '🎬 Tạo clip Agnes';
}

ui.btnAgnesTab.addEventListener('click', openAgnesTab);
ui.btnAgnesBack.addEventListener('click', closeAgnesTab);
ui.agnesModeTabs.querySelectorAll('button').forEach(button => {
  button.addEventListener('click', () => {
    ui.agnesModeTabs.querySelectorAll('button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    syncAgnesModeUI();
  });
});

ui.btnAgnesGenerate.addEventListener('click', async () => {
  const creative = ui.agnesModeTabs.querySelector('.active')?.dataset.agnesMode !== 'simple';
  const idea = creative ? ui.agnesIdea.value.trim() : ui.agnesPrompt.value.trim();
  if (!idea) {
    toast(`Hãy nhập ${creative ? 'ý tưởng' : 'prompt'} cho Agnes.`, 'warn');
    (creative ? ui.agnesIdea : ui.agnesPrompt).focus();
    return;
  }
  ui.btnAgnesGenerate.disabled = true;
  ui.agnesProgressPanel.classList.remove('hidden');
  ui.agnesEmpty.classList.add('hidden');
  ui.agnesVideo.classList.add('hidden');
  ui.btnAgnesDownload.classList.add('hidden');
  ui.agnesTaskBadge.textContent = 'Đang chạy';
  try {
    const result = creative
      ? await generateAgnesCreativeVideo({
        idea,
        requirements: ui.agnesRequirements.value.trim(),
        visualStyle: ui.agnesStyle.value,
        chainingMode: ui.agnesChaining.value,
        narration: ui.agnesNarration.checked,
        onProgress: (p, text) => { ui.agnesBar.style.width = `${Math.round(p * 100)}%`; ui.agnesStatus.textContent = text; },
      })
      : await generateAgnesVideo({
        prompt: idea,
        durationSeconds: '5',
        resolution: state.aspect === '9:16' ? '768x1152' : state.aspect === '1:1' ? '1024x1024' : '1152x768',
        onProgress: (p, text) => { ui.agnesBar.style.width = `${Math.round(p * 100)}%`; ui.agnesStatus.textContent = text; },
      });
    if (agnesObjectUrl) URL.revokeObjectURL(agnesObjectUrl);
    agnesObjectUrl = URL.createObjectURL(result.blob);
    ui.agnesVideo.src = agnesObjectUrl;
    ui.agnesVideo.classList.remove('hidden');
    ui.btnAgnesDownload.classList.remove('hidden');
    ui.btnAgnesDownload.onclick = () => {
      const link = document.createElement('a');
      link.href = agnesObjectUrl;
      link.download = `${slugify(idea.slice(0, 60) || 'agnes-video')}.mp4`;
      link.click();
    };
    ui.agnesTaskBadge.textContent = `Hoàn tất · ${result.taskId}`;
    ui.agnesStatus.textContent = 'Video Agnes đã sẵn sàng.';
    toast('🎬 Agnes đã tạo xong video.', 'ok', 5000);
  } catch (error) {
    ui.agnesTaskBadge.textContent = 'Lỗi';
    ui.agnesStatus.textContent = error.message || 'Agnes tạo video thất bại.';
    toast(`Agnes lỗi: ${escapeHtml(error.message || 'kiểm tra AGNES_URL và service')}`, 'err', 8000);
  } finally {
    ui.btnAgnesGenerate.disabled = false;
  }
});

syncAgnesModeUI();

/* ═══════════ Google Veo ═══════════ */

let veoTargetScene = null;
let veoObjectUrl = null;

function currentBodyScene() {
  const direct = selectedSceneId && state.scenes.find(s => s.id === selectedSceneId);
  if (direct?.type === 'body') return direct;
  const active = itemAt(playhead)?.scene;
  return active?.type === 'body' ? active : state.scenes.find(s => s.type === 'body') || null;
}

function syncVideoProviderUI() {
  const isAgnes = ui.videoProvider.value === 'agnes';
  ui.veoApiKeyField.classList.toggle('hidden', isAgnes);
  ui.veoApiHint.classList.toggle('hidden', isAgnes);
  ui.agnesHint.classList.toggle('hidden', !isAgnes);
  ui.veoModelField.classList.toggle('hidden', isAgnes);
  ui.btnVeoGenerate.textContent = isAgnes ? '🎬 Bắt đầu tạo video Agnes' : '🎬 Bắt đầu tạo video Veo';
}

function openVeoModal(sc, { model = 'veo-3.1-generate-preview' } = {}) {
  if (!sc) {
    toast('Hãy chọn một cảnh nội dung trước khi tạo video.', 'warn');
    return;
  }
  veoTargetScene = sc;
  ui.videoProvider.value = 'veo';
  const savedKey = sessionStorage.getItem('videoai-veo-key') || '';
  ui.veoApiKey.value = savedKey;
  ui.veoModel.value = model;
  syncVideoProviderUI();
  ui.veoAspect.value = state.aspect === '9:16' ? '9:16' : '16:9';
  ui.veoDuration.value = '8';
  ui.veoResolution.value = '720p';
  ui.veoPrompt.value = [sc.motionPrompt, sc.text, sc.dialogue ? `Dialogue: ${sc.dialogue}` : ''].filter(Boolean).join('. ');
  ui.veoNegative.value = sc.negativePrompt || 'shaky camera, blur, text, logo, watermark';
  if (sc.referenceImageRef) {
    ui.veoReferenceBox.innerHTML = `<img src="${escapeHtml(sc.referenceImageRef)}" alt="Ảnh tham chiếu"><span>🪄 Ảnh tham chiếu của cảnh này sẽ làm frame đầu cho Veo.</span>`;
    ui.veoReferenceBox.classList.remove('hidden');
  } else {
    ui.veoReferenceBox.innerHTML = '<span>Chưa có ảnh tham chiếu. Hãy đóng modal và bấm 🪄 Ref trong cảnh để tạo một ảnh trước.</span>';
    ui.veoReferenceBox.classList.remove('hidden');
  }
  ui.veoProgress.classList.add('hidden');
  ui.veoResult.classList.add('hidden');
  ui.veoBar.style.width = '0%';
  ui.btnVeoGenerate.disabled = false;
  ui.veoModal.classList.remove('hidden');
}

ui.videoProvider.addEventListener('change', syncVideoProviderUI);
ui.veoApiKey.addEventListener('input', () => {
  sessionStorage.setItem('videoai-veo-key', ui.veoApiKey.value.trim());
});

ui.btnVeoGenerate.addEventListener('click', async () => {
  if (!veoTargetScene) return;
  const isAgnes = ui.videoProvider.value === 'agnes';
  const apiKey = ui.veoApiKey.value.trim();
  if (!isAgnes && !apiKey) {
    toast('Hãy nhập Gemini API key để gọi Google Veo.', 'warn');
    ui.veoApiKey.focus();
    return;
  }
  ui.btnVeoGenerate.disabled = true;
  ui.veoProgress.classList.remove('hidden');
  ui.veoResult.classList.add('hidden');
  try {
    let result;
    if (isAgnes) {
      const agnesResolution = state.aspect === '9:16' ? '768x1152' : state.aspect === '1:1' ? '1024x1024' : '1152x768';
      result = await generateAgnesVideo({
        prompt: ui.veoPrompt.value,
        durationSeconds: ui.veoDuration.value,
        resolution: agnesResolution,
        onProgress: (p, text) => {
          ui.veoBar.style.width = `${Math.round(p * 100)}%`;
          ui.veoStatus.textContent = text;
        },
      });
    } else {
      result = await generateVeoVideo({
        apiKey,
        model: ui.veoModel.value,
        prompt: ui.veoPrompt.value,
        negativePrompt: ui.veoNegative.value,
        imageUrl: veoTargetScene.referenceImageRef || null,
        aspectRatio: ui.veoAspect.value,
        durationSeconds: ui.veoDuration.value,
        resolution: ui.veoResolution.value,
        onProgress: (p, text) => {
          ui.veoBar.style.width = `${Math.round(p * 100)}%`;
          ui.veoStatus.textContent = text;
        },
      });
    }
    if (veoObjectUrl) URL.revokeObjectURL(veoObjectUrl);
    veoObjectUrl = URL.createObjectURL(result.blob);
    const video = document.createElement('video');
    video.src = veoObjectUrl;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error(`Không đọc được clip ${isAgnes ? 'Agnes' : 'Veo'} vừa tạo.`));
      setTimeout(() => resolve(), 12000);
    });
    veoTargetScene.videoRef = veoObjectUrl;
    veoTargetScene.videoEl = video;
    veoTargetScene.videoModel = result.model;
    ui.veoVideo.src = veoObjectUrl;
    ui.veoResultHint.textContent = `${isAgnes ? agnesModelLabel() : veoModelLabel(result.model)} · clip đã gắn vào cảnh hiện tại. Khi xuất video, renderer sẽ dùng clip này thay cho ảnh tĩnh.`;
    ui.veoProgress.classList.add('hidden');
    ui.veoResult.classList.remove('hidden');
    rebuild();
    renderSceneList();
    toast(`🎬 ${isAgnes ? 'Agnes AI' : 'Google Veo'} đã tạo xong clip và gắn vào cảnh.`, 'ok', 5000);
  } catch (error) {
    ui.veoProgress.classList.add('hidden');
    ui.veoStatus.textContent = error.message || `${isAgnes ? 'Agnes' : 'Veo'} tạo video thất bại.`;
    toast(`${isAgnes ? 'Agnes' : 'Google Veo'} lỗi: ${escapeHtml(error.message || 'kiểm tra cấu hình và quota')}`, 'err', 8000);
  } finally {
    ui.btnVeoGenerate.disabled = false;
  }
});

ui.btnVeoDownload.addEventListener('click', () => {
  if (!veoObjectUrl) return;
  const a = document.createElement('a');
  a.href = veoObjectUrl;
  a.download = `${slugify(veoTargetScene?.text || 'veo-clip')}.mp4`;
  a.click();
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

ui.btnVeo.addEventListener('click', () => openVeoModal(currentBodyScene()));

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
      title: state.title, topic: state.topic, brief: state.brief, aspect: state.aspect, style: state.style,
      creativeMode: state.creativeMode, filmGenre: state.filmGenre, imageMode: state.imageMode, motionStyle: state.motionStyle,
      voiceTone: state.voiceTone, voiceRate: state.voiceRate,
      filmBible: state.filmBible,
      transition: state.transition, voice: state.voice, music: state.music,
      musicVol: state.musicVol, watermark: state.watermark,
      titleCard: state.titleCard, endCard: state.endCard,
      scenes: state.scenes.map(sc => ({
        type: sc.type, text: sc.text, seed: sc.seed, theme: sc.theme,
        imagePrompt: sc.imagePrompt, referencePrompt: sc.referencePrompt, motionPrompt: sc.motionPrompt,
        characterCodes: sc.characterCodes || [],
        referenceImageRef: sc.referenceImageRef || null,
        negativePrompt: sc.negativePrompt, shotType: sc.shotType, dialogue: sc.dialogue,
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
  state.brief = data.brief || '';
  state.aspect = RES[data.aspect] ? data.aspect : '16:9';
  state.style = data.style || 'cinematic';
  state.creativeMode = data.creativeMode || 'storyboard';
  state.filmGenre = data.filmGenre || 'drama';
  state.filmBible = data.filmBible || null;
  state.imageMode = data.imageMode || 'hybrid';
  state.motionStyle = data.motionStyle || 'slow-zoom';
  state.voiceTone = data.voiceTone || 'natural';
  state.voiceRate = String(data.voiceRate || '1');
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
      imagePrompt: sc.imagePrompt || '',
      referencePrompt: sc.referencePrompt || sc.imagePrompt || '',
      referenceImageRef: sc.referenceImageRef || null,
      motionPrompt: sc.motionPrompt || '',
      characterCodes: sc.characterCodes || [],
      negativePrompt: sc.negativePrompt || '',
      shotType: sc.shotType || '',
      dialogue: sc.dialogue || '',
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
      ui.labelTopic.textContent = 'Mô tả video / chủ đề';
      ui.inputTopic.placeholder = 'Ví dụ: Trí tuệ nhân tạo và tương lai của nhân loại\n\nMẹo: càng mô tả rõ bạn muốn nói về điều gì, kịch bản càng chuẩn.';
    } else {
      ui.labelTopic.textContent = 'Kịch bản của bạn (AI sẽ chia thành các cảnh)';
      ui.inputTopic.placeholder = 'Dán toàn bộ kịch bản/lời bình vào đây, mỗi câu cách nhau bằng dấu chấm…';
    }
  });
});

// AI Director modes
$$('#creativeModes .creative-mode').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('#creativeModes .creative-mode').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    ui.modeDescription.textContent = CREATIVE_MODES[btn.dataset.creativeMode] || CREATIVE_MODES.storyboard;
    if (btn.dataset.creativeMode === 'shortfilm') {
      ui.inputSceneCount.value = '6';
      ui.sceneCountVal.textContent = '6';
      ui.inputStyle.value = 'cinematic';
      ui.inputVoiceTone.value = 'documentary';
      ui.inputMotionStyle.value = 'slow-zoom';
      ui.inputFilmGenre.value = ui.inputFilmGenre.value || 'drama';
      toast('🎞 Mode Phim ngắn AI: AI sẽ tạo film bible, nhân vật, 3 hồi và shot list.', 'info', 4500);
    }
    draftPlan = null;
    ui.planStatus.textContent = 'Đã đổi mode — hãy tạo lại đề cương để cập nhật prompt.';
    ui.planPreview.classList.add('hidden');
  });
});

const TEMPLATES = {
  product: { mode: 'product', topic: 'Giới thiệu một sản phẩm mới và vì sao khách hàng nên thử ngay hôm nay', brief: 'Nêu vấn đề, lợi ích nổi bật, bằng chứng và CTA rõ ràng.', style: 'photo', motion: 'push-in' },
  lesson: { mode: 'presentation', topic: 'Một bài học 60 giây giải thích một khái niệm khó bằng ví dụ đời thường', brief: 'Dành cho người mới; mỗi cảnh có một ý chính và ví dụ dễ nhớ.', style: 'minimal', motion: 'slow-zoom' },
  travel: { mode: 'storyboard', topic: 'Một hành trình khám phá điểm đến đẹp ở Việt Nam trong ba ngày', brief: 'Không khí truyền cảm hứng, màu sắc điện ảnh, có nhịp mở đầu và kết thúc.', style: 'cinematic', motion: 'pan-right' },
  report: { mode: 'presentation', topic: 'Báo cáo tuần: kết quả, điểm sáng, rủi ro và kế hoạch tuần tới', brief: 'Giọng chuyên nghiệp, rõ số liệu, phù hợp trình bày nội bộ.', style: 'render3d', motion: 'static' },
  shortfilm: { mode: 'shortfilm', topic: 'Một người trẻ nhận được tín hiệu bí ẩn và phải lựa chọn giữa an toàn và sự thật', brief: 'Kể theo 3 hồi, nhân vật nhất quán, kết thúc có dư âm và không dùng chữ trên hình.', style: 'cinematic', motion: 'slow-zoom', genre: 'scifi' },
};

$$('.template-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = TEMPLATES[btn.dataset.template];
    if (!preset) return;
    ui.inputTopic.value = preset.topic;
    ui.inputBrief.value = preset.brief;
    ui.inputStyle.value = preset.style;
    ui.inputMotionStyle.value = preset.motion;
    if (preset.genre) ui.inputFilmGenre.value = preset.genre;
    if (preset.mode === 'shortfilm') {
      ui.inputSceneCount.value = '6';
      ui.sceneCountVal.textContent = '6';
      ui.inputVoiceTone.value = 'documentary';
    }
    $$('#creativeModes .creative-mode').forEach(x => x.classList.toggle('active', x.dataset.creativeMode === preset.mode));
    ui.modeDescription.textContent = CREATIVE_MODES[preset.mode];
    draftPlan = null;
    ui.planPreview.classList.add('hidden');
    ui.planStatus.textContent = 'Template đã nạp — bấm Viết kịch bản & tạo prompt.';
    ui.inputTopic.focus();
  });
});

ui.inputTopic.addEventListener('input', () => {
  draftPlan = null;
  ui.planStatus.textContent = 'Gợi ý đã thay đổi — đề cương cũ sẽ không được dùng.';
  ui.planPreview.classList.add('hidden');
});

ui.wizardTitle.addEventListener('input', () => {
  wizardPlan = null;
  ui.wizardPreview.classList.add('hidden');
  ui.wizardStatus.className = 'wizard-status';
  ui.wizardStatus.textContent = 'Bước 1 · Nhập tiêu đề rồi tạo kịch bản';
});

ui.btnWizardGenerate.addEventListener('click', async () => {
  const title = ui.wizardTitle.value.trim();
  const sceneCount = parseInt(ui.wizardSceneCount.value, 10) || 8;
  if (!title) {
    ui.wizardStatus.className = 'wizard-status error';
    ui.wizardStatus.textContent = 'Hãy nhập tiêu đề câu chuyện trước.';
    toast('Hãy nhập tiêu đề cho AI Script Wizard.', 'warn');
    ui.wizardTitle.focus();
    return;
  }
  const baseOpts = collectCreateOpts();
  const wizardOpts = { ...baseOpts, mode: 'ai', topic: title, sceneCount };
  ui.btnWizardGenerate.disabled = true;
  ui.wizardStatus.className = 'wizard-status';
  ui.wizardStatus.textContent = `⏳ Đang viết ${sceneCount} cảnh và tạo prompt tiếng Anh…`;
  try {
    let parts;
    try {
      parts = await generateWizardScriptViaAI(title, { sceneCount, style: baseOpts.style });
      service.text = true;
      updateServiceChip();
    } catch (error) {
      console.warn('AI Script Wizard failed:', error);
      service.text = false;
      updateServiceChip();
      parts = heuristicWizardScript(title, { sceneCount, style: baseOpts.style });
      ui.wizardStatus.textContent = '⚡ AI tạm thời offline — đã dùng Script Wizard local.';
    }
    wizardPlan = {
      title,
      parts: normalizePlan(parts, wizardOpts),
      signature: planSignature(wizardOpts),
      opts: wizardOpts,
    };
    renderWizardPreview(wizardPlan.parts, title);
    ui.wizardStatus.className = 'wizard-status ok';
    ui.wizardStatus.textContent = `✅ Đã tạo ${wizardPlan.parts.length} cảnh · Bước 2: bấm Nạp Prompt.`;
    toast('✨ AI Script Wizard đã tạo kịch bản và prompt tiếng Anh cho từng cảnh.', 'ok', 5000);
  } catch (error) {
    console.error(error);
    ui.wizardStatus.className = 'wizard-status error';
    ui.wizardStatus.textContent = 'Không tạo được kịch bản. Hãy thử lại.';
    toast('AI Script Wizard chưa tạo được kịch bản.', 'err');
  } finally {
    ui.btnWizardGenerate.disabled = false;
  }
});

ui.btnGeneratePlan.addEventListener('click', async () => {
  const opts = collectCreateOpts();
  if (!opts.topic.trim()) {
    toast('Hãy nhập <b>gợi ý/chủ đề</b> trước khi chạy AI Director.', 'warn');
    ui.inputTopic.focus();
    return;
  }
  ui.btnGeneratePlan.disabled = true;
  ui.planStatus.textContent = '⏳ AI đang viết kịch bản và thiết kế prompt…';
  try {
    const plan = await getPlan(opts);
    draftPlan = { signature: planSignature(opts), parts: plan.parts, filmBible: plan.filmBible };
    renderPlanPreview(plan.parts, plan.filmBible);
    ui.planStatus.textContent = '✅ Đề cương đã sẵn sàng — bấm Tạo video để dựng các cảnh.';
    toast('✨ AI Director đã tạo xong storyboard + prompt ảnh + prompt chuyển động.', 'ok', 4500);
  } catch (e) {
    console.error(e);
    ui.planStatus.textContent = 'Không tạo được đề cương. Bạn vẫn có thể tạo video trực tiếp.';
    toast('Không tạo được đề cương — thử lại sau.', 'err');
  } finally {
    ui.btnGeneratePlan.disabled = false;
  }
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

ui.btnCreate.addEventListener('click', () => createFlow());
ui.btnCreateVeoLite.addEventListener('click', () => createFlow({ openVeoLite: true }));

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
  if (isLocalVoice(state.voice)) {
    toast('Đã chọn giọng local miễn phí — nhấn <b>🔊↻</b> để tạo audio. Cần cấu hình endpoint TTS trên server.', 'info', 5500);
  } else if (state.voice !== 'none' && state.voice !== 'browser' && !state.scenes.some(s => s.voiceKind === 'ai')) {
    toast('Đã chọn giọng AI — nhấn <b>🔊↻</b> để tạo giọng đọc cho các cảnh.', 'info', 5000);
  }
  saveSoon();
});

ui.studioVoiceTone.addEventListener('change', () => {
  state.voiceTone = ui.studioVoiceTone.value;
  saveSoon();
  toast(`Phong cách đọc: <b>${VOICE_TONES[state.voiceTone] || state.voiceTone}</b>. Nhấn 🔊↻ để áp dụng cho audio đã tạo.`, 'info', 3500);
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
      const ab = isLocalVoice(state.voice)
        ? await synthesizeLocalVoice(bodyScenes[i].text, state.voice, { rate: state.voiceRate })
        : await synthesizeVoice(bodyScenes[i].text, state.voice, {
          tone: state.voiceTone,
          rate: state.voiceRate,
        });
      bodyScenes[i].buffer = await decodeToBuffer(ab);
      bodyScenes[i].voiceKind = isLocalVoice(state.voice) ? 'local' : 'ai';
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
  ui.inputBrief.value = state.brief || '';
  ui.inputFilmGenre.value = state.filmGenre || 'drama';
  ui.inputImageMode.value = state.imageMode || 'hybrid';
  ui.inputMotionStyle.value = state.motionStyle || 'slow-zoom';
  ui.inputVoiceTone.value = state.voiceTone || 'natural';
  ui.inputVoiceRate.value = String(state.voiceRate || '1');
  $$('#creativeModes .creative-mode').forEach(b => {
    const active = b.dataset.creativeMode === (state.creativeMode || 'storyboard');
    b.classList.toggle('active', active);
    if (active) ui.modeDescription.textContent = CREATIVE_MODES[b.dataset.creativeMode];
  });
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
  if (!card) return;
  const sc = state.scenes.find(s => s.id === card.dataset.id);
  if (!sc || sc.type !== 'body') return;
  if (e.target.classList.contains('scene-text')) {
    sc.text = e.target.value;
    // dựng lại timeline nhẹ (không render lại list để không mất focus)
    tl = buildTimeline(state);
    renderTicks();
    updateTimeUI(); renderFrame();
    refreshDurOnly(sc);
  } else if (e.target.classList.contains('scene-prompt')) {
    if (e.target.dataset.kind === 'image') sc.imagePrompt = e.target.value;
    if (e.target.dataset.kind === 'reference') sc.referencePrompt = e.target.value;
    if (e.target.dataset.kind === 'motion') sc.motionPrompt = e.target.value;
    if (e.target.dataset.kind === 'dialogue') sc.dialogue = e.target.value;
  } else return;
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
  if (e.target.closest('.scene-text, .scene-prompt, .prompt-details')) return; // đang chỉnh nội dung — không tua

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

// Google OAuth + Gemini image generation
let geminiAuthStatus = { configured: false, authenticated: false };

async function syncGeminiAuthUI() {
  if (!ui.btnGeminiAuth) return;
  try {
    geminiAuthStatus = await getGeminiStatus();
    if (geminiAuthStatus.authenticated) {
      ui.btnGeminiAuth.textContent = '✅ Gemini đã đăng nhập';
      ui.btnGeminiAuth.title = 'Bấm để đăng xuất Google Gemini';
      ui.btnGeminiAuth.classList.add('ok');
    } else {
      ui.btnGeminiAuth.textContent = geminiAuthStatus.configured ? '🔐 Đăng nhập Gemini' : '🔐 Gemini chưa cấu hình';
      ui.btnGeminiAuth.title = geminiAuthStatus.configured
        ? 'Đăng nhập Google để dùng Gemini image generation'
        : 'Quản trị viên cần cấu hình Google OAuth và Google Cloud project';
      ui.btnGeminiAuth.classList.remove('ok');
    }
  } catch (error) {
    ui.btnGeminiAuth.textContent = '🔐 Gemini không khả dụng';
    ui.btnGeminiAuth.title = error.message || 'Không kiểm tra được trạng thái Google Gemini';
  }
}

ui.btnGeminiAuth.addEventListener('click', async () => {
  try {
    if (geminiAuthStatus.authenticated) {
      if (!window.confirm('Đăng xuất Google Gemini trên phiên này?')) return;
      await logoutGoogleGemini();
      await syncGeminiAuthUI();
      toast('Đã đăng xuất Google Gemini.', 'ok', 2500);
      return;
    }
    if (!geminiAuthStatus.configured) {
      toast('Quản trị viên cần đặt GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET và GOOGLE_CLOUD_PROJECT_ID trước.', 'warn', 7000);
      return;
    }
    startGoogleGeminiLogin();
  } catch (error) {
    toast(`Google Gemini: ${escapeHtml(error.message || 'không thực hiện được')}`, 'err', 7000);
  }
});

// Hướng dẫn
$('#btnHelp').addEventListener('click', () => $('#helpModal').classList.remove('hidden'));

// Danh mục nguồn mở đã khảo sát — chỉ link tham khảo, không copy code trực tiếp
ui.sourceList.innerHTML = OPEN_SOURCE_REFERENCES.map(src => `<article class="source-item">
  <div><b>${escapeHtml(src.name)}</b><span>${escapeHtml(src.tag)}</span></div>
  <p>${escapeHtml(src.text)}</p>
  <a href="${src.url}" target="_blank" rel="noopener noreferrer">Mở repository ↗</a>
</article>`).join('');
$('#btnSources').addEventListener('click', () => ui.sourcesModal.classList.remove('hidden'));

/* ═══════════ Khởi động ═══════════ */

function init() {
  updateServiceChip();
  syncGeminiAuthUI();

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
