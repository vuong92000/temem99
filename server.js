/**
 * PhotoAI Studio — máy chủ tĩnh không phụ thuộc thư viện ngoài.
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

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath.endsWith('/')) urlPath += 'index.html';

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
      return send(res, 200, JSON.stringify({ ok: true, app: 'PhotoAI Studio' }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
    }
    return send(res, 404, JSON.stringify({ error: 'Unknown API' }), {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`📸 PhotoAI Studio đang chạy tại:  http://localhost:${PORT}`);
  console.log(`   Thư mục tĩnh: ${PUBLIC}`);
});
