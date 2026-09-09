/**
 * Smoke-test tích hợp cho VideoAI Studio (bản cũ, nay nằm ở public/video-studio/).
 *
 * LƯU Ý: app chính của repo hiện là PhotoAI Studio (public/index.html).
 * Test này vẫn kiểm tra bản VideoAI cũ.
 *
 * Chạy app thật (bundle bằng esbuild) trong jsdom + canvas thật (@napi-rs/canvas),
 * mô phỏng 2 kịch bản:
 *   A) OFFLINE — mọi dịch vụ AI ngoài đứt → toàn bộ fallback phải hoạt động
 *   B) ONLINE  — dịch vụ AI trả dữ liệu giả → luồng AI chính hoạt động end-to-end
 *
 * Cài dev-deps:  npm i -D jsdom esbuild @napi-rs/canvas
 * Chạy:          node scripts/smoke-test.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'noop.cjs'));
const napi = require('@napi-rs/canvas');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BUNDLE = path.join(ROOT, '.smoke-bundle.js');

/* ── 1. Bundle app bằng esbuild ── */
execSync(`npx esbuild ${ROOT}/public/video-studio/js/main.js --bundle --format=iife --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const bundleCode = readFileSync(BUNDLE, 'utf8');
const html = readFileSync(path.join(ROOT, 'public/video-studio/index.html'), 'utf8');

/* ── Ảnh PNG "thật" dùng làm nội dung mọi ảnh tải thành công ── */
const TEST_PNG = (() => {
  const c = napi.createCanvas(1280, 720);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1280, 720);
  g.addColorStop(0, '#312e81'); g.addColorStop(0.5, '#7c5cff'); g.addColorStop(1, '#22d3ee');
  x.fillStyle = g; x.fillRect(0, 0, 1280, 720);
  x.fillStyle = '#f472b6';
  x.beginPath(); x.arc(640, 360, 180, 0, Math.PI * 2); x.fill();
  return c.toBuffer('image/png');
})();

const MP3_FAKE_B64 = Buffer.from('fake-mp3-bytes-for-decode-stub').toString('base64');

let pass = 0, fail = 0;
const errors = [];
const t = (name, cond) => { cond ? (pass++, console.log('  ✓', name)) : (fail++, console.log('  ✗ FAIL:', name)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, timeoutMs = 30000, step = 100) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (fn()) return true;
    await sleep(step);
  }
  return false;
}

/** Response giả (jsdom không có fetch/Response) */
class FakeResponse {
  constructor(body, init = {}) {
    this.status = init.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this._body = body;
    this.headers = {
      get: k => (String(k).toLowerCase() === 'content-type' ? (init.headers && init.headers['content-type']) || 'text/plain' : null),
    };
  }
  async json() { return JSON.parse(this._body); }
  async text() { return String(this._body); }
  async arrayBuffer() { return new TextEncoder().encode(String(this._body)).buffer; }
}

const AI_SCENES = [
  { narration: 'Bạn đã bao giờ nghe về chủ đề tuyệt vời này chưa? Hôm nay chúng ta sẽ tìm hiểu thật kỹ về nó.', imagePrompt: 'beautiful cinematic landscape, dramatic sky, wide shot' },
  { narration: 'Mọi chuyện bắt đầu từ rất lâu trước đây, với những câu chuyện ít ai kể lại.', imagePrompt: 'ancient history scene, warm light, storytelling mood' },
  { narration: 'Điều quan trọng nhất nằm ở chính những chi tiết nhỏ bé mà chúng ta thường bỏ qua.', imagePrompt: 'macro detail shot, bokeh lights, cinematic' },
  { narration: 'Và bây giờ, tất cả đã trở thành một phần không thể thiếu trong đời sống hiện đại.', imagePrompt: 'modern life city, vibrant colors, wide angle' },
  { narration: 'Tương lai còn nhiều điều bất ngờ đang chờ đợi chúng ta phía trước!', imagePrompt: 'futuristic horizon, sunrise, hope, cinematic' },
];

/**
 * Tạo "trình duyệt" giả với các patch: canvas thật, Image tải tức thì,
 * fetch giả, AudioContext giả.
 */
function makeDom(mode) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(`[${mode}] ` + ((e.detail && e.detail.stack) || e.message || String(e))));
  vc.on('error', (...a) => errors.push(`[${mode}] ` + a.join(' ')));

  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    virtualConsole: vc,
  });
  const { window: w } = dom;
  const doc = w.document;

  /* jsdom không có pointer capture */
  w.Element.prototype.setPointerCapture = function () {};
  w.Element.prototype.releasePointerCapture = function () {};

  /* canvas thật cho mọi canvas tạo bằng createElement */
  const origCreate = doc.createElement.bind(doc);
  doc.createElement = (tag, ...rest) => {
    if (String(tag).toLowerCase() === 'canvas') return napi.createCanvas(300, 150);
    return origCreate(tag, ...rest);
  };

  /* canvas trong HTML (previewCanvas, thumbnail) */
  w.HTMLCanvasElement.prototype.getContext = function (type) {
    if (!this._napiCanvas) {
      this._napiCanvas = napi.createCanvas(this.width || 300, this.height || 150);
    } else {
      if (this._napiCanvas.width !== (this.width || 300)) this._napiCanvas.width = this.width;
      if (this._napiCanvas.height !== (this.height || 150)) this._napiCanvas.height = this.height;
    }
    return this._napiCanvas.getContext(type);
  };

  /* getBoundingClientRect trả 0 trong jsdom — stub cho timeline */
  const origGBCR = w.HTMLElement.prototype.getBoundingClientRect;
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    const r = origGBCR.call(this);
    if (this.id === 'timeline' && !r.width) return { ...r, left: 0, width: 100, top: 0, height: 20 };
    return r;
  };

  /* Image: luôn "tải" bằng ảnh test (trừ pollinations khi offline) */
  const RealImage = napi.Image;
  w.Image = class extends RealImage {
    set src(v) {
      this._url = v;
      const isPollinations = typeof v === 'string' && v.includes('pollinations.ai');
      const ok = !(mode === 'offline' && isPollinations);
      setTimeout(() => {
        if (ok) {
          const d = Object.getOwnPropertyDescriptor(RealImage.prototype, 'src');
          d.set.call(this, TEST_PNG);
          this.onload && this.onload();
        } else {
          this.onerror && this.onerror(new Error('simulated offline'));
        }
      }, 5);
    }
    get src() { return this._url || ''; }
  };

  /* fetch giả */
  w.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (mode === 'offline') throw new TypeError('simulated offline fetch');
    if (u.includes('text.pollinations.ai')) {
      let body = {};
      try { body = JSON.parse(opts.body || '{}'); } catch { /* noop */ }
      if (body.model === 'openai-audio') {
        return new FakeResponse(JSON.stringify({
          choices: [{ message: { audio: { data: MP3_FAKE_B64 } } }],
        }), { headers: { 'content-type': 'application/json' } });
      }
      return new FakeResponse(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(AI_SCENES) } }],
      }), { headers: { 'content-type': 'application/json' } });
    }
    return new FakeResponse('not found', { status: 404 });
  };

  /* AudioContext giả */
  class FakeParam {
    constructor(v = 1) { this.value = v; }
    setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {}
  }
  class FakeNode {
    constructor() {
      this.gain = new FakeParam(1); this.frequency = new FakeParam(440);
      this.detune = new FakeParam(0); this.Q = new FakeParam(1);
      this.buffer = null; this.loop = false; this.type = 'sine';
    }
    connect(n) { return n; } disconnect() {} start() {} stop() {}
  }
  class FakeAC {
    constructor() { this.destination = new FakeNode(); this.sampleRate = 44100; this.state = 'running'; }
    get currentTime() { return performance.now() / 1000; }
    resume() { return Promise.resolve(); }
    createGain() { return new FakeNode(); }
    createOscillator() { return new FakeNode(); }
    createBufferSource() { return new FakeNode(); }
    createBiquadFilter() { return new FakeNode(); }
    createConvolver() { return new FakeNode(); }
    createBuffer(ch, len, sr) { return { duration: len / sr, getChannelData: () => new Float32Array(len) }; }
    decodeAudioData() { return Promise.resolve({ duration: 3.4, sampleRate: 44100, getChannelData: () => new Float32Array(1000) }); }
    createMediaStreamDestination() { return { stream: { getAudioTracks: () => [], getVideoTracks: () => [] } }; }
  }
  w.AudioContext = FakeAC;
  w.OfflineAudioContext = FakeAC;

  /* chạy app */
  try {
    w.eval(bundleCode);
  } catch (e) {
    errors.push(`[${mode}] eval: ` + (e.stack || e.message));
  }

  return { dom, window: w, doc };
}

const pixelsNonBlack = canvasEl => {
  const nc = canvasEl._napiCanvas || canvasEl;
  if (!nc) return false;
  const x = nc.getContext('2d');
  const d = x.getImageData(0, 0, Math.min(80, nc.width), Math.min(80, nc.height)).data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] + d[i + 1] + d[i + 2] > 30) return true;
  }
  return false;
};

function scrub(w, p) {
  const tlEl = w.document.querySelector('#timeline');
  const r = tlEl.getBoundingClientRect();
  tlEl.dispatchEvent(new w.MouseEvent('pointerdown', { clientX: r.left + r.width * p, bubbles: true }));
  tlEl.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true }));
}

async function clickCreate(w, topic) {
  w.document.querySelector('#inputTopic').value = topic;
  w.document.querySelector('#btnCreate').click();
}

/** Đợi tạo video xong: overlay ẨN + studio HIỆN */
const creationDone = doc =>
  doc.querySelector('#busyOverlay').classList.contains('hidden') &&
  !doc.querySelector('#screen-studio').classList.contains('hidden');

const bodyCardsOf = doc => [...doc.querySelectorAll('.scene-card:not(.cardtype)')];

/* ═══════════ KỊCH BẢN B: ONLINE ═══════════ */
async function scenarioOnline() {
  console.log('\n━━━ Kịch bản ONLINE (dịch vụ AI hoạt động) ━━━');
  const { window: w, doc } = makeDom('online');
  t('app khởi động không lỗi', errors.length === 0);
  t('màn tạo mới hiển thị', !doc.querySelector('#screen-create').classList.contains('hidden'));

  await clickCreate(w, 'Trí tuệ nhân tạo và tương lai');
  const done = await waitFor(() => creationDone(doc));
  t('tạo video hoàn tất, vào Studio', done);

  const cards = [...doc.querySelectorAll('.scene-card')];
  t('đủ 7 thẻ cảnh (1 mở + 5 thân + 1 kết)', cards.length === 7);
  const bodyCards = bodyCardsOf(doc);
  t('5 cảnh thân có lời bình AI (nội dung từ API giả)', bodyCards.length === 5 && bodyCards.every(c => c.querySelector('.scene-text').value.includes('chủ đề tuyệt vời') || c.querySelector('.scene-text').value.includes('Cảnh') || c.querySelector('.scene-text').value.length > 30));
  t('ảnh AI cho cảnh thân (🖼 AI)', bodyCards.every(c => c.querySelector('.scene-meta').textContent.includes('🖼 AI')));
  t('giọng đọc AI cho cảnh thân (badge 🔊 trong meta)', bodyCards.some(c => c.querySelector('.scene-meta').textContent.includes('🔊 AI')));

  const timeTxt = doc.querySelector('#timeDisplay').textContent;
  t('hiển thị thời lượng hợp lệ', /\d+:\d+ \/ \d+:\d+/.test(timeTxt) && !timeTxt.endsWith('/ 0:00'));

  scrub(w, 0.5); // tua giữa video — t=0 là màn đen do fade-in
  await sleep(150);
  t('canvas preview có nội dung (không đen)', pixelsNonBlack(doc.querySelector('#previewCanvas')));

  /* phát 1.2 giây */
  const t0 = doc.querySelector('#timeDisplay').textContent;
  doc.querySelector('#btnPlay').click();
  await sleep(1200);
  const t1 = doc.querySelector('#timeDisplay').textContent;
  t('vòng lặp phát chạy (thời gian tăng)', t1 !== t0);
  doc.querySelector('#btnPlay').click();
  await sleep(150);

  /* sửa lời bình */
  const firstBody = bodyCards[0].querySelector('.scene-text');
  firstBody.value = 'Lời bình mới vừa sửa đấy. Dài hơn một tí cho đẹp.';
  firstBody.dispatchEvent(new w.Event('input', { bubbles: true }));
  await sleep(120);
  t('sửa cảnh không gây lỗi', errors.length === 0);

  /* đổi ảnh thủ tục */
  bodyCards[1].querySelector('[data-act="procImage"]').click();
  await waitFor(() => bodyCards[1].querySelector('.scene-meta').textContent.includes('🎨'), 3000);
  t('đổi sang ảnh trừu tượng OK', bodyCards[1].querySelector('.scene-meta').textContent.includes('🎨'));

  /* xoá + thêm cảnh */
  bodyCards[2].querySelector('[data-act="delete"]').click();
  await sleep(150);
  t('xoá cảnh → còn 6 thẻ', doc.querySelectorAll('.scene-card').length === 6);
  doc.querySelector('#btnAddScene').click();
  await waitFor(() => doc.querySelectorAll('.scene-card').length === 7, 3000);
  t('thêm cảnh mới OK', doc.querySelectorAll('.scene-card').length === 7);

  /* modal xuất */
  doc.querySelector('#btnExport').click();
  t('modal xuất mở & số liệu đúng',
    !doc.querySelector('#exportModal').classList.contains('hidden')
    && doc.querySelector('#expScenes').textContent === '7'
    && /\d+:\d+/.test(doc.querySelector('#expDur').textContent));
  doc.querySelector('#exportModal [data-close]').click();

  await sleep(300);
  t('không có lỗi runtime trong kịch bản online', errors.length === 0);
}

/* ═══════════ KỊCH BẢN A: OFFLINE ═══════════ */
async function scenarioOffline() {
  console.log('\n━━━ Kịch bản OFFLINE (mọi dịch vụ AI đứt) ━━━');
  errors.length = 0;
  const { window: w, doc } = makeDom('offline');

  await clickCreate(w, 'Cà phê Việt Nam và văn hóa pha chế');
  const done = await waitFor(() => creationDone(doc));
  t('tạo video offline hoàn tất (fallback)', done);

  const bodyCards = bodyCardsOf(doc);
  const withTopic = bodyCards.filter(c => c.querySelector('.scene-text').value.includes('Cà phê Việt Nam')).length;
  t('kịch bản dự phòng bám chủ đề', bodyCards.length === 5 && withTopic >= 3);
  t('ảnh rơi về thư viện AI có sẵn', bodyCards.every(c => c.querySelector('.scene-meta').textContent.includes('📚 Thư viện') || c.querySelector('.scene-meta').textContent.includes('🎨')));

  t('giọng đọc chuyển về none/browser khi offline', ['none', 'browser'].includes(doc.querySelector('#studioVoice').value));

  scrub(w, 0.5);
  await sleep(150);
  t('canvas preview vẫn render được', pixelsNonBlack(doc.querySelector('#previewCanvas')));

  scrub(w, 0.8);
  await sleep(150);
  t('tua không lỗi', errors.length === 0);

  const saved = w.localStorage.getItem('videoai-studio-v1');
  t('dự án được tự lưu vào localStorage', !!saved && JSON.parse(saved).scenes.length === 7);

  await sleep(300);
  t('không có lỗi runtime trong kịch bản offline', errors.length === 0);
}

/* ═══════ Chạy ═══════ */
await scenarioOnline();
await scenarioOffline();

console.log('\n════════════════════════════');
console.log(`KẾT QUẢ: ${pass} pass, ${fail} fail, ${errors.length} lỗi runtime`);
if (errors.length) console.log(errors.slice(0, 10).join('\n---\n'));
process.exit(fail || errors.length ? 1 : 0);
