/** Smoke test cho proxy TTS local: endpoint trống, success và lỗi upstream. */
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
  const started = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server timeout: ${output}`)), 5000);
    const onData = () => {
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timer); child.stdout.off('data', onData); resolve(Number(match[1])); }
    };
    child.stdout.on('data', onData);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`server exited ${code}: ${output}`)); });
  });
  return { child, port: await started };
}

async function stopApp(child) {
  child.kill('SIGTERM');
  await once(child, 'exit').catch(() => {});
}

async function post(port, body) {
  return fetch(`http://127.0.0.1:${port}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

let upstream;
let app;
try {
  app = await startApp();
  let empty = await post(app.port, { provider: 'viettts', input: 'Xin chào' });
  check('endpoint trống trả 503 rõ ràng', empty.status === 503 && (await empty.text()).includes('VIETTTS_URL'));
  await stopApp(app.child);

  let received;
  upstream = http.createServer((req, res) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      received = JSON.parse(raw || '{}');
      if (received.input === 'upstream-error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'mock upstream failed' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      res.end(Buffer.from('RIFF-mock-wav'));
    });
  });
  const upstreamPort = await listen(upstream);
  app = await startApp({ VIETTTS_URL: `http://127.0.0.1:${upstreamPort}/v1/audio/speech` });

  const ok = await post(app.port, { provider: 'viettts', input: 'Xin chào', voice: 'default', speed: 1 });
  const audio = Buffer.from(await ok.arrayBuffer());
  check('proxy success trả audio và chuyển body', ok.status === 200 && ok.headers.get('content-type') === 'audio/wav' && audio.toString() === 'RIFF-mock-wav' && received.input === 'Xin chào');

  const bad = await post(app.port, { provider: 'viettts', input: 'upstream-error' });
  check('proxy giữ status lỗi upstream', bad.status === 500 && (await bad.text()).includes('mock upstream failed'));
} finally {
  if (app?.child) await stopApp(app.child);
  upstream?.close();
}

console.log(`\nTTS PROXY: ${pass} pass, ${fail} fail`);
if (fail) process.exitCode = 1;
