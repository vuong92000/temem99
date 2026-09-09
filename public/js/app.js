'use strict';
/* ════════════════════════════════════════════════════════════════════
 * PhotoAI Studio — Điều phối giao diện & luồng xử lý AI.
 * 4 engine: ✨ Gemini Free (xoay key) · 🌸 Pollinations Free (không key)
 *           🤗 HF Free (token free) · 🤖 GPT Pro (trả phí).
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  const { PRESETS, Gemini, OpenAI, Pollinations, AnonUpload, HF, Img } = window.PhotoAI;

  /* ── Helpers ───────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const store = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* đầy bộ nhớ: bỏ qua */ } },
  };
  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 4200);
  }

  /* ── State ─────────────────────────────────────────────────────── */
  const PROVIDERS = {
    gemini: { icon: '✨', name: 'Gemini Free' },
    pollinations: { icon: '🌸', name: 'Pollinations Free' },
    hf: { icon: '🤗', name: 'HF Free (Beta)' },
    openai: { icon: '🤖', name: 'GPT Pro' },
  };
  const TOOLS = {
    home: { badge: '🏠 Tổng quan', gen: '⚡ Xử lý bằng AI', hint: 'Chọn công cụ ở menu trái, tải ảnh lên để bắt đầu.' },
    id: { badge: '🪪 Ảnh thẻ AI', gen: '⚡ Tạo ảnh thẻ AI', hint: 'Chỉnh tùy chọn bên trái → nhấn nút để AI thay trang phục, nền, tóc.' },
    light: { badge: '💡 Ánh sáng AI', gen: '⚡ Áp dụng ánh sáng AI', hint: 'Chọn kiểu sáng (có thể kết hợp tự mô tả) → nhấn nút chạy.' },
    restore: { badge: '🕰️ Phục hồi ảnh cũ', gen: '⚡ Phục hồi ảnh bằng AI', hint: 'Tick các tính năng cần phục hồi → nhấn nút chạy. Có thể chạy nhiều lần.' },
    history: { badge: '🖼️ Lịch sử', gen: '⚡ Xử lý bằng AI', hint: 'Nhấn vào ảnh trong lịch sử để xem lại / dùng tiếp.' },
  };
  const SAMPLES = [
    'video-studio/library/business.jpg',
    'video-studio/library/city.jpg',
    'video-studio/library/nature.jpg',
    'video-studio/library/ocean.jpg',
  ];
  const BUSY_TIPS = [
    'Mẹo: ảnh gốc càng rõ mặt, AI làm càng đẹp.',
    'Mẹo: có thể Hủy giữa chừng nếu đợi lâu.',
    'Mẹo: sau khi xong, nhấn 🔁 để chỉnh tiếp nhiều bước.',
    'Gemini hết quota? Thêm key thứ 2, 3 — app tự xoay vòng.',
    'Pollinations miễn phí nên giờ cao điểm có thể chậm, hãy kiên nhẫn.',
    'Mẹo: kéo thanh ⇔ để so sánh Trước–Sau.',
  ];

  const state = {
    tool: 'home',
    source: null, sourceDims: null, sourceName: '',
    result: null, resultDims: null,
    filters: { b: 100, c: 100, s: 100 },
    zoomIdx: 0, // 0 = fit
    compare: true, cmp: 0.5,
    crop: null, undoSource: null,
    busy: false, abort: null,
    _pollPending: null,
    // tùy chọn công cụ
    idBg: 'white', idOutfit: 'suit-black', idHair: 'keep', idGender: 'all',
    light: 'loop',
  };

  const settings = Object.assign({
    provider: 'gemini',
    gemModel: 'gemini-2.5-flash-image', gemCustom: '',
    pollModel: 'kontext',
    hfModel: 'black-forest-labs/FLUX.1-Kontext-dev', hfCustom: '',
    oaiModel: 'gpt-image-1', oaiCustom: '', oaiSize: 'auto', oaiQuality: 'medium', oaiFidelity: 'high',
  }, store.get('photoai-settings-v1', {}));
  const keysRaw = store.get('photoai-keys-v1', {});
  if (typeof keysRaw.gemini === 'string') keysRaw.gemini = keysRaw.gemini ? [keysRaw.gemini] : []; // migrate bản cũ
  const keys = Object.assign({ gemini: [], openai: '', hf: '' }, keysRaw);
  if (!Array.isArray(keys.gemini)) keys.gemini = [];
  let history = store.get('photoai-history-v1', []);

  const gemKeyList = () => (keys.gemini || []).map(k => (k || '').trim()).filter(Boolean);

  /* ═══════════ DỰNG CÁC LƯỚI TÙY CHỌN ═══════════ */
  function renderIdBg() {
    const grid = $('idBgGrid');
    grid.innerHTML = '';
    for (const b of PRESETS.idBackgrounds) {
      const el = document.createElement('button');
      el.className = 'opt' + (state.idBg === b.id ? ' sel' : '');
      const sw = b.hex ? `<span class="sw" style="background:${b.hex}"></span>`
        : b.id === 'custom' ? '<span class="sw" style="background:conic-gradient(#f55,#ff5,#5f5,#5ff,#55f,#f5f,#f55)"></span>'
        : '<span class="sw" style="background:repeating-linear-gradient(45deg,#333,#333 4px,#555 4px,#555 8px)">🖼️</span>';
      el.innerHTML = `${sw}<span>${b.vi}</span>`;
      el.onclick = () => { state.idBg = b.id; renderIdBg(); refreshPrompt(); };
      grid.appendChild(el);
    }
    $('idBgColorWrap').classList.toggle('hidden', state.idBg !== 'custom');
  }

  function renderOutfits() {
    const grid = $('idOutfitGrid');
    grid.innerHTML = '';
    const list = PRESETS.idOutfits.filter(o => state.idGender === 'all' || o.g === 'all' || o.g === state.idGender);
    if (!list.some(o => o.id === state.idOutfit)) state.idOutfit = list[0].id;
    for (const o of list) {
      const el = document.createElement('button');
      el.className = 'opt' + (state.idOutfit === o.id ? ' sel' : '');
      el.innerHTML = `<span class="dot"></span><span>${o.vi}</span>`;
      el.onclick = () => { state.idOutfit = o.id; renderOutfits(); refreshPrompt(); };
      grid.appendChild(el);
    }
    $('idOutfitCustom').classList.toggle('hidden', state.idOutfit !== 'custom');
  }

  function renderHair() {
    const grid = $('idHairGrid');
    grid.innerHTML = '';
    const list = PRESETS.idHair.filter(h => state.idGender === 'all' || h.g === 'all' || h.g === state.idGender);
    if (!list.some(h => h.id === state.idHair)) state.idHair = 'keep';
    for (const h of list) {
      const el = document.createElement('button');
      el.className = 'opt' + (state.idHair === h.id ? ' sel' : '');
      el.innerHTML = `<span class="dot"></span><span>${h.vi}</span>`;
      el.onclick = () => { state.idHair = h.id; renderHair(); refreshPrompt(); };
      grid.appendChild(el);
    }
    $('idHairCustom').classList.toggle('hidden', state.idHair !== 'custom');
  }

  function renderLights() {
    const grid = $('lightGrid');
    grid.innerHTML = '';
    PRESETS.lighting.forEach((l, i) => {
      const el = document.createElement('button');
      el.className = 'light-card' + (state.light === l.id ? ' sel' : '');
      el.innerHTML = `<span class="light-ico">${l.icon}</span><span><b>${i + 1}. ${l.name}</b><span>${l.desc}</span></span>`;
      el.onclick = () => { state.light = l.id; renderLights(); refreshPrompt(); };
      grid.appendChild(el);
    });
  }

  function renderSamples() {
    for (const boxId of ['homeSamples', 'dzSamples']) {
      const box = $(boxId);
      box.innerHTML = '';
      for (const src of SAMPLES) {
        const im = document.createElement('img');
        im.className = 'sample-thumb'; im.src = src; im.alt = 'Ảnh mẫu'; im.loading = 'lazy';
        im.onclick = () => loadSample(src);
        box.appendChild(im);
      }
    }
  }

  /* ═══════════ ĐIỀU HƯỚNG & PANEL ═══════════ */
  function setTool(tool) {
    state.tool = tool;
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    $$('.tool-panel').forEach(p => p.classList.add('hidden'));
    $('panel-' + tool).classList.remove('hidden');
    $('toolBadge').textContent = TOOLS[tool].badge;
    $('btnGenerate').textContent = TOOLS[tool].gen;
    $('genHint').textContent = state.source ? TOOLS[tool].hint : 'Tải ảnh lên để bắt đầu.';
    if (tool === 'history') renderHistory();
    refreshPrompt();
  }

  /* ═══════════ TẢI ẢNH ═══════════ */
  async function setSource(dataUrl, name = 'anh-tai-len') {
    if (/^https?:\/\//.test(dataUrl)) { // link ngoài: thử tải về local trước
      try { dataUrl = await Img.remoteToDataURL(dataUrl); }
      catch { toast('Ảnh từ link ngoài: cắt khung & tải về có thể bị hạn chế (CORS).', 'warn'); }
    }
    try {
      const d = await Img.dims(dataUrl);
      exitCrop(true);
      state.source = dataUrl; state.sourceDims = d; state.sourceName = name;
      state.result = null; state.resultDims = null;
      state.undoSource = null; $('btnUndo').classList.add('hidden');
      state.filters = { b: 100, c: 100, s: 100 }; syncFilterUI();
      state.zoomIdx = 0; state.cmp = 0.5;
      renderView();
      $('genHint').textContent = TOOLS[state.tool].hint;
      if (state.tool === 'home') setTool('id');
      toast('Đã tải ảnh lên (' + d.w + '×' + d.h + ').', 'ok');
    } catch { toast('Không đọc được ảnh này.', 'err'); }
  }

  async function loadSample(url) {
    toast('Đang tải ảnh mẫu…');
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const dataUrl = await new Promise((res2, rej2) => {
        const fr = new FileReader(); fr.onload = () => res2(fr.result); fr.onerror = rej2; fr.readAsDataURL(blob);
      });
      await setSource(dataUrl, 'anh-mau');
    } catch { await setSource(url, 'anh-mau'); }
  }

  /** Đảm bảo ảnh đang xử lý là dataURL local (canvas cần local để không bị taint). */
  async function ensureLocal() {
    const base = state.result || state.source;
    if (!base || base.startsWith('data:')) return base;
    toast('Đang tải ảnh từ link về để xử lý…');
    try {
      const local = await Img.remoteToDataURL(base);
      if (state.result) { state.result = local; state.resultDims = await Img.dims(local); }
      else { state.source = local; state.sourceDims = await Img.dims(local); }
      renderView();
      return local;
    } catch {
      toast('Ảnh từ link ngoài bị trình duyệt chặn (CORS). Hãy tải ảnh về máy rồi tải lên lại.', 'err');
      return null;
    }
  }

  /* ═══════════ HIỂN THỊ SÂN KHẤU ═══════════ */
  const ZOOMS = ['fit', 0.5, 1, 1.5, 2];
  function renderView() {
    const has = !!state.source;
    $('dropzone').classList.toggle('hidden', has);
    $('workspace').classList.toggle('hidden', !has);
    if (!has) return;
    const after = $('imgAfter'), before = $('imgBefore');
    after.src = state.result || state.source;
    before.src = state.source;
    applyFiltersCSS();
    const showCmp = !!(state.result && state.compare && !state.crop);
    before.classList.toggle('hidden', !showCmp);
    $('cmpHandle').classList.toggle('hidden', !showCmp);
    $('cmpLabelB').classList.toggle('hidden', !showCmp);
    $('cmpLabelA').classList.toggle('hidden', !state.result || !!state.crop);
    if (showCmp) applyCmp();
    $('btnCompare').classList.toggle('active', state.compare);
    $('btnUseSource').style.opacity = state.result ? '1' : '0.35';
    let meta = `📐 Gốc ${state.sourceDims.w}×${state.sourceDims.h}`;
    if (state.resultDims) meta += ` → ✨ ${state.resultDims.w}×${state.resultDims.h}`;
    $('fileMeta').textContent = meta;
    requestAnimationFrame(applyZoom);
  }

  function applyZoom() {
    if (!state.source || !state.sourceDims) return;
    const view = $('stageView'), box = $('zoomBox');
    const { w: nw, h: nh } = state.sourceDims;
    const z = ZOOMS[state.zoomIdx];
    let scale;
    if (z === 'fit') {
      scale = Math.min((view.clientWidth - 40) / nw, (view.clientHeight - 40) / nh);
      if (!isFinite(scale) || scale <= 0) scale = 1;
      scale = Math.min(scale, 2);
      $('zoomLabel').textContent = 'Vừa';
    } else {
      scale = z;
      $('zoomLabel').textContent = Math.round(z * 100) + '%';
    }
    box.style.width = Math.max(50, Math.round(nw * scale)) + 'px';
    box.style.height = Math.max(50, Math.round(nh * scale)) + 'px';
    if (state.crop) { layoutCropFrame(); applyCropTransform(); }
  }

  function stepZoom(dir) {
    state.zoomIdx = Math.min(ZOOMS.length - 1, Math.max(0, state.zoomIdx + dir));
    if (state.crop) { toast('Đang ở chế độ cắt — dùng thanh Zoom trong khung cắt.', 'warn'); state.zoomIdx = 0; return; }
    applyZoom();
  }

  function applyCmp() {
    const p = Math.min(0.985, Math.max(0.015, state.cmp));
    $('imgBefore').style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
    $('cmpHandle').style.left = (p * 100) + '%';
  }

  function applyFiltersCSS() {
    $('imgAfter').style.filter = Img.isFilterDefault(state.filters) ? '' : Img.filterCSS(state.filters);
    $('imgBefore').style.filter = '';
  }

  function syncFilterUI() {
    $('fB').value = state.filters.b; $('fC').value = state.filters.c; $('fS').value = state.filters.s;
    $('fBv').textContent = state.filters.b + '%';
    $('fCv').textContent = state.filters.c + '%';
    $('fSv').textContent = state.filters.s + '%';
    applyFiltersCSS();
  }

  /* ═══════════ CHẾ ĐỘ CẮT KHUNG ═══════════ */
  function enterCrop() {
    if (!state.source) { toast('Hãy tải ảnh lên trước.', 'warn'); return; }
    if (state.busy) return;
    state.zoomIdx = 0; applyZoom();
    state.crop = { ratio: parseFloat($('cropAspect').querySelector('.active').dataset.ratio) || 0.75, scale: 1, tx: 0, ty: 0, fx: 0, fy: 0, fw: 0, fh: 0 };
    $('cropZoom').value = 1;
    $('imgAfter').classList.add('hidden');
    $('imgBefore').classList.add('hidden');
    $('cmpHandle').classList.add('hidden');
    $('cmpLabelB').classList.add('hidden'); $('cmpLabelA').classList.add('hidden');
    const ci = $('cropImg');
    ci.src = state.source; ci.classList.remove('hidden');
    $('cropFrame').classList.remove('hidden');
    $('cropBar').classList.remove('hidden');
    layoutCropFrame(); applyCropTransform();
    toast('Chế độ cắt: kéo ảnh để căn mặt vào khung, chỉnh Zoom rồi Áp dụng.');
  }

  function exitCrop(silent) {
    if (!state.crop) return;
    state.crop = null;
    $('cropImg').classList.add('hidden');
    $('cropFrame').classList.add('hidden');
    $('cropBar').classList.add('hidden');
    $('imgAfter').classList.remove('hidden');
    renderView();
    if (!silent) toast('Đã thoát chế độ cắt.');
  }

  function layoutCropFrame() {
    const c = state.crop; if (!c) return;
    const box = $('zoomBox');
    const zw = box.clientWidth, zh = box.clientHeight;
    let fw = Math.min(zw * 0.92, zh * 0.92 * c.ratio);
    let fh = fw / c.ratio;
    c.fw = fw; c.fh = fh; c.fx = (zw - fw) / 2; c.fy = (zh - fh) / 2;
    const f = $('cropFrame');
    f.style.left = c.fx + 'px'; f.style.top = c.fy + 'px';
    f.style.width = fw + 'px'; f.style.height = fh + 'px';
    clampCrop();
  }

  function clampCrop() {
    const c = state.crop; if (!c) return;
    const box = $('zoomBox');
    const zw = box.clientWidth, zh = box.clientHeight;
    const w = zw * c.scale, h = zh * c.scale;
    const cx = zw / 2, cy = zh / 2;
    const minTx = c.fx + c.fw - cx - w / 2, maxTx = c.fx - cx + w / 2;
    const minTy = c.fy + c.fh - cy - h / 2, maxTy = c.fy - cy + h / 2;
    c.tx = Math.min(maxTx, Math.max(minTx, c.tx));
    c.ty = Math.min(maxTy, Math.max(minTy, c.ty));
  }

  function applyCropTransform() {
    const c = state.crop; if (!c) return;
    $('cropImg').style.transform = `translate(${c.tx}px, ${c.ty}px) scale(${c.scale})`;
  }

  async function applyCrop() {
    const c = state.crop; if (!c) return;
    if (!(await ensureLocal())) return;
    const box = $('zoomBox');
    const zw = box.clientWidth, zh = box.clientHeight;
    const cx = zw / 2, cy = zh / 2;
    const ix = (c.fx - cx - c.tx) / c.scale + cx;
    const iy = (c.fy - cy - c.ty) / c.scale + cy;
    const iw = c.fw / c.scale, ih = c.fh / c.scale;
    const kx = state.sourceDims.w / zw, ky = state.sourceDims.h / zh;
    try {
      const out = await Img.crop(state.source, { x: ix * kx, y: iy * ky, w: iw * kx, h: ih * ky });
      state.undoSource = state.source;
      $('btnUndo').classList.remove('hidden');
      state.source = out;
      state.sourceDims = await Img.dims(out);
      state.result = null; state.resultDims = null;
      const keep = state.crop; state.crop = null;
      $('cropImg').classList.add('hidden'); $('cropFrame').classList.add('hidden'); $('cropBar').classList.add('hidden');
      $('imgAfter').classList.remove('hidden');
      renderView();
      toast(`Đã cắt khung tỉ lệ ${(keep.ratio).toFixed(3)} — nhấn ↩️ để hoàn tác.`, 'ok');
    } catch (e) { toast(e.message || 'Cắt ảnh thất bại.', 'err'); }
  }

  /* ═══════════ PROMPT ═══════════ */
  function segVal(id) {
    const b = $(id).querySelector('.active');
    return b ? (b.dataset.v || b.dataset.g) : null;
  }

  function buildPrompt() {
    const t = state.tool;
    if (t === 'id') {
      return window.PhotoAI.buildIdPrompt({
        bg: state.idBg, bgColor: $('idBgColor').value,
        outfit: state.idOutfit, outfitCustom: $('idOutfitCustom').value.trim(),
        hair: state.idHair, hairCustom: $('idHairCustom').value.trim(),
        gender: state.idGender === 'all' ? '' : state.idGender,
        smooth: $('idSmooth').checked, straighten: $('idStraighten').checked,
        extra: $('idExtra').value.trim(),
      });
    }
    if (t === 'light') {
      return window.PhotoAI.buildLightPrompt({
        preset: state.light, custom: $('lightCustom').value.trim(),
        intensity: segVal('lightIntensity') || 'normal',
        keepSkin: $('lightKeepSkin').checked, extra: $('lightExtra').value.trim(),
      });
    }
    if (t === 'restore') {
      return window.PhotoAI.buildRestorePrompt({
        colorize: $('rsColorize').checked, repair: $('rsRepair').checked,
        face: $('rsFace').checked, hair: $('rsHair').checked, denoise: $('rsDenoise').checked,
        bgMode: $('rsBgMode').value, strength: segVal('rsStrength') || 'moderate',
        upscaleNote: $('rsUpscaleNote').checked, extra: $('rsExtra').value.trim(),
      });
    }
    return '';
  }

  function refreshPrompt() {
    const p = buildPrompt();
    if (p) $('promptText').value = p;
  }

  /* ═══════════ CHẠY AI ═══════════ */
  function currentModel() {
    if (settings.provider === 'gemini') return settings.gemCustom.trim() || settings.gemModel;
    if (settings.provider === 'pollinations') return settings.pollModel;
    if (settings.provider === 'hf') return settings.hfCustom.trim() || settings.hfModel;
    return settings.oaiCustom.trim() || settings.oaiModel;
  }

  function setBusy(on, text) {
    state.busy = on;
    $('busyOverlay').classList.toggle('hidden', !on);
    $('btnGenerate').disabled = on;
    if (on) {
      $('busyText').textContent = text;
      const t0 = Date.now();
      $('busyTimer').textContent = '0s';
      $('busyTip').textContent = BUSY_TIPS[Math.floor(Math.random() * BUSY_TIPS.length)];
      state._timer = setInterval(() => {
        $('busyTimer').textContent = Math.floor((Date.now() - t0) / 1000) + 's';
      }, 500);
      state._tipTimer = setInterval(() => {
        $('busyTip').textContent = BUSY_TIPS[Math.floor(Math.random() * BUSY_TIPS.length)];
      }, 6000);
    } else {
      clearInterval(state._timer); clearInterval(state._tipTimer);
    }
  }
  function setBusyText(t) { $('busyText').textContent = t; }

  async function generate() {
    if (state.busy) return;
    if (!['id', 'light', 'restore'].includes(state.tool)) { toast('Hãy chọn công cụ: Ảnh thẻ, Ánh sáng hoặc Phục hồi.', 'warn'); return; }
    if (!state.source) { toast('Hãy tải ảnh lên trước.', 'warn'); return; }
    if (state.crop) { toast('Hãy Áp dụng hoặc Hủy cắt khung trước khi chạy AI.', 'warn'); return; }
    const provider = settings.provider;
    const prompt = $('promptText').value.trim() || buildPrompt();
    if (!prompt) { toast('Prompt trống.', 'err'); return; }
    const label = { id: 'AI đang tạo ảnh thẻ…', light: 'AI đang phối ánh sáng…', restore: 'AI đang phục hồi ảnh…' }[state.tool];
    if (provider === 'pollinations') return generatePollinations(prompt, label);
    if (!(await ensureLocal())) return;
    if (provider === 'gemini') return generateGemini(prompt, label);
    if (provider === 'hf') return generateHF(prompt, label);
    return generateOpenAI(prompt, label);
  }

  async function finishResult(imageUrl, prompt) {
    state.result = imageUrl;
    try { state.resultDims = await Img.dims(imageUrl); } catch { state.resultDims = null; }
    state.compare = true; state.cmp = 0.5;
    renderView();
    addHistory({
      tool: state.tool, label: TOOLS[state.tool].badge,
      url: imageUrl, prompt, provider: settings.provider, model: currentModel(), time: Date.now(),
    });
    toast('✨ AI xử lý xong! Kéo thanh ⇔ để so sánh.', 'ok');
  }

  /* ── Gemini Free: tự xoay vòng nhiều key khi hết quota ──────────── */
  async function generateGemini(prompt, label) {
    const gemKeys = gemKeyList();
    if (!gemKeys.length) {
      openModal('modalSettings');
      toast('Chưa có API key Gemini (miễn phí). Nhập ít nhất 1 key — nhập nhiều key để app tự xoay vòng khi hết quota.', 'warn');
      return;
    }
    const model = currentModel();
    const im = await Img.forGemini(state.source, 2048);
    state.abort = new AbortController();
    const safety = setTimeout(() => state.abort.abort('timeout'), 300000);
    setBusy(true, `⏳ ${label}`);
    let out = null, lastErr = null, used = 0;
    try {
      for (let i = 0; i < gemKeys.length; i++) {
        used = i + 1;
        if (gemKeys.length > 1) setBusyText(`⏳ ${label} (key ${used}/${gemKeys.length})`);
        try {
          out = await Gemini.edit({ key: gemKeys[i], model, prompt, images: [{ base64: im.base64, mime: im.mime }], signal: state.abort.signal });
          break;
        } catch (e) {
          if (e?.name === 'AbortError') throw e;
          lastErr = e;
          if (!/429|quota|503|overload|500|exhausted/i.test(e.message || '')) throw e;
        }
      }
      if (!out) throw lastErr;
      if (gemKeys.length > 1) toast(`Xong bằng key Gemini số ${used}. ✅`, 'ok');
      await finishResult(out.imageUrl, prompt);
    } catch (e) {
      if (e?.name === 'AbortError') toast('Đã hủy yêu cầu.', 'warn');
      else toast(e.message || 'Chạy AI thất bại.', 'err');
    } finally {
      clearTimeout(safety);
      setBusy(false);
    }
  }

  /* ── Pollinations Free: không cần key ───────────────────────────── */
  async function generatePollinations(prompt, label) {
    if (/^https?:\/\//.test(state.source)) return runPollinations(state.source, prompt, label);
    state.abort = new AbortController();
    setBusy(true, '⏳ Đang tải ảnh lên host tạm (miễn phí)…');
    try {
      const blob = await Img.toJPEGBlob(state.source, 1600, 0.9);
      const url = await AnonUpload.upload(blob);
      setBusy(false);
      toast('Đã tải ảnh lên host tạm. 🌸', 'ok');
      runPollinations(url, prompt, label);
    } catch (e) {
      setBusy(false);
      if (e?.name === 'AbortError') { toast('Đã hủy.', 'warn'); return; }
      state._pollPending = { prompt, label };
      $('imgUrlInput').value = '';
      openModal('modalImgUrl');
      toast('Không tự upload ảnh được (trình duyệt chặn). Hãy dán link ảnh công khai để tiếp tục miễn phí.', 'warn');
    }
  }

  async function runPollinations(imageUrl, prompt, label) {
    const size = state.sourceDims ? Img.snapLong(state.sourceDims.w, state.sourceDims.h, 1024, 8) : { w: 1024, h: 1024 };
    state.abort = new AbortController();
    const safety = setTimeout(() => state.abort.abort('timeout'), 300000);
    setBusy(true, `⏳ ${label}`);
    try {
      const out = await Pollinations.edit({
        imageUrl, prompt, model: settings.pollModel,
        width: size.w, height: size.h, signal: state.abort.signal,
      });
      if (out.remote) toast('Pollinations chặn tải trực tiếp (CORS) — ảnh hiển thị qua link, một số chức năng bị hạn chế.', 'warn');
      await finishResult(out.imageUrl, prompt);
    } catch (e) {
      if (e?.name === 'AbortError') toast('Đã hủy yêu cầu.', 'warn');
      else toast(e.message || 'Chạy AI thất bại.', 'err');
    } finally {
      clearTimeout(safety);
      setBusy(false);
    }
  }

  /* ── Hugging Face Free (Beta) ───────────────────────────────────── */
  async function generateHF(prompt, label) {
    const token = (keys.hf || '').trim();
    if (!token) {
      openModal('modalSettings');
      toast('Chưa có token Hugging Face (miễn phí). Hãy nhập token để chạy.', 'warn');
      return;
    }
    const model = currentModel();
    const im = await Img.forGemini(state.source, 1024);
    const size = Img.snapLong(state.sourceDims.w, state.sourceDims.h, 1024, 8);
    state.abort = new AbortController();
    const safety = setTimeout(() => state.abort.abort('timeout'), 300000);
    setBusy(true, `⏳ ${label}`);
    try {
      const out = await HF.edit({
        token, model, prompt, base64: im.base64,
        width: size.w, height: size.h,
        signal: state.abort.signal, onTick: setBusyText,
      });
      await finishResult(out.imageUrl, prompt);
    } catch (e) {
      if (e?.name === 'AbortError') toast('Đã hủy yêu cầu.', 'warn');
      else toast(e.message || 'Chạy AI thất bại.', 'err');
    } finally {
      clearTimeout(safety);
      setBusy(false);
    }
  }

  /* ── GPT Pro (OpenAI, trả phí) ──────────────────────────────────── */
  async function generateOpenAI(prompt, label) {
    const key = (keys.openai || '').trim();
    if (!key) {
      openModal('modalSettings');
      toast('Chưa có API key OpenAI (trả phí). Hãy nhập key, hoặc chuyển sang engine miễn phí ✨/🌸/🤗.', 'warn');
      return;
    }
    const model = currentModel();
    state.abort = new AbortController();
    const safety = setTimeout(() => state.abort.abort('timeout'), 300000);
    setBusy(true, `⏳ ${label}`);
    try {
      const blob = await Img.forOpenAI(state.source, 2048);
      const out = await OpenAI.edit({
        key, model, prompt, imageBlob: blob,
        size: settings.oaiSize, quality: settings.oaiQuality, fidelity: settings.oaiFidelity,
        signal: state.abort.signal,
      });
      await finishResult(out.imageUrl, prompt);
    } catch (e) {
      if (e?.name === 'AbortError') toast('Đã hủy yêu cầu.', 'warn');
      else toast(e.message || 'Chạy AI thất bại.', 'err');
    } finally {
      clearTimeout(safety);
      setBusy(false);
    }
  }

  /* ── AI gợi ý ánh sáng (cần key Gemini) ─────────────────────────── */
  async function suggestLight() {
    if (!state.source) { toast('Hãy tải ảnh lên trước.', 'warn'); return; }
    const key = (gemKeyList()[0] || '').trim();
    if (!key) { openModal('modalSettings'); toast('Tính năng gợi ý cần API key Gemini (miễn phí).', 'warn'); return; }
    if (!(await ensureLocal())) return;
    $('btnSuggest').disabled = true;
    $('suggestOut').textContent = '🤖 AI đang phân tích khuôn mặt…';
    try {
      const im = await Img.forGemini(state.source, 1024);
      const raw = await Gemini.askText({ key, prompt: window.PhotoAI.SUGGEST_LIGHT_PROMPT, image: { base64: im.base64, mime: im.mime } });
      const m = raw.match(/\{[\s\S]*?\}/);
      let preset = null, intensity = null, reason = '';
      if (m) {
        try {
          const j = JSON.parse(m[0]);
          preset = j.preset; intensity = j.intensity; reason = j.reason || '';
        } catch { /* parse lỗi: dò thủ công */ }
      }
      if (!preset || !PRESETS.lighting.some(l => l.id === preset)) {
        preset = (PRESETS.lighting.find(l => raw.toLowerCase().includes(l.id)) || {}).id || null;
      }
      if (preset) {
        state.light = preset; renderLights();
        if (intensity) {
          $$('#lightIntensity button').forEach(b => b.classList.toggle('active', b.dataset.v === intensity));
        }
        refreshPrompt();
        const name = PRESETS.lighting.find(l => l.id === preset).name;
        $('suggestOut').innerHTML = `✅ AI gợi ý: <b>${name}</b>${reason ? ' — ' + escapeHtml(reason) : ''}`;
        toast(`AI gợi ý ánh sáng: ${name}`, 'ok');
      } else {
        $('suggestOut').textContent = 'AI trả lời khó hiểu, bạn hãy tự chọn preset nhé.';
      }
    } catch (e) { $('suggestOut').textContent = ''; toast(e.message || 'Gợi ý thất bại.', 'err'); }
    finally { $('btnSuggest').disabled = false; }
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ═══════════ CÔNG CỤ OFFLINE (không cần key) ═══════════ */
  async function offlineOp(kind) {
    const base = state.result || state.source;
    if (!base) { toast('Hãy tải ảnh lên trước.', 'warn'); return; }
    if (!(await ensureLocal())) return;
    const src = state.result || state.source;
    const btn = { sharpen: 'btnOfflineSharpen', wb: 'btnOfflineWB', upscale: 'btnOfflineUpscale' }[kind];
    $(btn).disabled = true;
    try {
      let out, label;
      if (kind === 'sharpen') { out = await Img.sharpen(src, 0.65); label = 'Tăng nét offline'; }
      if (kind === 'wb') { out = await Img.autoWhiteBalance(src); label = 'Cân bằng trắng offline'; }
      if (kind === 'upscale') { toast('Đang phóng 2× (có thể mất vài giây)…'); out = await Img.upscale2x(src); label = 'Phóng 2× offline'; }
      state.result = out; state.resultDims = await Img.dims(out);
      state.compare = true; renderView();
      addHistory({ tool: 'restore', label: '⚡ ' + label, url: out, prompt: '', provider: 'offline', model: 'canvas', time: Date.now() });
      toast('✅ ' + label + ' xong!', 'ok');
    } catch (e) { toast(e.message || 'Xử lý thất bại.', 'err'); }
    finally { $(btn).disabled = false; }
  }

  /* ═══════════ LỊCH SỬ ═══════════ */
  function saveHistory() {
    store.set('photoai-history-v1', history.slice(0, 12));
  }
  async function addHistory(item) {
    try { item.thumb = await Img.forHistory(item.url, 256); item.url = await Img.forHistory(item.url, 1400); }
    catch { item.thumb = item.url; }
    history.unshift(item);
    history = history.slice(0, 12);
    saveHistory();
    const n = history.length;
    $('histCount').textContent = n;
    $('histCount').classList.toggle('hidden', n === 0);
    if (state.tool === 'history') renderHistory();
  }
  function renderHistory() {
    const box = $('historyList');
    box.innerHTML = '';
    if (!history.length) {
      box.innerHTML = '<div class="hist-empty">Chưa có ảnh nào.<br>Chạy AI xong, kết quả sẽ lưu ở đây.</div>';
      return;
    }
    history.forEach((h, i) => {
      const el = document.createElement('div');
      el.className = 'hist-item';
      const date = new Date(h.time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      const pv = h.provider === 'offline' ? '⚡ Offline'
        : PROVIDERS[h.provider] ? `${PROVIDERS[h.provider].icon} ${escapeHtml(h.model || PROVIDERS[h.provider].name)}`
        : escapeHtml(h.model || '');
      el.innerHTML = `
        <img src="${h.thumb || h.url}" alt="Kết quả ${i + 1}">
        <div class="hist-meta"><b>${escapeHtml(h.label)}</b><span>${pv}<br>${date}</span></div>
        <div class="hist-acts">
          <button class="btn small ghost" data-act="view" title="Xem">👁️</button>
          <button class="btn small ghost" data-act="src" title="Dùng làm ảnh gốc">🔁</button>
          <button class="btn small ghost" data-act="dl" title="Tải về">⬇️</button>
          <button class="btn small ghost" data-act="del" title="Xóa">🗑️</button>
        </div>`;
      el.querySelector('img').onclick = () => viewHistory(i);
      el.querySelector('[data-act="view"]').onclick = () => viewHistory(i);
      el.querySelector('[data-act="src"]').onclick = async () => { await setSource(h.url, 'lich-su'); toast('Đã đưa ảnh lịch sử thành ảnh gốc.', 'ok'); };
      el.querySelector('[data-act="dl"]').onclick = () => Img.download(h.url, `photoai-lichsu-${Date.now()}.jpg`);
      el.querySelector('[data-act="del"]').onclick = () => {
        history.splice(i, 1); saveHistory(); renderHistory();
        $('histCount').textContent = history.length;
        $('histCount').classList.toggle('hidden', !history.length);
      };
      box.appendChild(el);
    });
  }
  async function viewHistory(i) {
    const h = history[i];
    if (!h) return;
    if (!state.source) { await setSource(h.url, 'lich-su'); return; }
    exitCrop(true);
    state.result = h.url;
    try { state.resultDims = await Img.dims(h.url); } catch { state.resultDims = null; }
    state.compare = true;
    renderView();
    toast('Đang xem ảnh lịch sử. Nhấn 🔁 để chỉnh tiếp.');
  }

  /* ═══════════ TẢI VỀ / DÙNG TIẾP ═══════════ */
  function stampName(ext) {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `photoai-${state.tool}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
  }
  async function downloadResult(fmt) {
    const base = state.result || state.source;
    if (!base) { toast('Chưa có ảnh để tải.', 'warn'); return; }
    if (!(await ensureLocal())) return;
    const local = state.result || state.source;
    toast('Đang chuẩn bị file tải về…');
    try {
      let url = local;
      if (!Img.isFilterDefault(state.filters)) url = await Img.applyFilters(local, state.filters);
      if (fmt === 'jpg') {
        const img = await Img.loadImage(url);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        url = c.toDataURL('image/jpeg', 0.93);
      }
      Img.download(url, stampName(fmt === 'jpg' ? 'jpg' : 'png'));
      toast('Đã tải ảnh về máy. ✅', 'ok');
    } catch { toast('Tải về thất bại.', 'err'); }
  }

  async function useAsSource() {
    if (!state.result) { toast('Chưa có kết quả AI để dùng tiếp.', 'warn'); return; }
    state.undoSource = state.source;
    $('btnUndo').classList.remove('hidden');
    state.source = state.result;
    state.sourceDims = state.resultDims;
    state.result = null; state.resultDims = null;
    state.filters = { b: 100, c: 100, s: 100 }; syncFilterUI();
    renderView();
    toast('Đã lấy kết quả làm ảnh gốc — chỉnh tiếp bước 2! 🔁', 'ok');
  }

  /* ═══════════ TẤM IN ẢNH THẺ ═══════════ */
  let printUrl = null;
  async function renderPrint() {
    const base = state.result || state.source;
    if (!base) return;
    if (!(await ensureLocal())) { $('printMeta').textContent = 'Không xử lý được ảnh từ link ngoài.'; return; }
    $('printMeta').textContent = 'Đang xếp ảnh…';
    try {
      const r = await Img.printSheet(state.result || state.source, { photo: $('printPhoto').value, paper: $('printPaper').value, dpi: 300 });
      printUrl = r.dataUrl;
      $('printPreview').src = r.dataUrl;
      $('printMeta').textContent = `Xếp được ${r.count} ảnh (${r.cols} cột × ${r.rows} hàng) · ${r.w}×${r.h}px · 300 DPI — đem file ra tiệm in là dùng ngay.`;
    } catch { $('printMeta').textContent = 'Xếp tấm in thất bại.'; }
  }
  function openPrint() {
    if (!state.source) { toast('Hãy tải ảnh / tạo ảnh thẻ trước.', 'warn'); return; }
    openModal('modalPrint');
    renderPrint();
  }

  /* ═══════════ MODAL & CÀI ĐẶT ═══════════ */
  function openModal(id) { $(id).classList.remove('hidden'); }
  function closeModal(id) { $(id).classList.add('hidden'); }

  function fillModelSelect(sel, models, current) {
    sel.innerHTML = '';
    for (const m of models) {
      const o = document.createElement('option');
      o.value = m.v; o.textContent = m.label;
      sel.appendChild(o);
    }
    sel.value = current;
    if (![...sel.options].some(o => o.value === current)) sel.selectedIndex = 0;
  }

  function syncProviderUI() {
    $$('#providerSeg button').forEach(b => b.classList.toggle('active', b.dataset.p === settings.provider));
    const p = settings.provider, meta = PROVIDERS[p];
    const modelMap = {
      gemini: [Gemini.models, settings.gemModel],
      pollinations: [Pollinations.models, settings.pollModel],
      hf: [HF.models, settings.hfModel],
      openai: [OpenAI.models, settings.oaiModel],
    };
    fillModelSelect($('modelSelect'), modelMap[p][0], modelMap[p][1]);
    const nGem = gemKeyList().length;
    const ready = p === 'pollinations' ? true
      : p === 'gemini' ? nGem > 0
      : !!((p === 'hf' ? keys.hf : keys.openai) || '').trim();
    const chip = $('keyChip');
    chip.className = 'chip ' + (ready ? 'ok' : 'warn');
    chip.textContent = !ready ? '🔑 Chưa có key'
      : p === 'pollinations' ? '🌸 Miễn phí · không cần key'
      : p === 'gemini' ? `✨ Gemini sẵn sàng · ${nGem} key`
      : p === 'hf' ? '🤗 HF sẵn sàng' : '🤖 GPT sẵn sàng';
    $('modelInfo').textContent = `${meta.icon} ${meta.name} · ${currentModel()}`;
    const gemTxt = nGem ? `✅ Gemini: <b>${nGem} key</b>` : '⚪ Gemini: chưa có key';
    const hfTxt = (keys.hf || '').trim() ? '✅ HF: đã có token' : '⚪ HF: chưa có token';
    const oaiTxt = (keys.openai || '').trim() ? '✅ GPT Pro: đã có key' : '⚪ GPT Pro: chưa có key';
    $('homeKeyText').innerHTML = `🌸 Pollinations: <b>luôn miễn phí, không cần key</b><br>${gemTxt} · ${hfTxt}<br>${oaiTxt} (trả phí)`;
  }

  function openSettings() {
    $('setGemKeys').value = gemKeyList().join('\n');
    updateGemCount();
    fillModelSelect($('setGemModel'), Gemini.models, settings.gemModel);
    $('setGemCustom').value = settings.gemCustom || '';
    fillModelSelect($('setPollModel'), Pollinations.models, settings.pollModel);
    $('setHfKey').value = keys.hf || '';
    fillModelSelect($('setHfModel'), HF.models, settings.hfModel);
    $('setHfCustom').value = settings.hfCustom || '';
    $('setOaiKey').value = keys.openai || '';
    fillModelSelect($('setOaiModel'), OpenAI.models, settings.oaiModel);
    $('setOaiCustom').value = settings.oaiCustom || '';
    fillModelSelect($('setOaiSize'), OpenAI.sizes, settings.oaiSize);
    fillModelSelect($('setOaiQuality'), OpenAI.qualities, settings.oaiQuality);
    $('setOaiFidelity').value = settings.oaiFidelity;
    ['gemStatus', 'pollStatus', 'hfStatus', 'oaiStatus'].forEach(id => { $(id).textContent = ''; $(id).style.color = ''; });
    openModal('modalSettings');
  }

  function updateGemCount() {
    const n = $('setGemKeys').value.split('\n').map(s => s.trim()).filter(Boolean).length;
    $('gemKeyCount').textContent = n ? `Đã nhập ${n} key — app tự xoay vòng khi hết quota.` : 'Mỗi dòng 1 key. Nhập càng nhiều key, làm ảnh miễn phí càng lâu hết lượt.';
  }

  function saveSettings() {
    keys.gemini = $('setGemKeys').value.split('\n').map(s => s.trim()).filter(Boolean);
    keys.hf = $('setHfKey').value.trim();
    keys.openai = $('setOaiKey').value.trim();
    settings.gemModel = $('setGemModel').value;
    settings.gemCustom = $('setGemCustom').value.trim();
    settings.pollModel = $('setPollModel').value;
    settings.hfModel = $('setHfModel').value;
    settings.hfCustom = $('setHfCustom').value.trim();
    settings.oaiModel = $('setOaiModel').value;
    settings.oaiCustom = $('setOaiCustom').value.trim();
    settings.oaiSize = $('setOaiSize').value;
    settings.oaiQuality = $('setOaiQuality').value;
    settings.oaiFidelity = $('setOaiFidelity').value;
    store.set('photoai-keys-v1', keys);
    store.set('photoai-settings-v1', settings);
    syncProviderUI();
    closeModal('modalSettings');
    toast('Đã lưu cài đặt API. ✅', 'ok');
  }

  async function testConn(provider) {
    const stId = { gemini: 'gemStatus', pollinations: 'pollStatus', hf: 'hfStatus', openai: 'oaiStatus' }[provider];
    const st = $(stId);
    st.style.color = '';
    try {
      if (provider === 'gemini') {
        const k = $('setGemKeys').value.split('\n').map(s => s.trim()).filter(Boolean)[0];
        if (!k) { st.textContent = '⚠️ Chưa nhập key.'; return; }
        st.textContent = '⏳ Đang kiểm tra key đầu tiên…';
        await Gemini.test(k);
      } else if (provider === 'pollinations') {
        st.textContent = '⏳ Đang kiểm tra…';
        await Pollinations.test();
      } else if (provider === 'hf') {
        const k = $('setHfKey').value.trim();
        if (!k) { st.textContent = '⚠️ Chưa nhập token.'; return; }
        st.textContent = '⏳ Đang kiểm tra…';
        await HF.test(k);
      } else {
        const k = $('setOaiKey').value.trim();
        if (!k) { st.textContent = '⚠️ Chưa nhập key.'; return; }
        st.textContent = '⏳ Đang kiểm tra…';
        await OpenAI.test(k);
      }
      st.textContent = '✅ Kết nối OK!';
      st.style.color = 'var(--ok)';
    } catch (e) {
      st.textContent = '❌ ' + e.message;
      st.style.color = 'var(--err)';
    }
  }

  /* ═══════════ GẮN SỰ KIỆN ═══════════ */
  function bind() {
    // điều hướng
    $$('.nav-btn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
    $$('[data-goto]').forEach(b => b.onclick = () => setTool(b.dataset.goto));
    $('brandHome').onclick = () => setTool('home');

    // provider & model trên topbar
    $$('#providerSeg button').forEach(b => b.onclick = () => {
      settings.provider = b.dataset.p;
      store.set('photoai-settings-v1', settings);
      syncProviderUI();
    });
    $('modelSelect').onchange = e => {
      const v = e.target.value;
      if (settings.provider === 'gemini') settings.gemModel = v;
      else if (settings.provider === 'pollinations') settings.pollModel = v;
      else if (settings.provider === 'hf') settings.hfModel = v;
      else settings.oaiModel = v;
      store.set('photoai-settings-v1', settings);
      syncProviderUI();
    };

    // tải ảnh
    $('btnUpload').onclick = () => $('fileInput').click();
    $('btnNewImage').onclick = () => $('fileInput').click();
    $('fileInput').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) { toast('Hãy chọn file ảnh.', 'err'); return; }
      try { await setSource(await Img.fileToDataURL(f), f.name); } catch { toast('Không đọc được file.', 'err'); }
      e.target.value = '';
    };
    const dz = $('dropzone');
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', async e => {
      const f = [...(e.dataTransfer.files || [])].find(f => f.type.startsWith('image/'));
      if (f) { try { await setSource(await Img.fileToDataURL(f), f.name); } catch { toast('Không đọc được file.', 'err'); } }
    });
    const stage = $('stageView');
    stage.addEventListener('dragover', e => e.preventDefault());
    stage.addEventListener('drop', async e => {
      e.preventDefault();
      const f = [...(e.dataTransfer.files || [])].find(f => f.type.startsWith('image/'));
      if (f) { try { await setSource(await Img.fileToDataURL(f), f.name); } catch { toast('Không đọc được file.', 'err'); } }
    });
    document.addEventListener('paste', async e => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      const f = item.getAsFile();
      try { await setSource(await Img.fileToDataURL(f), 'anh-dan'); } catch { toast('Không đọc được ảnh dán.', 'err'); }
    });

    // công cụ ảnh thẻ
    $$('#idGender button').forEach(b => b.onclick = () => {
      $$('#idGender button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.idGender = b.dataset.g;
      renderOutfits(); renderHair(); refreshPrompt();
    });
    $('idBgColor').oninput = refreshPrompt;
    $('btnPrintSheet').onclick = openPrint;
    $('btnIdCrop').onclick = enterCrop;

    // công cụ ánh sáng
    $$('#lightIntensity button').forEach(b => b.onclick = () => {
      $$('#lightIntensity button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); refreshPrompt();
    });
    $('btnSuggest').onclick = suggestLight;

    // công cụ phục hồi
    $$('#rsStrength button').forEach(b => b.onclick = () => {
      $$('#rsStrength button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); refreshPrompt();
    });
    $('btnOfflineSharpen').onclick = () => offlineOp('sharpen');
    $('btnOfflineWB').onclick = () => offlineOp('wb');
    $('btnOfflineUpscale').onclick = () => offlineOp('upscale');
    $('btnMakeOldSample').onclick = async () => {
      if (!state.source) { toast('Hãy tải ảnh lên trước.', 'warn'); return; }
      if (!(await ensureLocal())) return;
      toast('Đang tạo ảnh cũ mẫu…');
      try {
        state.undoSource = state.source; $('btnUndo').classList.remove('hidden');
        state.source = await Img.makeOldPhotoSample(state.source);
        state.sourceDims = await Img.dims(state.source);
        state.result = null; state.resultDims = null;
        renderView();
        toast('Đã tạo ảnh cũ mẫu — giờ thử Phục hồi AI nhé! 🎞️', 'ok');
      } catch { toast('Tạo ảnh mẫu thất bại.', 'err'); }
    };

    // mọi input trong panel đều dựng lại prompt
    $$('.tool-panel input, .tool-panel select, .tool-panel textarea').forEach(el => {
      el.addEventListener('input', refreshPrompt);
      el.addEventListener('change', refreshPrompt);
    });

    // lịch sử
    $('btnClearHistory').onclick = () => {
      history = []; saveHistory(); renderHistory();
      $('histCount').classList.add('hidden');
      toast('Đã xóa toàn bộ lịch sử.');
    };

    // thanh công cụ sân khấu
    $('btnCrop').onclick = () => (state.crop ? exitCrop() : enterCrop());
    $('btnFilters').onclick = () => $('filtersPop').classList.toggle('hidden');
    $('zoomOut').onclick = () => stepZoom(-1);
    $('zoomIn').onclick = () => stepZoom(1);
    $('zoomFit').onclick = () => { if (!state.crop) { state.zoomIdx = 0; applyZoom(); } };
    $('btnCompare').onclick = () => {
      if (!state.result) { toast('Chưa có kết quả để so sánh.', 'warn'); return; }
      state.compare = !state.compare; renderView();
    };
    $('btnUndo').onclick = () => {
      if (!state.undoSource) return;
      state.source = state.undoSource; state.undoSource = null;
      state.result = null; state.resultDims = null;
      Img.dims(state.source).then(d => { state.sourceDims = d; renderView(); });
      $('btnUndo').classList.add('hidden');
      toast('Đã hoàn tác. ↩️');
    };
    $('btnUseSource').onclick = useAsSource;
    $('btnDlPng').onclick = () => downloadResult('png');
    $('btnDlJpg').onclick = () => downloadResult('jpg');

    // bộ lọc
    const fUpd = () => {
      state.filters = { b: +$('fB').value, c: +$('fC').value, s: +$('fS').value };
      $('fBv').textContent = state.filters.b + '%';
      $('fCv').textContent = state.filters.c + '%';
      $('fSv').textContent = state.filters.s + '%';
      applyFiltersCSS();
    };
    ['fB', 'fC', 'fS'].forEach(id => $(id).addEventListener('input', fUpd));
    $('btnFilterReset').onclick = () => { state.filters = { b: 100, c: 100, s: 100 }; syncFilterUI(); };

    // kéo so sánh + kéo cắt (chung 1 vùng)
    const box = $('zoomBox');
    let dragging = false;
    box.addEventListener('pointerdown', e => {
      if (state.crop || (state.result && state.compare)) { dragging = true; box.setPointerCapture(e.pointerId); handleMove(e); }
    });
    box.addEventListener('pointermove', e => { if (dragging) handleMove(e); });
    ['pointerup', 'pointercancel'].forEach(ev => box.addEventListener(ev, () => { dragging = false; }));
    let lastPt = null;
    function handleMove(e) {
      const r = box.getBoundingClientRect();
      if (state.crop) {
        const pt = { x: e.clientX, y: e.clientY };
        if (e.type === 'pointermove' && lastPt) {
          state.crop.tx += pt.x - lastPt.x;
          state.crop.ty += pt.y - lastPt.y;
          clampCrop(); applyCropTransform();
        }
        lastPt = pt;
        return;
      }
      lastPt = null;
      state.cmp = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      applyCmp();
    }
    box.addEventListener('pointerup', () => { lastPt = null; });
    box.addEventListener('pointercancel', () => { lastPt = null; });

    // thanh cắt
    $$('#cropAspect button').forEach(b => b.onclick = () => {
      $$('#cropAspect button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (state.crop) { state.crop.ratio = parseFloat(b.dataset.ratio); layoutCropFrame(); }
    });
    $('cropZoom').oninput = e => {
      if (!state.crop) return;
      state.crop.scale = parseFloat(e.target.value);
      clampCrop(); applyCropTransform();
    };
    $('btnCropApply').onclick = applyCrop;
    $('btnCropCancel').onclick = () => exitCrop();

    // prompt + chạy
    $('promptToggle').onclick = () => {
      const w = $('promptWrap');
      w.classList.toggle('hidden');
      $('promptToggle').textContent = w.classList.contains('hidden') ? '📝 Xem / sửa prompt gửi AI ▾' : '📝 Ẩn prompt ▴';
    };
    $('btnGenerate').onclick = generate;
    $('btnCancel').onclick = () => { if (state.abort) state.abort.abort(); };

    // dán link ảnh cho Pollinations
    $('btnImgUrlOk').onclick = () => {
      const u = $('imgUrlInput').value.trim();
      if (!/^https?:\/\/.+\..+/.test(u)) { toast('Link ảnh chưa hợp lệ (cần https://…)', 'err'); return; }
      const p = state._pollPending; state._pollPending = null;
      closeModal('modalImgUrl');
      if (p) runPollinations(u, p.prompt, p.label);
    };

    // tấm in
    $('printPhoto').onchange = renderPrint;
    $('printPaper').onchange = renderPrint;
    $('btnPrintDownload').onclick = () => {
      if (printUrl) { Img.download(printUrl, stampName('jpg')); toast('Đã tải tấm in 300 DPI. ✅', 'ok'); }
    };

    // modal
    $$('[data-close]').forEach(b => b.onclick = () => closeModal(b.dataset.close));
    $$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }));
    $('btnKeys').onclick = openSettings;
    $('btnSettings').onclick = openSettings;
    $('btnHomeKeys').onclick = openSettings;
    $('btnHelpTop').onclick = () => openModal('modalHelp');
    $('btnGuide').onclick = () => openModal('modalHelp');
    $('btnSaveKeys').onclick = saveSettings;
    $('btnTestGem').onclick = () => testConn('gemini');
    $('btnTestPoll').onclick = () => testConn('pollinations');
    $('btnTestHf').onclick = () => testConn('hf');
    $('btnTestOai').onclick = () => testConn('openai');
    $('setOaiShow').onclick = () => { const i = $('setOaiKey'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('setHfShow').onclick = () => { const i = $('setHfKey'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('setGemKeys').addEventListener('input', updateGemCount);

    // phím tắt
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generate(); }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '1') setTool('id');
      if (e.key === '2') setTool('light');
      if (e.key === '3') setTool('restore');
      if (e.key === 'Escape') { $$('.modal').forEach(m => m.classList.add('hidden')); $('filtersPop').classList.add('hidden'); }
    });

    window.addEventListener('resize', () => { if (state.zoomIdx === 0) applyZoom(); });
  }

  /* ═══════════ KHỞI ĐỘNG ═══════════ */
  function init() {
    if (!PROVIDERS[settings.provider]) settings.provider = 'gemini';
    ['imgAfter', 'imgBefore', 'cropImg'].forEach(id => { $(id).draggable = false; });
    $('zoomBox').style.userSelect = 'none';
    renderIdBg(); renderOutfits(); renderHair(); renderLights(); renderSamples();
    bind();
    syncProviderUI();
    setTool('home');
    if (history.length) {
      $('histCount').textContent = history.length;
      $('histCount').classList.remove('hidden');
    }
    if (!gemKeyList().length && !keys.openai && !keys.hf) {
      setTimeout(() => toast('👋 Chào bạn! Chọn 🌸 Polli để làm ảnh miễn phí ngay không cần key — hoặc nhập key Gemini free trong ⚙️ Cài đặt.', 'warn'), 600);
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();

  // Hook cho kiểm thử tự động & debug trong DevTools.
  window.PhotoAIApp = { setTool, buildPrompt, generate, state, settings, keys };
})();
