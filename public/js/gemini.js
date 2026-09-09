import { loadImage } from './art.js';

let objectUrls = [];

export async function getGeminiStatus() {
  const response = await fetch('/api/google/status', { credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Google status ${response.status}`);
  return data;
}

export function startGoogleGeminiLogin() {
  window.location.assign('/api/google/oauth/start');
}

export async function logoutGoogleGemini() {
  const response = await fetch('/api/google/logout', { method: 'POST', credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Google logout ${response.status}`);
  return data;
}

export async function generateGeminiImage(prompt, { aspectRatio = '16:9', imageSize = '1K' } = {}) {
  const response = await fetch('/api/gemini/image', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, imageSize }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Gemini image ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  const img = await loadImage(url, { timeoutMs: 120000 });
  return { img, url };
}

export function revokeGeminiImageUrls() {
  objectUrls.splice(0).forEach(url => URL.revokeObjectURL(url));
}
