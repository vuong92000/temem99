/* ─────────────────────────────────────────────
   ai.js — gọi các dịch vụ AI online (Pollinations.ai — miễn phí, không cần key)
   Mọi hàm đều có phương án dự phòng khi offline:
   • Kịch bản  → heuristicScript() (local)
   • Hình ảnh  → thư viện ảnh / ảnh thủ tục (local)
   • Giọng đọc → giọng trình duyệt / thu âm (local)
   ───────────────────────────────────────────── */

import { withTimeout, sleep, clamp } from './util.js';
import { THEMES, detectTheme } from './art.js';

const TEXT_API = 'https://text.pollinations.ai';
const IMAGE_API = 'https://image.pollinations.ai';

const REFERRER = encodeURIComponent(
  (typeof location !== 'undefined' && location.hostname) || 'videoai-studio'
);

/** Trạng thái dịch vụ: null = chưa kiểm tra, true/false = khả dụng/không */
export const service = { text: null, image: null, audio: null };

export const STYLE_SUFFIX = {
  cinematic: 'cinematic lighting, dramatic atmosphere, ultra detailed, 8k, wide establishing shot',
  photo: 'professional photography, photorealistic, natural light, high detail, 50mm lens',
  anime: 'anime illustration, vibrant colors, studio ghibli inspired, detailed background art',
  watercolor: 'soft watercolor painting, pastel palette, artistic paper texture',
  render3d: '3d render, isometric, soft studio lighting, octane render, pastel palette',
  minimal: 'flat design, minimal geometric shapes, vector illustration, bold solid colors',
};

/* ═══════════ 1. KỊCH BẢN ═══════════ */

/**
 * Dùng AI để viết kịch bản từ một chủ đề.
 * Trả về mảng [{ text, imagePrompt }]. Ném lỗi nếu không gọi được.
 */
export async function generateScriptViaAI(topic, { sceneCount = 5, style = 'cinematic' } = {}) {
  const suffix = STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic;
  const system = [
    'Bạn là biên kịch video ngắn chuyên nghiệp, viết tiếng Việt tự nhiên, sống động.',
    'Nhiệm vụ: viết kịch bản video về chủ đề do người dùng cung cấp.',
    'Chỉ trả về DUY NHẤT một mảng JSON hợp lệ, không thêm bất kỳ chữ nào ngoài JSON.',
    `Mảng gồm đúng ${sceneCount} phần tử, mỗi phần tử có dạng:`,
    '{"narration": "lời bình tiếng Việt cho cảnh này, 2-3 câu, khoảng 30-55 từ, cuốn hút như video trên mạng xã hội",',
    `"imagePrompt": "mô tả hình ảnh BẰNG TIẾNG ANH cho cảnh này, 12-25 từ, phong cách: ${suffix}"}`,
    'Các cảnh phải nối tiếp nhau thành một câu chuyện mạch lạc: mở đầu gây chú ý → triển khai → kết sâu sắc.',
  ].join('\n');

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Chủ đề video: ${topic}` },
  ];

  let content = null;

  // Cố gắng qua endpoint tương thích OpenAI trước
  try {
    const res = await withTimeout(fetch(`${TEXT_API}/openai?referrer=${REFERRER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, seed: Math.floor(Math.random() * 1e6), referrer: REFERRER }),
    }), 60000, 'Quá thời gian chờ AI viết kịch bản');
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        content = j?.choices?.[0]?.message?.content ?? (typeof j === 'string' ? j : null);
      } else {
        content = await res.text();
      }
    }
  } catch { /* thử cách khác */ }

  // Thử endpoint text thuần
  if (!content) {
    const res = await withTimeout(fetch(`${TEXT_API}/?referrer=${REFERRER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, seed: Math.floor(Math.random() * 1e6), referrer: REFERRER }),
    }), 60000, 'Quá thời gian chờ AI viết kịch bản');
    if (!res.ok) throw new Error(`Dịch vụ kịch bản trả về ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json();
      content = j?.choices?.[0]?.message?.content ?? (typeof j === 'string' ? j : null);
    } else {
      content = await res.text();
    }
  }

  if (!content) throw new Error('AI không trả về nội dung');
  const scenes = parseScenesJSON(content);
  if (!scenes.length) throw new Error('Không đọc được kịch bản từ phản hồi AI');
  return scenes;
}

