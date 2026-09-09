'use strict';
/* ════════════════════════════════════════════════════════════════════
 * PhotoAI Studio — Client gọi API ảnh AI trực tiếp từ trình duyệt.
 *  • Gemini (Google AI Studio): generateContent + inline_data
 *  • OpenAI GPT Image: POST /v1/images/edits (multipart)
 * API key do người dùng nhập, chỉ lưu ở localStorage của trình duyệt.
 * ════════════════════════════════════════════════════════════════════ */
window.PhotoAI = window.PhotoAI || {};

const GEMINI_HOST = 'https://generativelanguage.googleapis.com';
const OPENAI_HOST = 'https://api.openai.com';

/* Đọc lỗi HTTP thành message thân thiện tiếng Việt */
async function readApiError(res) {
  let msg = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    msg = j?.error?.message || msg;
  } catch { /* bỏ qua */ }
  return msg;
}

function friendlyError(provider, status, raw) {
  const r = String(raw || '');
  if (provider === 'gemini') {
    if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(r)) return 'API key Gemini không hợp lệ. Hãy kiểm tra lại key trong Cài đặt.';
    if (status === 403) return 'API key Gemini bị từ chối (403). Key có thể sai hoặc chưa bật Generative Language API.';
    if (status === 404) return 'Model Gemini không tồn tại (404). Hãy thử model khác trong Cài đặt.';
    if (status === 429) return 'Gemini báo hết quota / quá nhiều request (429). Đợi vài phút rồi thử lại, hoặc dùng key khác.';
    if (/block|SAFETY|PROHIBITED/i.test(r)) return 'Ảnh bị bộ lọc an toàn của Gemini chặn. Hãy thử ảnh khác hoặc giảm mô tả nhạy cảm.';
  } else {
    if (status === 401) return 'API key OpenAI không đúng (401). Kiểm tra key bắt đầu bằng "sk-" trong Cài đặt.';
    if (status === 403) return 'Key OpenAI bị từ chối hoặc quốc gia/tài khoản không được hỗ trợ (403).';
    if (status === 404) return 'Model GPT Image không khả dụng (404). Tài khoản có thể chưa được cấp quyền model này.';
    if (status === 429) return 'OpenAI báo hết quota / quá tải (429). Kiểm tra số dư tài khoản hoặc thử lại sau.';
    if (/content policy|moderation|safety/i.test(r)) return 'Ảnh bị kiểm duyệt nội dung của OpenAI chặn. Hãy thử ảnh khác.';
  }
  if (status === 0) return 'Không kết nối được tới máy chủ AI. Kiểm tra mạng / VPN rồi thử lại.';
  return `Lỗi ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} (${status}): ${r.slice(0, 220)}`;
}

