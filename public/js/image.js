'use strict';
/* ════════════════════════════════════════════════════════════════════
 * PhotoAI Studio — Tiện ích xử lý ảnh phía client (canvas 2D):
 * tải file, nén ảnh gửi API, cắt khung, bộ lọc, tăng nét, cân bằng
 * trắng, upscale 2x, tạo ảnh cũ mẫu, tấm in ảnh thẻ.
 * ════════════════════════════════════════════════════════════════════ */
window.PhotoAI = window.PhotoAI || {};

const Img = {
  /* ── Nạp & chuyển đổi cơ bản ───────────────────────────────────── */
  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('Không đọc được file ảnh.'));
      fr.readAsDataURL(file);
    });
  },

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không tải được ảnh.'));
      img.src = url;
    });
  },

  dims(dataUrl) { return this.loadImage(dataUrl).then(i => ({ w: i.naturalWidth, h: i.naturalHeight })); },

  /** Vẽ ảnh vào canvas, co về maxDim (giữ tỉ lệ). */
  async toCanvas(dataUrl, maxDim = 2048) {
    const img = await this.loadImage(dataUrl);
    let w = img.naturalWidth, h = img.naturalHeight;
    const s = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c;
  },

  dataURLtoBase64(dataUrl) {
    const m = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
    return m ? { mime: m[1], base64: m[2] } : null;
  },

  /** Chuẩn bị ảnh gửi Gemini: JPEG ≤ maxDim. */
  async forGemini(dataUrl, maxDim = 2048) {
    const c = await this.toCanvas(dataUrl, maxDim);
    const url = c.toDataURL('image/jpeg', 0.92);
    const p = this.dataURLtoBase64(url);
    return { dataUrl: url, base64: p.base64, mime: p.mime };
  },

  /** Chuẩn bị ảnh gửi OpenAI: Blob PNG. */
  async forOpenAI(dataUrl, maxDim = 2048) {
    const c = await this.toCanvas(dataUrl, maxDim);
    return new Promise((resolve, reject) => {
      c.toBlob(b => b ? resolve(b) : reject(new Error('Không mã hoá được ảnh PNG.')), 'image/png');
    });
  },

  /** Nén ảnh để lưu lịch sử (nhẹ localStorage). */
  async forHistory(dataUrl, maxDim = 1024) {
    const c = await this.toCanvas(dataUrl, maxDim);
    return c.toDataURL('image/jpeg', 0.82);
  },

  /* ── Cắt ảnh theo pixel gốc ─────────────────────────────────────── */
  async crop(dataUrl, rect) {
    const img = await this.loadImage(dataUrl);
    const x = Math.max(0, Math.round(rect.x)), y = Math.max(0, Math.round(rect.y));
    const w = Math.min(img.naturalWidth - x, Math.round(rect.w));
    const h = Math.min(img.naturalHeight - y, Math.round(rect.h));
    if (w < 8 || h < 8) throw new Error('Vùng cắt quá nhỏ.');
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
    return c.toDataURL('image/png');
  },

  /* ── Bộ lọc sáng/tương phản/bão hòa (áp khi tải về) ─────────────── */
  filterCSS(f) {
    return `brightness(${(f.b / 100).toFixed(3)}) contrast(${(f.c / 100).toFixed(3)}) saturate(${(f.s / 100).toFixed(3)})`;
  },
  isFilterDefault(f) { return f.b === 100 && f.c === 100 && f.s === 100; },

  async applyFilters(dataUrl, f) {
    if (this.isFilterDefault(f)) return dataUrl;
    const img = await this.loadImage(dataUrl);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    try { ctx.filter = this.filterCSS(f); } catch { /* trình duyệt cũ: bỏ qua */ }
    ctx.drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  },

  /* ── Tăng nét (convolution 3×3) — offline ───────────────────────── */
  async sharpen(dataUrl, amount = 0.6, maxDim = 1600) {
    const c = await this.toCanvas(dataUrl, maxDim);
    const ctx = c.getContext('2d');
    const src = ctx.getImageData(0, 0, c.width, c.height);
    const d = src.data;
    const out = ctx.createImageData(c.width, c.height);
    const o = out.data;
    const k = amount, kc = 1 + 4 * k;
    const W = c.width, H = c.height;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const c0 = d[i + ch];
          const l = d[(y * W + Math.max(0, x - 1)) * 4 + ch];
          const r = d[(y * W + Math.min(W - 1, x + 1)) * 4 + ch];
          const u = d[(Math.max(0, y - 1) * W + x) * 4 + ch];
          const dn = d[(Math.min(H - 1, y + 1) * W + x) * 4 + ch];
          o[i + ch] = Math.max(0, Math.min(255, kc * c0 - k * (l + r + u + dn)));
        }
        o[i + 3] = d[i + 3];
      }
    }
    ctx.putImageData(out, 0, 0);
    return c.toDataURL('image/png');
  },

  /* ── Cân bằng trắng tự động (gray-world) — offline ──────────────── */
  async autoWhiteBalance(dataUrl, maxDim = 2048) {
    const c = await this.toCanvas(dataUrl, maxDim);
    const ctx = c.getContext('2d');
    const im = ctx.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    let sr = 0, sg = 0, sb = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; }
    const avg = (sr + sg + sb) / (3 * n) || 1;
    const kr = Math.min(2.2, Math.max(0.45, avg / (sr / n || 1)));
    const kg = Math.min(2.2, Math.max(0.45, avg / (sg / n || 1)));
    const kb = Math.min(2.2, Math.max(0.45, avg / (sb / n || 1)));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] * kr); d[i + 1] = Math.min(255, d[i + 1] * kg); d[i + 2] = Math.min(255, d[i + 2] * kb);
    }
    ctx.putImageData(im, 0, 0);
    return c.toDataURL('image/png');
  },

  /* ── Upscale 2× (nội suy chất lượng cao + nét nhẹ) — offline ─────── */
  async upscale2x(dataUrl) {
    const img = await this.loadImage(dataUrl);
    const s = 2;
    let w = img.naturalWidth * s, h = img.naturalHeight * s;
    const cap = 4096, k = Math.min(1, cap / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return this.sharpen(c.toDataURL('image/png'), 0.32, 4096);
  },

  /* ── Tạo "ảnh cũ mẫu" từ ảnh thường (để thử tính năng phục hồi) ─── */
  async makeOldPhotoSample(dataUrl) {
    const c = await this.toCanvas(dataUrl, 1400);
    const ctx = c.getContext('2d');
    // Sepia + phai màu
    const img = await this.loadImage(dataUrl);
    const t = document.createElement('canvas');
    t.width = c.width; t.height = c.height;
    const tc = t.getContext('2d');
    try { tc.filter = 'sepia(0.75) contrast(0.88) brightness(0.96) saturate(0.7)'; } catch { /* noop */ }
    tc.drawImage(img, 0, 0, t.width, t.height);
    ctx.drawImage(t, 0, 0);
    // Nhiễu hạt
    const im = ctx.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const nz = (Math.random() - 0.5) * 34;
      d[i] += nz; d[i + 1] += nz; d[i + 2] += nz;
      if (Math.random() < 0.004) { d[i] = d[i + 1] = d[i + 2] = Math.random() < 0.5 ? 255 : 20; }
    }
    ctx.putImageData(im, 0, 0);
    // Vết xước dọc
    ctx.strokeStyle = 'rgba(255,250,235,0.55)';
    for (let s = 0; s < 7; s++) {
      const x = Math.random() * c.width;
      ctx.lineWidth = Math.random() * 1.6 + 0.4;
      ctx.beginPath(); ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 8, c.height * 0.3, x - 8, c.height * 0.6, x + 4, c.height);
      ctx.stroke();
    }
    // Nếp gấp ngang + tối góc
    ctx.fillStyle = 'rgba(60,45,30,0.18)';
    ctx.fillRect(0, c.height * (0.3 + Math.random() * 0.4), c.width, 3);
    const g = ctx.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35,
      c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,25,10,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  },

  /* ── Tấm in ảnh thẻ (300 DPI) ─────────────────────────────────────
   * photo: 3x4cm hoặc 4x6cm · paper: 10x15 / 13x18 / A4 */
  async printSheet(photoDataURL, { photo = '3x4', paper = '10x15', dpi = 300 } = {}) {
    const MM = dpi / 25.4;
    const PHOTOS = { '3x4': [30, 40], '4x6': [40, 60] };
    const PAPERS = { '10x15': [100, 150], '13x18': [130, 180], 'A4': [210, 297] };
    const [pw, ph] = PHOTOS[photo] || PHOTOS['3x4'];
    const [PW, PH] = PAPERS[paper] || PAPERS['10x15'];
    const margin = 4 * MM, gap = 2.5 * MM;
    const img = await this.loadImage(photoDataURL);
    // Cắt ảnh về đúng tỉ lệ ảnh thẻ (lấy giữa)
    const targetRatio = pw / ph, srcRatio = img.naturalWidth / img.naturalHeight;
    let sw, sh, sx, sy;
    if (srcRatio > targetRatio) { sh = img.naturalHeight; sw = sh * targetRatio; sx = (img.naturalWidth - sw) / 2; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / targetRatio; sx = 0; sy = (img.naturalHeight - sh) / 2; }
    const c = document.createElement('canvas');
    c.width = Math.round(PW * MM); c.height = Math.round(PH * MM);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    const cw = pw * MM, ch = ph * MM;
    const cols = Math.max(1, Math.floor((c.width - margin * 2 + gap) / (cw + gap)));
    const rows = Math.max(1, Math.floor((c.height - margin * 2 + gap) / (ch + gap)));
    const ox = (c.width - (cols * cw + (cols - 1) * gap)) / 2;
    const oy = (c.height - (rows * ch + (rows - 1) * gap)) / 2;
    ctx.imageSmoothingQuality = 'high';
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const dx = ox + q * (cw + gap), dy = oy + r * (ch + gap);
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, cw, ch);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, dpi / 150);
        ctx.strokeRect(dx, dy, cw, ch);
      }
    }
    return { dataUrl: c.toDataURL('image/jpeg', 0.95), cols, rows, count: cols * rows, w: c.width, h: c.height };
  },

  /* ── Tải file về máy ────────────────────────────────────────────── */
  download(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  },
};

PhotoAI.Img = Img;
