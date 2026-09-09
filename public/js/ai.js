/* ─────────────────────────────────────────────
   ai.js — gọi các dịch vụ AI online (Pollinations.ai — miễn phí, không cần key)
   Mọi hàm đều có phương án dự phòng khi offline:
   • Kịch bản  → heuristicScript() (local)
   • Hình ảnh  → thư viện ảnh / ảnh thủ tục (local)
   • Giọng đọc → giọng trình duyệt / thu âm (local)
   ───────────────────────────────────────────── */

import { withTimeout, clamp } from './util.js';
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

/** Các preset dùng chung cho AI Director và phần Motion Prompt. */
export const MOTION_PRESETS = {
  'slow-zoom': 'slow cinematic push-in, subtle parallax, gentle camera drift',
  'pan-left': 'smooth camera pan from right to left, cinematic ease-in-out',
  'pan-right': 'smooth camera pan from left to right, cinematic ease-in-out',
  'push-in': 'confident dolly push-in toward the subject, shallow depth of field',
  'parallax': 'layered 2.5D parallax, foreground moves faster than background, elegant drift',
  'static': 'locked-off camera, minimal movement, hold the composition steady',
};

export const CREATIVE_MODE_CONTEXT = {
  storyboard: 'storyboard kể chuyện mạch lạc, có hook và payoff',
  presentation: 'video thuyết trình doanh nghiệp, rõ ràng, có tiêu đề và điểm chính',
  product: 'video giới thiệu sản phẩm, nêu vấn đề, lợi ích và lời kêu gọi hành động',
  social: 'video dọc ngắn cho mạng xã hội, nhịp nhanh, hook mạnh trong 3 giây đầu',
  promptlab: 'bản thử nghiệm hình ảnh, ưu tiên prompt chi tiết và nhất quán thị giác',
  shortfilm: 'phim ngắn AI điện ảnh 3 hồi, có nhân vật nhất quán, cao trào và kết thúc cảm xúc',
};

export const FILM_GENRES = {
  drama: 'tâm lý đời thường, chân thật và giàu cảm xúc',
  scifi: 'khoa học viễn tưởng, công nghệ và bí ẩn tương lai',
  mystery: 'trinh thám bí ẩn, căng thẳng nhưng phù hợp khán giả phổ thông',
  romance: 'tình cảm nhẹ nhàng, tinh tế, không sáo rỗng',
  adventure: 'phiêu lưu khám phá, giàu hình ảnh và cảm giác kỳ vĩ',
  comedy: 'hài hước duyên dáng, nhịp nhanh, kết thúc tích cực',
};

export const VOICE_TONES = {
  natural: 'giọng kể tiếng Việt chân thật, ấm áp, phát âm rõ, nhịp thở tự nhiên',
  documentary: 'giọng thuyết minh tài liệu điềm tĩnh, có chiều sâu, nhấn nhá vừa phải',
  energetic: 'giọng trẻ trung, năng lượng, cuốn hút như video mạng xã hội nhưng không gấp',
  corporate: 'giọng thuyết trình chuyên nghiệp, tự tin, rõ ràng và đáng tin cậy',
  warm: 'giọng kể gần gũi, truyền cảm, mềm mại như đang trò chuyện với khán giả',
};

/* ═══════════ 1. KỊCH BẢN ═══════════ */

/**
 * Dùng AI để viết kịch bản từ một chủ đề.
 * Trả về mảng [{ text, imagePrompt }]. Ném lỗi nếu không gọi được.
 */
