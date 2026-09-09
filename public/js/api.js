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