/* ── GEMINI ────────────────────────────────────────────────────────── */
PhotoAI.Gemini = {
  models: [
    { v: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image — Nhanh, rẻ (khuyên dùng)' },
    { v: 'gemini-3-pro-image', label: 'Gemini 3 Pro Image — Chất lượng cao nhất' },
    { v: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image — Mới, cân bằng' },
  ],
  textModel: 'gemini-2.5-flash',

  /** Chỉnh sửa/的最佳 là tạo ảnh từ ảnh + prompt. images: [{base64, mime}] */
  async edit({ key, model, prompt, images, signal }) {
    const url = `${GEMINI_HOST}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const parts = [{ text: prompt }];
    for (const im of images) parts.push({ inline_data: { mime_type: im.mime, data: im.base64 } });
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
      });
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      throw new Error('Không kết nối được tới Gemini. Kiểm tra mạng / VPN rồi thử lại.');
    }
    if (!res.ok) throw new Error(friendlyError('gemini', res.status, await readApiError(res)));
    const json = await res.json().catch(() => ({}));
    if (json?.promptFeedback?.blockReason) {
      throw new Error('Ảnh bị bộ lọc an toàn của Gemini chặn (' + json.promptFeedback.blockReason + '). Hãy thử ảnh khác.');
    }
    const parts2 = json?.candidates?.[0]?.content?.parts || [];
    let text = '';
    for (const p of parts2) {
      if (p.inlineData?.data) {
        const mime = p.inlineData.mimeType || 'image/png';
        return { imageUrl: `data:${mime};base64,${p.inlineData.data}`, text };
      }
      if (p.text) text += p.text;
    }
    throw new Error('Gemini không trả về ảnh. ' + (text ? 'Model nói: ' + text.slice(0, 200) : 'Hãy thử lại hoặc đổi model.'));
  },

  /** Gọi model chữ (phân tích ảnh → gợi ý JSON) */
  async askText({ key, prompt, image, signal }) {
    const url = `${GEMINI_HOST}/v1beta/models/${this.textModel}:generateContent`;
    const res = await fetch(url, {
      method: 'POST', signal,
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: image.mime, data: image.base64 } }] }] }),
    }).catch(e => { if (e?.name === 'AbortError') throw e; throw new Error('Không kết nối được tới Gemini.'); });
    if (!res.ok) throw new Error(friendlyError('gemini', res.status, await readApiError(res)));
    const json = await res.json().catch(() => ({}));
    return (json?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  },

  /** Kiểm tra key: liệt kê model (nhẹ) */
  async test(key) {
    const res = await fetch(`${GEMINI_HOST}/v1beta/models?pageSize=2`, {
      headers: { 'x-goog-api-key': key },
    }).catch(() => null);
    if (!res) throw new Error('Không kết nối được tới Google. Kiểm tra mạng / VPN.');
    if (!res.ok) throw new Error(friendlyError('gemini', res.status, await readApiError(res)));
    return true;
  },
};

/* ── OPENAI GPT IMAGE ──────────────────────────────────────────────── */
PhotoAI.OpenAI = {
  models: [
    { v: 'gpt-image-1', label: 'GPT Image 1 — Ổn định' },
    { v: 'gpt-image-1.5', label: 'GPT Image 1.5 — Mới hơn, đẹp hơn' },
  ],
  sizes: [
    { v: 'auto', label: 'Tự động (theo ảnh gốc)' },
    { v: '1024x1536', label: 'Dọc 1024×1536 (chân dung)' },
    { v: '1536x1024', label: 'Ngang 1536×1024 (phong cảnh)' },
    { v: '1024x1024', label: 'Vuông 1024×1024' },
  ],
  qualities: [
    { v: 'auto', label: 'Tự động' },
    { v: 'low', label: 'Thấp — nhanh, rẻ (thử nghiệm)' },
    { v: 'medium', label: 'Vừa — cân bằng (khuyên dùng)' },
    { v: 'high', label: 'Cao — đẹp nhất, chậm' },
  ],

  /** images/edits: imageBlob (PNG) + prompt */
  async edit({ key, model, prompt, imageBlob, size = 'auto', quality = 'auto', fidelity = 'high', signal }) {
    const form = new FormData();
    form.append('model', model);
    form.append('image', imageBlob, 'input.png');
    form.append('prompt', prompt);
    if (size && size !== 'auto') form.append('size', size);
    if (quality && quality !== 'auto') form.append('quality', quality);
    if (fidelity && fidelity !== 'auto') form.append('input_fidelity', fidelity);
    let res;
    try {
      res = await fetch(`${OPENAI_HOST}/v1/images/edits`, {
        method: 'POST', signal,
        headers: { Authorization: 'Bearer ' + key },
        body: form,
      });
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      throw new Error('Không kết nối được tới OpenAI. Kiểm tra mạng / VPN rồi thử lại.');
    }
    if (!res.ok) throw new Error(friendlyError('openai', res.status, await readApiError(res)));
    const json = await res.json().catch(() => ({}));
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI không trả về ảnh. Hãy thử lại hoặc đổi model.');
    return { imageUrl: 'data:image/png;base64,' + b64 };
  },

  async test(key) {
    const res = await fetch(`${OPENAI_HOST}/v1/models`, {
      headers: { Authorization: 'Bearer ' + key },
    }).catch(() => null);
    if (!res) throw new Error('Không kết nối được tới OpenAI. Kiểm tra mạng / VPN.');
    if (!res.ok) throw new Error(friendlyError('openai', res.status, await readApiError(res)));
    return true;
  },
};

/* ── POLLINATIONS (miễn phí, KHÔNG cần key) ───────────────────────────
 * Sửa ảnh qua GET image.pollinations.ai/prompt/...?model=kontext&image=URL
 * Lưu ý: tham số image phải là URL ảnh công khai → app tự upload ảnh lên
 * host ẩn danh, nếu thất bại sẽ hỏi người dùng dán link ảnh. */
PhotoAI.Pollinations = {
  models: [
    { v: 'kontext', label: 'Kontext — Sửa ảnh theo mô tả (khuyên dùng)' },
    { v: 'flux', label: 'FLUX — Sáng tạo, chi tiết cao' },
    { v: 'turbo', label: 'Turbo — Siêu nhanh' },
    { v: 'tongyi-mai/z-image-turbo', label: 'Z-Image Turbo — Model mới' },
    { v: 'gptimage', label: 'GPT Image (Beta — có thể hết lượt)' },
  ],

  buildUrl({ prompt, imageUrl, model = 'kontext', width = 1024, height = 1024, seed }) {
    const s = seed ?? Math.floor(Math.random() * 1000000000);
    const q = new URLSearchParams({
      model, image: imageUrl,
      width: String(width), height: String(height),
      seed: String(s), private: 'true', nologo: 'true', referrer: 'photoai-studio',
    });
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${q.toString()}`;
  },

  errMsg(status, raw) {
    const r = String(raw || '');
    if (status === 0) return 'Không kết nối được tới Pollinations. Kiểm tra mạng rồi thử lại.';
    if (/402|payment|limit|quota|tier|api key|unauthorized|401|forbidden|403/i.test(r))
      return 'Model này trên Pollinations đã hết lượt miễn phí hoặc cần key. Hãy đổi model Kontext / FLUX / Turbo.';
    if (status >= 500 || /overload|timeout|524|504|bad gateway|unavailable/i.test(r))
      return 'Pollinations đang quá tải (server miễn phí). Đợi 1–2 phút rồi thử lại, hoặc đổi model khác.';
    if (!r) return 'Pollinations không trả về ảnh. Hãy thử lại hoặc đổi model.';
    return `Lỗi Pollinations (${status}): ${r.slice(0, 220)}`;
  },

  async edit({ imageUrl, prompt, model, width, height, signal }) {
    const url = this.buildUrl({ prompt, imageUrl, model, width, height });
    let res;
    try {
      res = await fetch(url, { signal });
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      throw new Error(this.errMsg(0, ''));
    }
    if (!res.ok) throw new Error(this.errMsg(res.status, await res.text().catch(() => '')));
    const blob = await res.blob().catch(() => null);
    if (!blob || !String(blob.type || '').startsWith('image/')) {
      const t = blob ? await blob.text().catch(() => '') : '';
      throw new Error(this.errMsg(200, t));
    }
    // Đổi sang dataURL để cắt/lọc/tải về không bị vướng CORS.
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('decode'));
        fr.readAsDataURL(blob);
      });
      return { imageUrl: dataUrl };
    } catch {
      return { imageUrl: url, remote: true }; // fallback: dùng link trực tiếp
    }
  },

  async test() {
    const res = await fetch('https://image.pollinations.ai/models').catch(() => null);
    if (!res || !res.ok) throw new Error('Không kết nối được tới Pollinations. Kiểm tra mạng rồi thử lại.');
    return true;
  },
};