export async function generateScriptViaAI(topic, {
  sceneCount = 5,
  style = 'cinematic',
  creativeMode = 'storyboard',
  motionStyle = 'slow-zoom',
  brief = '',
} = {}) {
  const suffix = STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic;
  const modeContext = CREATIVE_MODE_CONTEXT[creativeMode] || CREATIVE_MODE_CONTEXT.storyboard;
  const motionContext = MOTION_PRESETS[motionStyle] || MOTION_PRESETS['slow-zoom'];
  const system = [
    'Bạn là AI creative director và biên kịch video chuyên nghiệp, viết tiếng Việt tự nhiên, sống động.',
    `Hãy tạo ${modeContext}.`,
    'Nhiệm vụ: viết kịch bản video về chủ đề do người dùng cung cấp, đồng thời chuẩn bị prompt để tạo ảnh và chuyển động cho từng cảnh.',
    'Chỉ trả về DUY NHẤT một mảng JSON hợp lệ, không thêm bất kỳ chữ nào ngoài JSON.',
    `Mảng gồm đúng ${sceneCount} phần tử, mỗi phần tử có dạng:`,
    '{"narration": "lời bình tiếng Việt cho cảnh này, 2-3 câu, khoảng 30-55 từ, cuốn hút",',
    `"imagePrompt": "prompt tạo hình ảnh BẰNG TIẾNG ANH, 18-35 từ, mô tả chủ thể, bố cục, ánh sáng và phong cách: ${suffix}",`,
    `"motionPrompt": "prompt chuyển động BẰNG TIẾNG ANH, 10-24 từ, mô tả camera, tốc độ, hướng di chuyển; ưu tiên: ${motionContext}"}`,
    'Prompt ảnh không chứa chữ, logo hoặc watermark. Các cảnh phải nối tiếp nhau thành một câu chuyện mạch lạc: mở đầu gây chú ý → triển khai → kết sâu sắc.',
    brief ? `Định hướng bổ sung của người dùng: ${brief}` : '',
  ].filter(Boolean).join('\n');

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

/**
 * Đạo diễn phim ngắn: ngoài scene list còn trả về film bible để giữ
 * nhân vật, thế giới và tông phim nhất quán giữa các cảnh.
 */
export async function generateShortFilmPlanViaAI(topic, {
  sceneCount = 6,
  style = 'cinematic',
  motionStyle = 'slow-zoom',
  brief = '',
  genre = 'drama',
} = {}) {
  const genreContext = FILM_GENRES[genre] || FILM_GENRES.drama;
  const suffix = STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic;
  const motion = MOTION_PRESETS[motionStyle] || MOTION_PRESETS['slow-zoom'];
  const system = [
    'Bạn là đạo diễn, biên kịch và storyboard artist cho phim ngắn AI.',
    `Tạo một phim ngắn ${genreContext}, dài khoảng ${sceneCount} cảnh, theo cấu trúc 3 hồi: mở nút → xung đột/cao trào → kết thúc có dư âm.`,
    'Nhân vật phải nhất quán: mô tả ngoại hình, trang phục, tuổi và đặc điểm nhận diện trong film bible; lặp lại các chi tiết đó trong prompt ảnh.',
    'Chỉ trả về DUY NHẤT một object JSON hợp lệ, không markdown, theo đúng schema:',
    '{"title":"tên phim", "logline":"một câu logline", "worldPrompt":"mô tả thế giới, bảng màu, ánh sáng bằng tiếng Anh",',
    '"characters":[{"name":"tên", "description":"mô tả tiếng Việt", "visualPrompt":"mô tả nhận diện bằng tiếng Anh"}],',
    `"scenes":[{"narration":"lời kể tiếng Việt 25-50 từ", "dialogue":"một câu thoại ngắn hoặc chuỗi rỗng", "shotType":"wide/medium/close-up/over-the-shoulder/aerial", "imagePrompt":"prompt ảnh tiếng Anh 25-45 từ, có nhân vật và bối cảnh, ${suffix}", "motionPrompt":"prompt camera tiếng Anh 12-25 từ, ưu tiên ${motion}"}]}`,
    'Không tạo logo, chữ, watermark. Cảnh 1 phải có hook hình ảnh; cảnh cuối phải khép lại cảm xúc.',
    brief ? `Ghi chú đạo diễn: ${brief}` : '',
    `Chủ đề/phôi truyện: ${topic}`,
  ].filter(Boolean).join('\n');
  const res = await withTimeout(fetch(`${TEXT_API}/openai?referrer=${REFERRER}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [{ role: 'system', content: system }, { role: 'user', content: topic }],
      seed: Math.floor(Math.random() * 1e6),
      referrer: REFERRER,
    }),
  }), 70000, 'Quá thời gian chờ AI đạo diễn phim ngắn');
  if (!res.ok) throw new Error(`AI phim ngắn trả về ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  const content = ct.includes('application/json')
    ? (await res.json())?.choices?.[0]?.message?.content
    : await res.text();
  const plan = parsePlanJSON(content);
  if (!plan || !Array.isArray(plan.scenes) || !plan.scenes.length) throw new Error('Không đọc được film bible từ AI');
  return plan;
}

/** Dự phòng local cho mode phim ngắn, không cần mạng. */
export function heuristicShortFilmPlan(topic, {
  sceneCount = 6,
  style = 'cinematic',
  motionStyle = 'slow-zoom',
  brief = '',
  genre = 'drama',
} = {}) {
  const base = heuristicScript(topic, { sceneCount, style, motionStyle, creativeMode: 'shortfilm' });
  const shotTypes = ['wide establishing shot', 'medium shot', 'close-up', 'over-the-shoulder shot', 'tracking shot', 'aerial closing shot'];
  const title = (topic || 'Ngày mai bắt đầu từ hôm nay').split(/[.!?]/)[0].trim().slice(0, 62);
  const character = genre === 'scifi'
    ? { name: 'Người giữ tín hiệu', description: 'Một nhân vật trẻ tò mò, kiên định, mang theo thiết bị phát sáng nhỏ.', visualPrompt: 'young Vietnamese protagonist, short dark hair, weathered blue jacket, small glowing device, consistent character design' }
    : { name: 'Nhân vật chính', description: 'Một người trẻ bình thường, ánh mắt giàu suy tư, trang phục giản dị và nhất quán.', visualPrompt: 'young Vietnamese protagonist, thoughtful eyes, simple neutral clothes, consistent face and costume across shots' };
  const worldPrompt = `cinematic ${FILM_GENRES[genre] || FILM_GENRES.drama}, coherent color palette, atmospheric natural light, ${STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic}`;
  const scenes = base.map((p, i) => ({
    ...p,
    shotType: shotTypes[i % shotTypes.length],
    dialogue: i === 0 ? 'Mình phải tìm ra câu trả lời.' : i === base.length - 1 ? 'Có lẽ mọi chuyện chỉ vừa bắt đầu.' : '',
    imagePrompt: `${p.imagePrompt}, ${character.visualPrompt}, ${worldPrompt}, ${shotTypes[i % shotTypes.length]}`,
    motionPrompt: `${p.motionPrompt}, preserve character identity and cinematic continuity`,
  }));
  return {
    title,
    logline: `Một câu chuyện ${FILM_GENRES[genre] || FILM_GENRES.drama} bắt đầu từ: ${topic}.`,
    worldPrompt,
    characters: [character],
    scenes,
    brief,
  };
}

/** Trích object JSON từ phản hồi AI. */
function parsePlanJSON(content) {
  const raw = String(content || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fence?.[1], raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* thử ứng viên kế tiếp */ }
  }
  return null;
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
          motionPrompt: String(it?.motionPrompt ?? it?.motion ?? '').trim(),
        }))
        .filter(s => s.text);
      if (scenes.length) return scenes;
    } catch { /* thử ứng viên kế tiếp */ }
  }
  return [];
}

