/* ─────────────────────────────────────────────
   art.js — ảnh thủ tục (procedural art),
   nhận diện chủ đề, thư viện ảnh nền
   ───────────────────────────────────────────── */

import { mulberry32, clamp } from './util.js';

/**
 * Bảng chủ đề: từ khoá (tiếng Việt + tiếng Anh) → ảnh thư viện + bảng màu.
 * `lib` trỏ tới file trong /public/library (ảnh do AI tạo sẵn, chạy offline).
 */
export const THEMES = {
  tech: {
    label: 'Công nghệ', lib: 'tech.jpg', en: 'futuristic technology, glowing circuits, digital innovation',
    palette: ['#050d1f', '#0a2540', '#22d3ee', '#3b82f6', '#8b5cf6'],
    keywords: ['công nghệ', 'cong nghe', 'ai', 'trí tuệ', 'tri tue', 'nhân tạo', 'nhan tao', 'machine learning', 'robot', 'code', 'lập trình', 'lap trinh', 'số hóa', 'so hoa', 'digital', 'tech', 'data', 'dữ liệu', 'du lieu', 'internet', 'app', 'phần mềm', 'phan mem', 'máy tính', 'may tinh', 'tự động', 'tu dong', 'automation', 'startup công nghệ', 'blockchain', 'crypto', 'chatbot', 'chatgpt'],
  },
  nature: {
    label: 'Thiên nhiên', lib: 'nature.jpg', en: 'misty green mountains, serene forest at sunrise',
    palette: ['#071a10', '#0e3b24', '#34d399', '#a3e635', '#fbbf24'],
    keywords: ['thiên nhiên', 'thien nhien', 'rừng', 'rung', 'cây', 'cay', 'hoa', 'núi', 'nui', 'đồi', 'doi', 'xanh', 'môi trường', 'moi truong', 'khí hậu', 'khi hau', 'green', 'forest', 'mountain', 'nature', 'mưa', 'mua', 'sương', 'suong', 'đông vật', 'dong vat', 'thú', 'thu', 'chim', 'trời', 'troi', 'mặt trời', 'mat troi', 'hoa', 'lá', 'la', 'vuờn', 'nông nghiệp', 'nong nghiep'],
  },
  city: {
    label: 'Thành phố', lib: 'city.jpg', en: 'modern city skyline at night, neon lights, urban life',
    palette: ['#0a0714', '#1e1033', '#c084fc', '#f472b6', '#38bdf8'],
    keywords: ['thành phố', 'thanh pho', 'phố', 'pho', 'đường', 'duong', 'giao thông', 'giao thong', 'city', 'urban', 'neon', 'đêm', 'dem', 'sài gòn', 'sai gon', 'hà nội', 'ha noi', 'đà nẵng', 'da nang', 'tokyo', 'new york', 'quảng trường', 'quang truong', 'nhà cao tầng', 'cao tầng', 'khu đô thị', 'do thi'],
  },
  ocean: {
    label: 'Biển cả', lib: 'ocean.jpg', en: 'turquoise ocean waves, aerial sea view, sunlight on water',
    palette: ['#031527', '#075985', '#22d3ee', '#67e8f9', '#fbbf24'],
    keywords: ['biển', 'bien', 'nước', 'nuoc', 'sóng', 'song', 'ocean', 'sea', 'hồ', 'ho', 'sông', 'song nuoc', 'cá', 'ca', 'tàu', 'tau', 'thuyền', 'thuyen', 'hải', 'hai', 'đại dương', 'dai duong', 'bơi', 'boi', 'lặn', 'lan', 'san hô', 'san ho'],
  },
  space: {
    label: 'Vũ trụ', lib: 'space.jpg', en: 'deep space nebula, stars and galaxies, cosmic scene',
    palette: ['#070312', '#1b0b33', '#a855f7', '#ec4899', '#facc15'],
    keywords: ['vũ trụ', 'vu tru', 'không gian', 'khong gian', 'sao', 'sao trời', 'hành tinh', 'hanh tinh', 'space', 'galaxy', 'thiên hà', 'thien ha', 'mặt trăng', 'mat trang', 'trăng', 'trang', 'mars', 'sao hỏa', 'sao hoa', 'vệ tinh', 've tinh', 'tên lửa', 'ten lua', 'rocket', 'khoa học', 'khoa hoc', 'vật lý', 'vat ly'],
  },
  business: {
    label: 'Kinh doanh', lib: 'business.jpg', en: 'modern office, business growth, professional workspace',
    palette: ['#12100c', '#2a2318', '#f59e0b', '#fbbf24', '#e7e5e4'],
    keywords: ['kinh doanh', 'kinh doanh', 'business', 'doanh nghiệp', 'doanh nghiep', 'công ty', 'cong ty', 'startup', 'tiền', 'tien', 'marketing', 'bán hàng', 'ban hang', 'khách hàng', 'khach hang', 'quản lý', 'quan ly', 'lãnh đạo', 'lanh dao', 'tài chính', 'tai chinh', 'đầu tư', 'dau tu', 'chứng khoán', 'chung khoan', 'văn phòng', 'van phong', 'nhân viên', 'nhan vien'],
  },
  food: {
    label: 'Ẩm thực', lib: 'food.jpg', en: 'delicious food flat lay, moody restaurant lighting, culinary',
    palette: ['#170d08', '#3b1d10', '#f97316', '#ef4444', '#fbbf24'],
    keywords: ['đồ ăn', 'do an', 'món', 'mon', 'ẩm thực', 'am thuc', 'food', 'ăn', 'an', 'ngon', 'nấu', 'nau', 'chef', 'đầu bếp', 'dau bep', 'nhà hàng', 'nha hang', 'quán', 'quan', 'cafe', 'cà phê', 'ca phe', 'trà', 'tra', 'bánh', 'banh', 'phở', 'pho', 'bún', 'bun', 'cơm', 'com', 'hải sản', 'hai san', 'street food'],
  },
  education: {
    label: 'Học tập', lib: 'education.jpg', en: 'books and warm study lamp, knowledge and learning',
    palette: ['#140f06', '#33230d', '#f59e0b', '#84cc16', '#fde68a'],
    keywords: ['học', 'hoc', 'giáo dục', 'giao duc', 'study', 'school', 'trường', 'truong', 'lớp', 'lop', 'sách', 'sach', 'book', 'kiến thức', 'kien thuc', 'thi', 'kiểm tra', 'kiem tra', 'học sinh', 'hoc sinh', 'sinh viên', 'sinh vien', 'giáo viên', 'giao vien', 'bài tập', 'bai tap', 'ôn', 'on', 'từ vựng', 'tu vung', 'ngôn ngữ', 'ngon ngu'],
  },
  health: {
    label: 'Sức khỏe', lib: 'health.jpg', en: 'calm wellness, healthy lifestyle, fresh morning light',
    palette: ['#061412', '#0c3b32', '#2dd4bf', '#a7f3d0', '#34d399'],
    keywords: ['sức khỏe', 'suc khoe', 'health', 'y tế', 'y te', 'bệnh', 'benh', 'bác sĩ', 'bac si', 'thể thao', 'the thao', 'gym', 'yoga', 'thiền', 'thien', 'tập', 'tap', 'chạy', 'chay', 'dinh dưỡng', 'dinh duong', 'ngủ', 'ngu', 'giấc', 'giac', 'tinh thần', 'tinh than', 'lối sống', 'loi song', 'chữa', 'chua', 'thuốc', 'thuoc'],
  },
  travel: {
    label: 'Du lịch', lib: 'ocean.jpg', en: 'tropical travel destination, beautiful landscape, adventure',
    palette: ['#031527', '#0b4f6c', '#06b6d4', '#f59e0b', '#34d399'],
    keywords: ['du lịch', 'du lich', 'travel', 'phượt', 'phuot', 'nghỉ dưỡng', 'nghi duong', 'resort', 'khách sạn', 'khach san', 'beach', 'biển', 'bien', 'hành trình', 'hanh trinh', 'chuyến', 'chuyen', 'tham quan', 'khám phá', 'kham pha', 'điểm đến', 'diem den', 'visa', 'sân bay', 'san bay', 'máy bay', 'may bay'],
  },
  warm: {
    label: 'Ấm áp', lib: null, en: 'abstract warm golden art, elegant flowing shapes',
    palette: ['#1a0e06', '#3f2410', '#f59e0b', '#fb923c', '#fde68a'],
    keywords: [],
  },
  cool: {
    label: 'Lạnh lùng', lib: null, en: 'abstract cool violet art, elegant flowing shapes',
    palette: ['#0a0f1f', '#132048', '#818cf8', '#38bdf8', '#c084fc'],
    keywords: [],
  },
};

