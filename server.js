/**
 * VideoAI Studio — máy chủ tĩnh không phụ thuộc thư viện ngoài.
 * Chỉ dùng các module builtin của Node nên không cần `npm install`.
 *
 * Chạy:  node server.js   (hoặc: npm start)
 * Cổng:  PORT env var, mặc định 3000
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');

// Load local configuration without adding a dependency. Existing process env wins.
function loadDotEnv(filePath = path.join(ROOT, '.env')) {
  if (process.env.VIDEOAI_DISABLE_DOTENV === '1') return;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`Không đọc được .env: ${err.message}`);
  }
}
loadDotEnv();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function readJson(req, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > maxBytes) {
        reject(new Error('Request quá lớn'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { reject(new Error('JSON không hợp lệ')); }
    });
    req.on('error', reject);
  });
}

const googleSessions = new Map();
const googleOauthStates = new Map();
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/cloud-platform';

function cookieValue(req, name) {
  const item = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function sessionId(req, res) {
  const existing = cookieValue(req, 'videoai_sid');
  if (existing) return existing;
  const id = crypto.randomBytes(24).toString('hex');
  res.setHeader('Set-Cookie', `videoai_sid=${encodeURIComponent(id)}; HttpOnly; SameSite=Lax; Path=/`);
  return id;
}

function googleConfig() {
  return {
    clientId: String(process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim(),
    projectId: String(process.env.GOOGLE_CLOUD_PROJECT_ID || '').trim(),
    apiKey: String(process.env.GEMINI_API_KEY || '').trim(),
  };
}

function requestOrigin(req) {
  const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwarded || (req.socket.encrypted ? 'https' : 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${protocol}://${host}`;
}

function googleRedirectUri(req) {
  return String(process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim()
    || `${requestOrigin(req)}/api/google/oauth/callback`;
}

async function postForm(url, values) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  });
  return { response, body: await response.json().catch(() => ({})) };
}

async function googleAccessToken(req) {
  const sid = cookieValue(req, 'videoai_sid');
  const session = googleSessions.get(sid);
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60_000) return session.accessToken;
  if (!session.refreshToken) return null;
  const cfg = googleConfig();
  const token = await postForm(process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token', {
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: session.refreshToken,
    grant_type: 'refresh_token',
  });
  if (!token.response.ok || !token.body.access_token) return null;
  session.accessToken = token.body.access_token;
  session.expiresAt = Date.now() + Number(token.body.expires_in || 3600) * 1000;
  return session.accessToken;
}

async function proxyGeminiImage(req, res) {
  if (req.method !== 'POST') return send(res, 405, JSON.stringify({ error: 'Method Not Allowed' }), { 'Content-Type': 'application/json; charset=utf-8' });
  try {
    const cfg = googleConfig();
    const token = await googleAccessToken(req);
    if (!token && !cfg.apiKey) return send(res, 401, JSON.stringify({ error: 'Chưa có Gemini API key hoặc phiên OAuth. Đặt GEMINI_API_KEY hoặc bấm Đăng nhập Gemini.' }), { 'Content-Type': 'application/json; charset=utf-8' });
    if (token && !cfg.projectId) return send(res, 503, JSON.stringify({ error: 'OAuth Gemini cần GOOGLE_CLOUD_PROJECT_ID.' }), { 'Content-Type': 'application/json; charset=utf-8' });
    const body = await readJson(req);
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return send(res, 400, JSON.stringify({ error: 'Prompt ảnh Gemini đang trống.' }), { 'Content-Type': 'application/json; charset=utf-8' });
    const model = String(body.model || process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview');
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: body.aspectRatio || '16:9', imageSize: body.imageSize || '1K' },
      },
    };
    const geminiBase = String(process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers['x-goog-user-project'] = cfg.projectId;
    } else {
      headers['x-goog-api-key'] = cfg.apiKey;
    }
    const upstream = await fetch(`${geminiBase}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return send(res, upstream.status, JSON.stringify({ error: result?.error?.message || `Gemini trả về ${upstream.status}` }), { 'Content-Type': 'application/json; charset=utf-8' });
    const imagePart = result?.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (!imagePart) return send(res, 502, JSON.stringify({ error: 'Gemini không trả về dữ liệu ảnh.' }), { 'Content-Type': 'application/json; charset=utf-8' });
    const mime = imagePart.inlineData.mimeType || 'image/png';
    return send(res, 200, Buffer.from(imagePart.inlineData.data, 'base64'), { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  } catch (err) {
    return send(res, 502, JSON.stringify({ error: err.message || 'Gemini image proxy error' }), { 'Content-Type': 'application/json; charset=utf-8' });
  }
}

function googleAuthRoutes(req, res, urlPath) {
  const cfg = googleConfig();
  if (req.method === 'GET' && urlPath === '/api/google/status') {
    const sid = cookieValue(req, 'videoai_sid');
    const session = googleSessions.get(sid);
    const oauthConfigured = !!(cfg.clientId && cfg.clientSecret && cfg.projectId);
    const apiKeyConfigured = !!cfg.apiKey;
    return send(res, 200, JSON.stringify({
      configured: oauthConfigured || apiKeyConfigured,
      oauthConfigured,
      apiKeyConfigured,
      authenticated: !!session,
      authMethod: session ? 'oauth' : apiKeyConfigured ? 'api-key' : null,
      projectId: cfg.projectId || null,
    }), { 'Content-Type': 'application/json; charset=utf-8' });
  }
  if (req.method === 'POST' && urlPath === '/api/google/logout') {
    googleSessions.delete(cookieValue(req, 'videoai_sid'));
    return send(res, 200, JSON.stringify({ ok: true }), { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': 'videoai_sid=; Max-Age=0; Path=/' });
  }
  if (req.method === 'GET' && urlPath === '/api/google/oauth/start') {
    if (!cfg.clientId || !cfg.clientSecret || !cfg.projectId) return send(res, 503, JSON.stringify({ error: 'Cần cấu hình GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET và GOOGLE_CLOUD_PROJECT_ID.' }), { 'Content-Type': 'application/json; charset=utf-8' });
    const sid = sessionId(req, res);
    const state = crypto.randomBytes(24).toString('hex');
    googleOauthStates.set(state, { sid, redirectUri: googleRedirectUri(req), createdAt: Date.now() });
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.search = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: googleRedirectUri(req), response_type: 'code', scope: GOOGLE_SCOPES, access_type: 'offline', prompt: 'consent', state }).toString();
    res.writeHead(302, { Location: authUrl.toString() });
    return res.end();
  }
  if (req.method === 'GET' && urlPath === '/api/google/oauth/callback') {
    const query = new URL(req.url, requestOrigin(req)).searchParams;
    const state = googleOauthStates.get(query.get('state'));
    if (!state || Date.now() - state.createdAt > 10 * 60 * 1000) return send(res, 400, 'Google OAuth state không hợp lệ hoặc đã hết hạn.');
    googleOauthStates.delete(query.get('state'));
    if (query.get('error')) return send(res, 400, `Google OAuth bị từ chối: ${query.get('error')}`);
    return postForm(process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token', { code: query.get('code'), client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: state.redirectUri, grant_type: 'authorization_code' }).then(token => {
      if (!token.response.ok || !token.body.access_token) return send(res, 502, JSON.stringify({ error: 'Không đổi được Google authorization code.' }), { 'Content-Type': 'application/json; charset=utf-8' });
      googleSessions.set(state.sid, { accessToken: token.body.access_token, refreshToken: token.body.refresh_token || '', expiresAt: Date.now() + Number(token.body.expires_in || 3600) * 1000 });
      res.writeHead(302, { Location: '/', 'Set-Cookie': `videoai_sid=${encodeURIComponent(state.sid)}; HttpOnly; SameSite=Lax; Path=/` });
      return res.end();
    }).catch(err => send(res, 502, JSON.stringify({ error: err.message }), { 'Content-Type': 'application/json; charset=utf-8' }));
  }
  return null;
}

function agnesBaseUrl() {
  return String(process.env.AGNES_URL || '').trim().replace(/\/$/, '');
}

function agnesHeaders() {
  const key = String(process.env.AGNES_API_KEY || '').trim();
  return key
    ? { 'X-API-Key': key, Authorization: `Bearer ${key}` }
    : {};
}

async function proxyAgnes(req, res, urlPath) {
  const base = agnesBaseUrl();
  if (!base) {
    return send(res, 503, JSON.stringify({ error: 'Chưa cấu hình Agnes AI. Đặt AGNES_URL, ví dụ http://127.0.0.1:8765, rồi khởi động lại server.' }), {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
  try {
    if (req.method === 'POST' && (urlPath === '/api/agnes/video' || urlPath === '/api/agnes/creative')) {
      const body = await readJson(req);
      const isCreative = urlPath === '/api/agnes/creative';
      const idea = String(body.idea || body.prompt || '').trim();
      if (!idea) return send(res, 400, JSON.stringify({ error: 'Ý tưởng/prompt Agnes đang trống.' }), { 'Content-Type': 'application/json; charset=utf-8' });
      const form = isCreative
        ? new URLSearchParams({
          idea,
          user_requirements: String(body.user_requirements || body.requirements || ''),
          visual_style: String(body.visual_style || body.style || 'cinematic realism'),
          chaining_mode: String(body.chaining_mode || 'keyframes'),
          narration: body.narration === false ? 'false' : 'true',
        })
        : new URLSearchParams({
          prompt: idea,
          mode: String(body.mode || 't2v'),
          duration: String(body.duration || 5),
          resolution: String(body.resolution || '768x1152'),
        });
      const upstream = await fetch(`${base}/api/tasks/${isCreative ? 'creative' : 'simple'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...agnesHeaders() },
        body: form,
      });
      const data = await upstream.arrayBuffer();
      return send(res, upstream.status, Buffer.from(data), {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      });
    }

    const taskMatch = urlPath.match(/^\/api\/agnes\/tasks\/([A-Za-z0-9_-]+)$/);
    if (req.method === 'GET' && taskMatch) {
      const upstream = await fetch(`${base}/api/tasks/${taskMatch[1]}`, { headers: agnesHeaders() });
      const data = await upstream.arrayBuffer();
      return send(res, upstream.status, Buffer.from(data), {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      });
    }

    const videoMatch = urlPath.match(/^\/api\/agnes\/video\/([A-Za-z0-9_-]+)$/);
    if (req.method === 'GET' && videoMatch) {
      const upstream = await fetch(`${base}/api/video/${videoMatch[1]}`, { headers: agnesHeaders() });
      const data = await upstream.arrayBuffer();
      return send(res, upstream.status, Buffer.from(data), {
        'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
        'Cache-Control': 'no-store',
      });
    }

    if (req.method === 'GET' && urlPath === '/api/agnes/status') {
      const upstream = await fetch(`${base}/api/models`, { headers: agnesHeaders() });
      const data = await upstream.arrayBuffer();
      return send(res, upstream.status, Buffer.from(data), {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      });
    }

    return send(res, 404, JSON.stringify({ error: 'Unknown Agnes API route' }), { 'Content-Type': 'application/json; charset=utf-8' });
  } catch (err) {
    return send(res, 502, JSON.stringify({ error: err.message || 'Agnes proxy error' }), {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
}

async function proxyLocalTTS(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, JSON.stringify({ error: 'Method Not Allowed' }), { 'Content-Type': 'application/json; charset=utf-8' });
  }
  try {
    const body = await readJson(req);
    const provider = String(body.provider || 'viettts').toLowerCase();
    const endpoints = {
      viettts: process.env.VIETTTS_URL || '',
      kokoro: process.env.KOKORO_TTS_URL || '',
      piper: process.env.PIPER_TTS_URL || '',
    };
    const target = endpoints[provider];
    const envName = { viettts: 'VIETTTS_URL', kokoro: 'KOKORO_TTS_URL', piper: 'PIPER_TTS_URL' }[provider];
    if (!target) {
      return send(res, 503, JSON.stringify({
        error: envName
          ? `Chưa cấu hình endpoint cho ${provider}. Đặt ${envName} rồi khởi động lại server.`
          : `Provider TTS không được hỗ trợ: ${provider}`,
      }), { 'Content-Type': 'application/json; charset=utf-8' });
    }
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav, audio/mpeg, audio/*' },
      body: JSON.stringify({
        model: body.model || 'tts-1',
        input: String(body.input || ''),
        voice: body.voice || 'default',
        speed: Number(body.speed) || 1,
        response_format: body.response_format || 'wav',
      }),
    });
    const data = await upstream.arrayBuffer();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'audio/wav',
      'Cache-Control': 'no-store',
    });
    return res.end(Buffer.from(data));
  } catch (err) {
    return send(res, 502, JSON.stringify({ error: err.message || 'Local TTS proxy error' }), {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(PUBLIC, urlPath));
  // Chặn path traversal
  if (!filePath.startsWith(PUBLIC)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return send(res, 404, 'Not Found: ' + urlPath);
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    // Ảnh thư viện cache lâu, tài nguyên tĩnh cache ngắn
    const cache = urlPath.startsWith('/library/')
      ? 'public, max-age=86400'
      : 'no-cache';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => send(res, 500, 'Stream error'));
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    if (req.url.startsWith('/api/health')) {
      return send(res, 200, JSON.stringify({ ok: true, app: 'VideoAI Studio' }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
    }
    const apiPath = req.url.split('?')[0];
    if (['/api/google/status', '/api/google/logout', '/api/google/oauth/start', '/api/google/oauth/callback'].includes(apiPath)) {
      return googleAuthRoutes(req, res, apiPath);
    }
    if (apiPath === '/api/gemini/image') {
      return proxyGeminiImage(req, res);
    }
    if (req.url.startsWith('/api/tts')) {
      return proxyLocalTTS(req, res);
    }
    if (req.url.startsWith('/api/agnes/')) {
      return proxyAgnes(req, res, apiPath);
    }
    return send(res, 404, JSON.stringify({ error: 'Unknown API' }), {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  const actualPort = server.address().port;
  console.log(`✨ VideoAI Studio đang chạy tại:  http://localhost:${actualPort}`);
  console.log(`   Thư mục tĩnh: ${PUBLIC}`);
});