function normalizeChartCodes(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,|]/);
  return [...new Set(raw.map(code => String(code).trim().replace(/\bCHAR(?:ACTER)?\s*(\d+)/gi, 'CHART $1')).filter(code => /CHART\s*\d+/i.test(code)))];
}

function parseWizardScenesJSON(content) {
  const raw = String(content || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fence?.[1], raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1), raw].filter(candidate => candidate && candidate.length > 2);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed)) continue;
      const scenes = parsed.map((item, index) => {
        const characters = normalizeChartCodes(item?.characterCodes ?? item?.characters ?? item?.characterRefs);
        const prompt = String(item?.promptEnglish ?? item?.imagePrompt ?? item?.videoPrompt ?? '').trim();
        const motion = String(item?.motionPrompt ?? item?.cameraPrompt ?? '').trim();
        return {
          text: String(item?.narration ?? item?.script ?? item?.text ?? '').trim(),
          imagePrompt: prompt,
          motionPrompt: motion,
          characterCodes: characters.length ? characters : ['CHART 1'],
          shotType: String(item?.shotType ?? '').trim(),
        };
      }).filter(scene => scene.text && scene.imagePrompt);
      if (scenes.length) return scenes;
    } catch { /* thử ứng viên JSON kế tiếp */ }
  }
  return [];
}

/**
 * AI Script Wizard: biến một tiêu đề ngắn thành storyboard có prompt video tiếng Anh.
 * Mỗi cảnh có characterCodes CHART 1/CHART 2 để nối với thư viện ảnh tham chiếu.
 */