/** Chủ đề mặc định xoay vòng khi không nhận diện được */
const DEFAULT_CYCLE = ['warm', 'cool', 'nature', 'space', 'ocean'];

/** Chuẩn hoá text: bỏ dấu tiếng Việt để khớp từ khoá dễ hơn */
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/** Nhận diện chủ đề từ văn bản cảnh */
export function detectTheme(text, fallbackIndex = 0) {
  const t = normalize(text);
  let best = null, bestScore = 0;
  for (const [key, th] of Object.entries(THEMES)) {
    let score = 0;
    for (const kw of th.keywords) {
      if (t.includes(normalize(kw))) score += kw.length > 4 ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; best = key; }
  }
  if (best) return best;
  return DEFAULT_CYCLE[fallbackIndex % DEFAULT_CYCLE.length];
}

/* ────────── màu sắc ────────── */

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Vẽ ảnh "cover" (giữ tỉ lệ, phủ kín, cắt phần thừa) */
export function drawCover(ctx, img, x, y, w, h) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Tải ảnh → Promise<HTMLImageElement> */
export function loadImage(src, { cors = false, timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      img.src = ''; reject(new Error('Tải ảnh quá lâu'));
    }, timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Không tải được ảnh')); };
    img.src = src;
  });
}

/**
 * Chuẩn hoá 1 ảnh nền thành canvas kích thước (w × h):
 * cover-crop + phủ lớp màu chủ đề mờ + vignette cho chữ dễ đọc.
 */
