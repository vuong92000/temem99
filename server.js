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

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');

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
    if (req.url.startsWith('/api/tts')) {
      return proxyLocalTTS(req, res);
    }
    if (req.url.startsWith('/api/agnes/')) {
      return proxyAgnes(req, res, req.url.split('?')[0]);
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
