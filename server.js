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
