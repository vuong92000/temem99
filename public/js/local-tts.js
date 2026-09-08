/* Adapter cho các TTS local miễn phí qua server proxy /api/tts. */

export const LOCAL_VOICES = {
  'local-viettts': { provider: 'viettts', label: 'VietTTS · tiếng Việt' },
  'local-kokoro': { provider: 'kokoro', label: 'Kokoro · local' },
  'local-piper': { provider: 'piper', label: 'Piper · CPU/local' },
};

export function isLocalVoice(voice) {
  return !!LOCAL_VOICES[voice];
}

export async function synthesizeLocalVoice(text, voice = 'local-viettts', { rate = 1 } = {}) {
  const profile = LOCAL_VOICES[voice] || LOCAL_VOICES['local-viettts'];
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: profile.provider,
      input: text,
      voice: 'default',
      speed: Number(rate) || 1,
      response_format: 'wav',
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let message = `Local TTS trả về ${res.status}`;
    try { message = JSON.parse(detail).error || message; } catch { /* plain text */ }
    throw new Error(message);
  }
  return await res.arrayBuffer();
}