/* ── Upload ảnh ẩn danh (lấy link công khai cho Pollinations) ─────────
 * Thử lần lượt nhiều host miễn phí; host nào chặn CORS từ trình duyệt
 * sẽ tự bỏ qua. Thất bại hết → caller mở hộp dán link tay. */
PhotoAI.AnonUpload = {
  async upload(blob) {
    const jobs = [
      async (sig) => { // 0x0.st — trả về URL dạng text
        const f = new FormData();
        f.append('file', blob, 'photo.jpg');
        const r = await fetch('https://0x0.st', { method: 'POST', body: f, signal: sig });
        const t = (await r.text()).trim();
        if (!r.ok || !/^https?:\/\//.test(t)) throw new Error('bad');
        return t;
      },
      async (sig) => { // uguu.se — JSON {files:[{url}]}
        const f = new FormData();
        f.append('files[]', blob, 'photo.jpg');
        const r = await fetch('https://uguu.se/upload.php', { method: 'POST', body: f, signal: sig });
        const j = await r.json();
        const u = j?.files?.[0]?.url;
        if (!r.ok || !/^https?:\/\//.test(u || '')) throw new Error('bad');
        return u;
      },
      async (sig) => { // tmpfiles.org — JSON, link trực tiếp qua /dl/
        const f = new FormData();
        f.append('file', blob, 'photo.jpg');
        const r = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: f, signal: sig });
        const j = await r.json();
        let u = j?.data?.url || '';
        if (!r.ok || !/^https?:\/\//.test(u)) throw new Error('bad');
        u = u.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
        return u;
      },
      async (sig) => { // catbox.moe — trả về URL dạng text
        const f = new FormData();
        f.append('reqtype', 'fileupload');
        f.append('fileToUpload', blob, 'photo.jpg');
        const r = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: f, signal: sig });
        const t = (await r.text()).trim();
        if (!r.ok || !/^https?:\/\//.test(t)) throw new Error('bad');
        return t;
      },
    ];
    for (const job of jobs) {
      const c = new AbortController();
      const to = setTimeout(() => c.abort(), 30000);
      try {
        const u = await job(c.signal);
        clearTimeout(to);
        if (/^https?:\/\//.test(u)) return u;
      } catch { clearTimeout(to); /* thử host kế */ }
    }
    throw new Error('UPLOAD_FAILED');
  },
};

/* ── HUGGING FACE Inference Providers (token miễn phí) ───────────────
 * Docs: huggingface.co/docs/inference-providers/tasks/image-to-image
 * POST router.huggingface.co/hf-inference/models/{model}
 * Body: {inputs: base64_ảnh, parameters:{prompt, negative_prompt, target_size}}
 * Trả về: bytes ảnh. Model chưa nạp (503) → tự chờ & thử lại. */
PhotoAI.HF = {
  models: [
    { v: 'black-forest-labs/FLUX.1-Kontext-dev', label: 'FLUX Kontext-dev — Sửa ảnh mạnh (khuyên dùng)' },
    { v: 'Qwen/Qwen-Image-Edit', label: 'Qwen Image Edit — Nhẹ, nhanh' },
    { v: 'Qwen/Qwen-Image-Edit-2509', label: 'Qwen Image Edit 2509 — Bản mới' },
  ],

  errMsg(status, raw) {
    const r = String(raw || '');
    if (status === 401 || /invalid.*token|unauthorized/i.test(r))
      return 'Token Hugging Face không đúng hoặc thiếu quyền Inference (401). Tạo token mới tại huggingface.co/settings/tokens.';
    if (status === 402 || /credit|payment/i.test(r))
      return 'Tài khoản HF đã hết credit Inference miễn phí (402). Đợi tháng sau, hoặc dùng Gemini / Pollinations.';
    if (status === 403 || /gated/i.test(r))
      return 'Model bị giới hạn truy cập (gated). Hãy mở trang model trên HF để chấp nhận điều khoản, hoặc đổi model Qwen.';
    if (status === 404) return 'Không tìm thấy model trên HF (404). Hãy thử model khác trong danh sách.';
    if (status === 429) return 'HF giới hạn lượt gọi (429). Đợi vài phút rồi thử lại.';
    if (status === 0) return 'Không kết nối được tới Hugging Face. Kiểm tra mạng / VPN.';
    if (!r) return 'Hugging Face không trả về ảnh. Hãy thử lại hoặc đổi model.';
    return `Lỗi Hugging Face (${status}): ${r.slice(0, 220)}`;
  },

  async edit({ token, model, prompt, negative, base64, width, height, signal, onTick }) {
    const body = {
      inputs: base64,
      parameters: {
        prompt,
        negative_prompt: negative || 'blurry, ugly, distorted face, deformed, watermark, text, low quality',
        target_size: { width, height },
      },
    };
    const urls = [
      `https://router.huggingface.co/hf-inference/models/${model}`,
      `https://api-inference.huggingface.co/models/${model}`,
    ];
    let lastErr = null;
    for (const url of urls) {
      try {
        return await this._once(url, token, body, signal, onTick, 0);
      } catch (e) {
        if (e?.name === 'AbortError') throw e;
        lastErr = e;
        if (!/404|410/i.test(e.message || '')) throw e; // chỉ thử host kế khi 404/410
      }
    }
    throw lastErr;
  },

  async _once(url, token, body, signal, onTick, waited) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST', signal,
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      throw new Error(this.errMsg(0, ''));
    }
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('image/')) {
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('decode'));
        fr.readAsDataURL(blob);
      });
      return { imageUrl: dataUrl };
    }
    const j = await res.json().catch(() => ({}));
    const msg = j.error || j.message || '';
    if (res.status === 503 && waited < 150000) { // model đang nạp → chờ rồi thử lại
      const wait = Math.min(20000, Math.max(3000, Math.round((j.estimated_time || 12) * 1000)));
      if (onTick) onTick(`Model HF đang nạp, tự chờ ~${Math.round(wait / 1000)}s rồi thử lại…`);
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, wait);
        if (signal) signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      });
      return this._once(url, token, body, signal, onTick, waited + wait);
    }
    throw new Error(this.errMsg(res.status, msg));
  },

  async test(token) {
    const res = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: { Authorization: 'Bearer ' + token },
    }).catch(() => null);
    if (!res) throw new Error(this.errMsg(0, ''));
    if (!res.ok) throw new Error(this.errMsg(res.status, ''));
    return true;
  },
};
