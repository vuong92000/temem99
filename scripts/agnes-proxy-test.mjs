/** Smoke test cho source tạo video Agnes qua server proxy. */
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
    env: { ...process.env, PORT: '0', ...env },
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
let received;
try {
  upstream = http.createServer((req, res) => {
    if (req.method === 'POST' && (req.url === '/api/tasks/simple' || req.url === '/api/tasks/creative')) {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => {
        received = new URLSearchParams(raw);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ task_id: req.url.endsWith('creative') ? 'mock-creative-1' : 'mock-task-1' }));
      });
      return;
    }
    if (req.method === 'GET' && (req.url === '/api/tasks/mock-task-1' || req.url === '/api/tasks/mock-creative-1')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ task_id: req.url.includes('creative') ? 'mock-creative-1' : 'mock-task-1', status: 'completed', progress: 1 }));
      return;
    }
    if (req.method === 'GET' && (req.url === '/api/video/mock-task-1' || req.url === '/api/video/mock-creative-1')) {
      res.writeHead(200, { 'Content-Type': 'video/mp4' });
      res.end(Buffer.from('mock-agnes-video'));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'mock route not found' }));
  });
  const upstreamPort = await listen(upstream);

  app = await startApp();
  const empty = await fetch(`http://127.0.0.1:${app.port}/api/agnes/video`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'test' }),
  });
  check('endpoint Agnes trống trả 503 rõ ràng', empty.status === 503 && (await empty.text()).includes('AGNES_URL'));
  await stopApp(app.child);

  app = await startApp({ AGNES_URL: `http://127.0.0.1:${upstreamPort}` });
  const create = await fetch(`http://127.0.0.1:${app.port}/api/agnes/video`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'A cinematic Vietnamese village at sunrise', mode: 't2v', duration: '5', resolution: '1152x768' }),
  });
  const createBody = await create.json();
  check('proxy Agnes tạo task và chuyển form body', create.status === 200 && createBody.task_id === 'mock-task-1' && received.get('prompt').includes('Vietnamese village') && received.get('mode') === 't2v');

  const creative = await fetch(`http://127.0.0.1:${app.port}/api/agnes/creative`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea: 'Hành trình khởi nghiệp', requirements: '8 scenes', visual_style: 'cinematic realism', chaining_mode: 'keyframes', narration: true }),
  });
  const creativeBody = await creative.json();
  check('proxy Agnes creative multi-scene', creative.status === 200 && creativeBody.task_id === 'mock-creative-1' && received.get('idea') === 'Hành trình khởi nghiệp' && received.get('chaining_mode') === 'keyframes');

  const task = await fetch(`http://127.0.0.1:${app.port}/api/agnes/tasks/mock-task-1`);
  check('proxy Agnes đọc được task status', task.status === 200 && (await task.json()).status === 'completed');

  const video = await fetch(`http://127.0.0.1:${app.port}/api/agnes/video/mock-task-1`);
  check('proxy Agnes tải được MP4', video.status === 200 && (await video.arrayBuffer()).byteLength > 0 && video.headers.get('content-type') === 'video/mp4');
} finally {
  if (app?.child) await stopApp(app.child);
  upstream?.close();
}

console.log(`\nAGNES PROXY: ${pass} pass, ${fail} fail`);
if (fail) process.exitCode = 1;