/** Trích mảng JSON từ văn bản AI trả về (chấp nhận cả ```json ... ```) */
function parseScenesJSON(content) {
  const candidates = [];
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1]);
  const firstArr = content.indexOf('[');
  const lastArr = content.lastIndexOf(']');
  if (firstArr !== -1 && lastArr > firstArr) candidates.push(content.slice(firstArr, lastArr + 1));
  candidates.push(content.trim());

  for (const cand of candidates) {
    try {
      const arr = JSON.parse(cand);
      if (!Array.isArray(arr)) continue;
      const scenes = arr
        .map(it => ({
          text: String(it?.narration ?? it?.text ?? it?.content ?? '').trim(),
          imagePrompt: String(it?.imagePrompt ?? it?.image ?? '').trim(),
        }))
        .filter(s => s.text);
      if (scenes.length) return scenes;
    } catch { /* thử ứng viên kế tiếp */ }
  }
  return [];
}

/* ── Kịch bản dự phòng (offline) ── */

const VI_STOPWORDS = new Set(('và của với các cái những để cho từ này đó là có được sẽ không bạn tôi ta chúng nó ở trên dưới khi thì ra vào bằng như cũng đã vừa hơn nhất chỉ về mà rất tới trước sau nữa ai gì nào cả hoặc nhưng vì sở dĩ do theo mỗi lần nay ngày năm'.split(' ')));

/** Trích từ khoá chính để làm image prompt */
function keywordsOf(text, n = 5) {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2 && !VI_STOPWORDS.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
}

/**
 * Chia văn bản có sẵn thành các cảnh (offline, không cần AI).
 * Hoặc nếu chỉ có chủ đề ngắn — dựng khung kịch bản mẫu.
 */
export function heuristicScript(text, { sceneCount = 5, style = 'cinematic' } = {}) {
  const clean = (text || '').trim();
  const suffix = STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic;
  const sentences = clean
    .split(/(?<=[.!?…])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 1);

  let parts;

  if (sentences.length >= 2) {
    // Dán kịch bản sẵn: gom câu thành sceneCount nhóm cân theo số từ
    const totalWords = sentences.reduce((s, x) => s + x.split(/\s+/).length, 0);
    const target = Math.max(12, Math.ceil(totalWords / sceneCount));
    parts = [];
    let cur = [];
    let curW = 0;
    for (const s of sentences) {
      const w = s.split(/\s+/).length;
      if (curW > 0 && curW + w > target * 1.35 && parts.length < sceneCount - 1) {
        parts.push(cur.join(' ')); cur = []; curW = 0;
      }
      cur.push(s); curW += w;
      if (curW >= target && parts.length < sceneCount - 1) {
        parts.push(cur.join(' ')); cur = []; curW = 0;
      }
    }
    if (cur.length) parts.push(cur.join(' '));
  } else {
    // Chỉ có chủ đề ngắn: dựng khung mẫu
    const topic = clean || 'Câu chuyện thú vị';
    const templates = [
      t => `Bạn đã bao giờ dừng lại và suy nghĩ về ${t}? Hôm nay, hãy cùng khám phá điều đó một cách thật khác biệt.`,
      t => `Trước hết, ${t} không đơn giản như nhiều người vẫn nghĩ. Đằng sau nó là cả một bối cảnh vô cùng thú vị.`,
      t => `Điều làm nên sức hút của ${t} nằm ở những chi tiết nhỏ bé mà ít ai để ý. Và chính những chi tiết ấy tạo nên khác biệt.`,
      t => `Nhìn xa hơn, ${t} đang dần định hình lại cách chúng ta sống, làm việc và kết nối với nhau mỗi ngày.`,
      t => `Vậy tương lai sẽ ra sao? Có lẽ câu trả lời nằm ở chính cách chúng ta lựa chọn hôm nay.`,
      t => `Một điều chắc chắn: ${t} vẫn còn rất nhiều điều để khám phá. Và hành trình ấy vừa mới bắt đầu.`,
      t => `Hãy để ${t} trở thành nguồn cảm hứng cho bạn khởi động điều mình muốn làm ngay hôm nay.`,
      t => `Cảm ơn bạn đã theo dõi. Đừng quên chia sẻ nếu bạn thấy điều này thú vị!`,
    ];
    parts = templates.slice(0, clamp(sceneCount, 3, 8)).map(f => f(topic));
  }

  return parts.map((text, i) => {
    const theme = detectTheme(text, i);
    const kw = keywordsOf(text);
    const enBits = [THEMES[theme].en, ...kw.slice(0, 3)];
    return { text, imagePrompt: `${enBits.join(', ')}, ${suffix}` };
  });
}

