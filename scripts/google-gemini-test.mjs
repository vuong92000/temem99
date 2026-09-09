/** Smoke test Google OAuth session + Gemini image proxy bằng upstream mock. */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = new URL('..', import.meta.url).pathname;
let pass = 0;
let fail = 0;
const check = (name, ok) => {
  if (ok) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
};

function listen(server) {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => server.address().port);
}

async function startApp(env = {}) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: '0', VIDEOAI_DISABLE_DOTENV: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server timeout: ${output}`)), 5000);
    const onData = () => {
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timer); child.stdout.off('data', onData); resolve(Number(match[1])); }
    };
    child.stdout.on('data', onData);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`server exited ${code}: ${output}`)); });
  });
  return { child, port };
}

async function stopApp(child) {
  child.kill('SIGTERM');
  await once(child, 'exit').catch(() => {});
}

let upstream;
let app;
let receivedGemini;
try {
  upstream = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/token') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'mock-google-access-token', refresh_token: 'mock-refresh-token', expires_in: 3600 }));
      return;
    }
    if (req.method === 'POST' && req.url.startsWith('/v1beta/models/')) {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => {
        receivedGemini = { headers: req.headers, body: JSON.parse(raw || '{}') };
        const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: pixel } }] } }] }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'mock route not found' }));
  });
  const upstreamPort = await listen(upstream);
  app = await startApp({
    GOOGLE_OAUTH_CLIENT_ID: 'mock-client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'mock-client-secret',
    GOOGLE_CLOUD_PROJECT_ID: 'mock-project',
    GOOGLE_OAUTH_TOKEN_URL: `http://127.0.0.1:${upstreamPort}/token`,
    GEMINI_API_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
  });
  const base = `http://127.0.0.1:${app.port}`;

  const statusBefore = await fetch(`${base}/api/google/status`);
  const statusBeforeBody = await statusBefore.json();
  check('Google status không lộ token và báo cấu hình', statusBefore.status === 200 && statusBeforeBody.configured === true && statusBeforeBody.authenticated === false && !('accessToken' in statusBeforeBody));

  const noAuthImage = await fetch(`${base}/api/gemini/image`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'test image' }),
  });
  check('Gemini image từ chối phiên chưa OAuth', noAuthImage.status === 401 && (await noAuthImage.text()).includes('GEMINI_API_KEY'));

  const start = await fetch(`${base}/api/google/oauth/start`, { redirect: 'manual' });
  const location = start.headers.get('location') || '';
  const state = new URL(location).searchParams.get('state');
  const firstCookie = (start.headers.get('set-cookie') || '').split(';')[0];
  check('OAuth start tạo state và không đưa secret/token lên browser', start.status === 302 && location.startsWith('https://accounts.google.com/') && !!state && !location.includes('client_secret') && firstCookie.startsWith('videoai_sid='));

  const callback = await fetch(`${base}/api/google/oauth/callback?code=mock-code&state=${encodeURIComponent(state)}`, {
    headers: { Cookie: firstCookie }, redirect: 'manual',
  });
  const sessionCookie = (callback.headers.get('set-cookie') || '').split(';')[0] || firstCookie;
  check('OAuth callback đổi code phía server và redirect về app', callback.status === 302 && callback.headers.get('location') === '/' && sessionCookie.startsWith('videoai_sid='));

  const statusAfter = await fetch(`${base}/api/google/status`, { headers: { Cookie: sessionCookie } });
  const statusAfterBody = await statusAfter.json();
  check('OAuth access token chỉ nằm trong session server', statusAfterBody.authenticated === true && !('accessToken' in statusAfterBody));

  const image = await fetch(`${base}/api/gemini/image`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ prompt: 'A cinematic Vietnamese village at sunrise', aspectRatio: '16:9' }),
  });
  const imageData = Buffer.from(await image.arrayBuffer());
  check('Gemini image proxy chuyển Bearer, project và trả inlineData thành ảnh', image.status === 200 && image.headers.get('content-type') === 'image/png' && imageData.length > 20 && receivedGemini?.headers.authorization === 'Bearer mock-google-access-token' && receivedGemini?.headers['x-goog-user-project'] === 'mock-project' && receivedGemini?.body.generationConfig.responseModalities[0] === 'IMAGE');

  const logout = await fetch(`${base}/api/google/logout`, { method: 'POST', headers: { Cookie: sessionCookie } });
  const statusLogout = await fetch(`${base}/api/google/status`, { headers: { Cookie: sessionCookie } });
  check('Google logout xoá phiên server', logout.status === 200 && (await statusLogout.json()).authenticated === false);

  await stopApp(app.child);
  app = null;
  const keyApp = await startApp({
    GEMINI_API_KEY: 'mock-gemini-api-key',
    GEMINI_API_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
  });
  const keyBase = `http://127.0.0.1:${keyApp.port}`;
  const keyStatus = await fetch(`${keyBase}/api/google/status`);
  const keyStatusBody = await keyStatus.json();
  check('API key mode chỉ cần GEMINI_API_KEY', keyStatus.status === 200 && keyStatusBody.configured === true && keyStatusBody.apiKeyConfigured === true && keyStatusBody.authenticated === false);

  const keyImage = await fetch(`${keyBase}/api/gemini/image`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'A clean product photo of a Vietnamese coffee cup' }),
  });
  const keyImageData = Buffer.from(await keyImage.arrayBuffer());
  check('Gemini API key proxy dùng x-goog-api-key server-side', keyImage.status === 200 && keyImageData.length > 20 && receivedGemini?.headers['x-goog-api-key'] === 'mock-gemini-api-key' && !receivedGemini?.headers.authorization && !receivedGemini?.headers['x-goog-user-project']);
  await stopApp(keyApp.child);
} finally {
  if (app?.child) await stopApp(app.child);
  upstream?.close();
}

console.log(`\nGOOGLE GEMINI: ${pass} pass, ${fail} fail`);
if (fail) process.exitCode = 1;