export function makeSceneCanvas(img, w, h, themeKey, seed = 1) {
  const r = mulberry32(seed);
  const pal = (THEMES[themeKey] || THEMES.warm).palette;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');

  if (img) {
    drawCover(x, img, 0, 0, w, h);
  } else {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }

  // Lớp màu chủ đề rất nhẹ để đồng điệu tông màu
  x.save();
  x.globalCompositeOperation = 'soft-light';
  x.globalAlpha = 0.55;
  const gg = x.createLinearGradient(0, 0, w * (0.4 + r() * 0.6), h);
  gg.addColorStop(0, hexA(pal[2], 0.5));
  gg.addColorStop(1, hexA(pal[3], 0.25));
  x.fillStyle = gg; x.fillRect(0, 0, w, h);
  x.restore();

  // Vignette
  const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  x.fillStyle = v; x.fillRect(0, 0, w, h);

  return c;
}

/**
 * Sinh ảnh trừu tượng "AI-style" hoàn toàn thủ tục (offline, không cần mạng).
 * Gradient nền + các khối sáng mềm + vệt sáng + hạt nhiễu.
 */
export function makeProceduralArt(w, h, seed, themeKey = 'cool') {
  const r = mulberry32(seed >>> 0);
  const pal = (THEMES[themeKey] || THEMES.cool).palette;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');

  // Nền gradient chéo
  const g = x.createLinearGradient(0, 0, w * (0.3 + r() * 0.7), h);
  g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
  x.fillStyle = g; x.fillRect(0, 0, w, h);

  // Các "blob" sáng mềm
  x.globalCompositeOperation = 'screen';
  const nBlobs = 6 + Math.floor(r() * 4);
  for (let i = 0; i < nBlobs; i++) {
    const cx = r() * w, cy = r() * h;
    const rad = (0.22 + r() * 0.45) * Math.max(w, h);
    const col = pal[2 + Math.floor(r() * (pal.length - 2))];
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, hexA(col, 0.32 + r() * 0.25));
    rg.addColorStop(0.55, hexA(col, 0.10));
    rg.addColorStop(1, hexA(col, 0));
    x.fillStyle = rg;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }

  // Vệt sáng cong (aurora)
  x.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const col = pal[2 + Math.floor(r() * (pal.length - 2))];
    const y0 = r() * h;
    const lg = x.createLinearGradient(0, y0, w, y0 + (r() - 0.5) * h * 0.6);
    lg.addColorStop(0, hexA(col, 0));
    lg.addColorStop(0.5, hexA(col, 0.22));
    lg.addColorStop(1, hexA(col, 0));
    x.strokeStyle = lg;
    x.lineWidth = (0.05 + r() * 0.1) * Math.min(w, h);
    x.shadowColor = hexA(col, 0.5);
    x.shadowBlur = 40;
    x.beginPath();
    x.moveTo(-w * 0.05, y0);
    x.bezierCurveTo(w * 0.3, y0 - h * (0.1 + r() * 0.25), w * 0.6, y0 + h * (0.1 + r() * 0.25), w * 1.05, y0 + (r() - 0.5) * h * 0.4);
    x.stroke();
  }
  x.shadowBlur = 0;

  // Hạt nhiễu (grain) — vẽ từ canvas nhỏ cho nhanh
  const gn = document.createElement('canvas');
  const gs = 3; // mỗi pixel grain phủ 3×3
  gn.width = Math.ceil(w / gs); gn.height = Math.ceil(h / gs);
  const gx = gn.getContext('2d');
  const id = gx.createImageData(gn.width, gn.height);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 118 + Math.floor(r() * 74);
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  gx.putImageData(id, 0, 0);
  x.globalCompositeOperation = 'overlay';
  x.globalAlpha = 0.10;
  x.imageSmoothingEnabled = true;
  x.drawImage(gn, 0, 0, w, h);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';

  // Vignette
  const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  x.fillStyle = v; x.fillRect(0, 0, w, h);

  return c;
}

/** Danh sách ảnh thư viện để hiển thị trong modal chọn */
export const LIBRARY_LIST = Object.entries(THEMES)
  .filter(([, t]) => t.lib)
  .map(([key, t]) => ({ key, label: t.label, src: `/library/${t.lib}` }));