export async function generateWizardScriptViaAI(title, { sceneCount = 8, style = 'cinematic' } = {}) {
  const safeCount = clamp(Number(sceneCount) || 8, 3, 10);
  const styleText = STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic;
  const system = [
    'Bạn là AI Script Wizard cho một ứng dụng tạo phim ngắn bằng text-to-video.',
    `Từ tiêu đề tiếng Việt, hãy viết đúng ${safeCount} cảnh liên tục: hook → phát triển → cao trào → kết thúc.`,
    'Lời bình/narration viết bằng tiếng Việt, tự nhiên, mỗi cảnh 1-2 câu ngắn.',
    'promptEnglish phải là prompt tiếng Anh chi tiết cho video generation model: nhân vật, hành động, bối cảnh, thời gian, ánh sáng, ống kính, bố cục và cảm xúc; không chữ, logo hoặc watermark.',
    'Nhận diện nhân vật chính và gán mã ổn định CHART 1, CHART 2. Phải lặp lại cùng mã trong mọi cảnh có nhân vật đó; mô tả ngoại hình nhất quán trong promptEnglish.',
    'Chỉ trả về một mảng JSON hợp lệ, không markdown, theo schema:',
    '[{"scene":1,"narration":"...","promptEnglish":"detailed English video prompt...","motionPrompt":"English camera movement...","characterCodes":["CHART 1"],"shotType":"wide shot"}]',
    `Phong cách hình ảnh: ${styleText}. Tiêu đề: ${title}`,
  ].join('\n');
  let content = null;
  try {
    const res = await withTimeout(fetch(`${TEXT_API}/openai?referrer=${REFERRER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'system', content: system }, { role: 'user', content: `Tiêu đề câu chuyện: ${title}` }],
        seed: Math.floor(Math.random() * 1e6),
        referrer: REFERRER,
      }),
    }), 70000, 'Quá thời gian chờ AI Script Wizard');
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      content = ct.includes('application/json')
        ? (await res.json())?.choices?.[0]?.message?.content
        : await res.text();
    }
  } catch { /* main sẽ dùng fallback local */ }
  const scenes = parseWizardScenesJSON(content);
  if (!scenes.length) throw new Error('AI Script Wizard không trả về kịch bản hợp lệ');
  return scenes.slice(0, safeCount);
}

/** Fallback offline cho Wizard, vẫn tạo prompt tiếng Anh và mã CHART ổn định. */
export function heuristicWizardScript(title, { sceneCount = 8, style = 'cinematic' } = {}) {
  const safeCount = clamp(Number(sceneCount) || 8, 3, 10);
  const topic = String(title || 'Một câu chuyện đáng nhớ').trim();
  let base = heuristicScript(topic, { sceneCount: Math.min(safeCount, 8), style, motionStyle: 'slow-zoom', creativeMode: 'storyboard' });
  while (base.length < safeCount) {
    const source = base[base.length % base.length];
    base.push({ ...source, text: `${source.text} Hành trình của câu chuyện tiếp tục mở ra một bước ngoặt mới.` });
  }
  const beats = ['opening hook', 'introducing the world', 'character motivation', 'rising conflict', 'turning point', 'emotional climax', 'resolution', 'final memorable image'];
  return base.slice(0, safeCount).map((scene, index) => ({
    ...scene,
    characterCodes: ['CHART 1'],
    shotType: ['wide establishing shot', 'medium shot', 'close-up', 'tracking shot', 'over-the-shoulder shot', 'dramatic close-up', 'wide resolution shot', 'hero final shot'][index % 8],
    imagePrompt: `CHART 1, consistent Vietnamese protagonist, ${scene.imagePrompt}, ${beats[index % beats.length]}, detailed cinematic video frame, no text, no logo, no watermark`,
    motionPrompt: `${scene.motionPrompt}, smooth temporal continuity, keep CHART 1 appearance consistent`,
  }));
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
export function heuristicScript(text, {
  sceneCount = 5,
  style = 'cinematic',
  motionStyle = 'slow-zoom',
  creativeMode = 'storyboard',
} = {}) {
  const clean = (text || '').trim();
  const suffix = STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic;
  const motion = MOTION_PRESETS[motionStyle] || MOTION_PRESETS['slow-zoom'];
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
    const modeHint = CREATIVE_MODE_CONTEXT[creativeMode] || CREATIVE_MODE_CONTEXT.storyboard;
    return {
      text,
      imagePrompt: `${enBits.join(', ')}, ${suffix}, ${modeHint}`,
      motionPrompt: `${motion}, preserve subject continuity between shots`,
    };
  });
}

/** Prompt dự phòng, dùng được ngay cả khi không có mạng. */
export function getLocalPromptKit(text, {
  style = 'cinematic',
  motionStyle = 'slow-zoom',
  creativeMode = 'storyboard',
} = {}) {
  const theme = detectTheme(text || '', 0);
  const suffix = STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic;
  const motion = MOTION_PRESETS[motionStyle] || MOTION_PRESETS['slow-zoom'];
  const modeHint = CREATIVE_MODE_CONTEXT[creativeMode] || CREATIVE_MODE_CONTEXT.storyboard;
  const keywords = keywordsOf(text || '', 6).join(', ');
  return {
    imagePrompt: `${THEMES[theme]?.en || 'cinematic scene'}, ${keywords || 'clear focal subject'}, ${modeHint}, ${suffix}, no text, no logo, no watermark`,
    motionPrompt: `${motion}, gentle natural movement, maintain subject identity and composition`,
    negativePrompt: 'blurry, low quality, distorted anatomy, duplicate subject, text, logo, watermark',
  };
}

/**
 * Tạo bộ prompt chuyên dụng cho một cảnh. Đây là lớp "Prompt Lab" độc lập:
 * nếu text AI lỗi thì vẫn trả prompt local có cấu trúc để người dùng chỉnh sửa.
 */
export async function generatePromptKitViaAI(text, {
  style = 'cinematic',
  motionStyle = 'slow-zoom',
  creativeMode = 'storyboard',
} = {}) {
  const local = getLocalPromptKit(text, { style, motionStyle, creativeMode });
  const system = [
    'Bạn là prompt designer cho một trình dựng video AI.',
    'Trả về duy nhất JSON hợp lệ với 3 khóa imagePrompt, motionPrompt, negativePrompt.',
    'imagePrompt và motionPrompt viết bằng tiếng Anh, rõ chủ thể, bố cục, ống kính, ánh sáng và chuyển động camera.',
    `Phong cách hình ảnh: ${STYLE_SUFFIX[style] || STYLE_SUFFIX.cinematic}.`,
    `Chuyển động ưu tiên: ${MOTION_PRESETS[motionStyle] || MOTION_PRESETS['slow-zoom']}.`,
    `Mục tiêu video: ${CREATIVE_MODE_CONTEXT[creativeMode] || CREATIVE_MODE_CONTEXT.storyboard}.`,
    `Prompt tham khảo offline: ${local.imagePrompt}`,
  ].join('\n');
  try {
    const res = await withTimeout(fetch(`${TEXT_API}/openai?referrer=${REFERRER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'system', content: system }, { role: 'user', content: `Lời bình cảnh: ${text}` }],
        seed: Math.floor(Math.random() * 1e6),
        referrer: REFERRER,
      }),
    }), 45000, 'Quá thời gian chờ Prompt Lab');
    if (!res.ok) throw new Error(`Prompt Lab trả về ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    const raw = ct.includes('application/json') ? (await res.json())?.choices?.[0]?.message?.content : await res.text();
    const match = String(raw || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Prompt Lab không trả về JSON');
    const parsed = JSON.parse(match[0]);
    if (!parsed.imagePrompt || !parsed.motionPrompt) throw new Error('Prompt chưa đủ trường');
    return {
      imagePrompt: String(parsed.imagePrompt).trim(),
      motionPrompt: String(parsed.motionPrompt).trim(),
      negativePrompt: String(parsed.negativePrompt || local.negativePrompt).trim(),
    };
  } catch (error) {
    service.text = service.text === false ? false : null;
    throw Object.assign(error, { fallback: local });
  }
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
export async function synthesizeVoice(text, voice = 'alloy', {
  tone = 'natural',
  rate = '1',
} = {}) {
  const toneGuide = VOICE_TONES[tone] || VOICE_TONES.natural;
  const body = {
    model: 'openai-audio',
    modalities: ['text', 'audio'],
    audio: { voice, format: 'mp3' },
    messages: [
      { role: 'system', content: `Bạn là giọng đọc video tiếng Việt chân thật. Đọc đúng văn bản, không thêm lời dẫn, không đọc ký hiệu. ${toneGuide}. Tốc độ đọc ${rate}x, ngắt câu tự nhiên, phát âm rõ tên riêng và số.` },
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