/* ═══════════ 2. HÌNH ẢNH ═══════════ */

/** Dựng URL tạo ảnh AI cho prompt */
export function buildImageUrl(prompt, seed, w, h) {
  return (
    `${IMAGE_API}/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux&referrer=${REFERRER}`
  );
}

/**
 * Tạo ảnh AI cho một prompt — trả về { img, url } (ảnh đã qua CORS).
 * Ném lỗi nếu không tạo được (để nơi gọi chuyển sang fallback).
 */
export async function generateImageForPrompt(prompt, seed, w, h) {
  const url = buildImageUrl(prompt, seed, w, h);
  const { loadImage } = await import('./art.js');
  const img = await loadImage(url, { cors: true, timeoutMs: 90000 });
  return { img, url };
}

/* ═══════════ 3. GIỌNG ĐỌC ═══════════ */

export const AI_VOICES = ['alloy', 'nova', 'shimmer', 'echo', 'onyx', 'fable'];

/**
 * Đọc văn bản thành âm thanh (mp3 ArrayBuffer) qua dịch vụ AI online.
 * Ném lỗi nếu không dùng được.
 */
export async function synthesizeVoice(text, voice = 'alloy') {
  const body = {
    model: 'openai-audio',
    modalities: ['text', 'audio'],
    audio: { voice, format: 'mp3' },
    messages: [
      { role: 'system', content: 'Bạn là giọng đọc video. Đọc to đúng văn bản được đưa, phát âm tiếng Việt rõ ràng, tự nhiên, nhịp điệu như người kể chuyện.' },
      { role: 'user', content: text },
    ],
    referrer: REFERRER,
  };
  const res = await withTimeout(fetch(`${TEXT_API}/openai?referrer=${REFERRER}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), 90000, 'Quá thời gian chờ giọng đọc AI');

  if (!res.ok) throw new Error(`Dịch vụ giọng đọc trả về ${res.status}`);

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('audio')) {
    return await res.arrayBuffer();
  }
  // Phản hồi JSON chứa base64
  const j = await res.json();
  const b64 = j?.choices?.[0]?.message?.audio?.data;
  if (!b64) throw new Error('Không tìm thấy dữ liệu âm thanh trong phản hồi');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/* ═══════════ Kiểm tra dịch vụ ═══════════ */

/** Kiểm tra nhanh dịch vụ text bằng 1 request siêu nhỏ */
export async function checkTextService() {
  try {
    const res = await withTimeout(
      fetch(`${TEXT_API}/Say%20OK?referrer=${REFERRER}`), 9000, 'timeout');
    service.text = res.ok;
  } catch { service.text = false; }
  return service.text;
}

/** Kiểm tra dịch vụ ảnh bằng 1 ảnh nhỏ 64×64 */
export async function checkImageService() {
  try {
    const { loadImage } = await import('./art.js');
    const url = `${IMAGE_API}/prompt/test?width=64&height=64&seed=1&nologo=true&referrer=${REFERRER}`;
    await withTimeout(loadImage(url, { cors: true, timeoutMs: 25000 }), 26000, 'timeout');
    service.image = true;
  } catch { service.image = false; }
  return service.image;
}
