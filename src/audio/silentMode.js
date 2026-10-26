// iPhones and iPads play Web Audio as "ambient" sound, which Silent mode (or
// the ring/silent switch) mutes; an <audio> or <video> element is "playback",
// and plays regardless, taking the page's Web Audio with it. So on an iPad in
// Silent mode the TV's music, static and clicks (all Web Audio) stayed silent
// until the clock radio (an <audio> element) came on. Ask for playback
// instead: Safari 16.4+ takes it from the Audio Session API, and before that a
// silent <audio> element looping alongside does the same. Call it from a tap
// or click (iOS only lets a page start sound from one), as often as you like.

export function playThroughSilentMode({ nav = globalThis.navigator, doc = globalThis.document } = {}) {
  if (!nav) return 'none';
  if (nav.audioSession) {
    nav.audioSession.type = 'playback';
    return 'audio session';
  }
  if (!isAppleTouch(nav)) return 'none';
  silence ??= startSilence(doc);
  silence?.play().catch(() => {});
  return 'silent loop';
}

// An iPhone, iPod or iPad (which says it's a Mac, but has a touch screen).
export function isAppleTouch(nav) {
  const ua = nav.userAgent ?? '';
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
}

let silence = null;

function startSilence(doc) {
  if (typeof Audio === 'undefined' || typeof URL?.createObjectURL !== 'function') return null;
  const element = new Audio(URL.createObjectURL(new Blob([silentWav()], { type: 'audio/wav' })));
  element.loop = true;
  // Paused while the page is hidden, so it doesn't hold the phone's audio.
  doc?.addEventListener('visibilitychange', () => (doc.hidden ? element.pause() : element.play().catch(() => {})));
  return element;
}

// Half a second of silence as a WAV file: mono, 8-bit, 8 kHz.
export function silentWav(seconds = 0.5, rate = 8000) {
  const samples = Math.round(seconds * rate);
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at, word) => [...word].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // the format chunk's size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // one channel
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true); // bytes a second
  view.setUint16(32, 1, true); // bytes a sample
  view.setUint16(34, 8, true); // bits a sample
  text(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit samples are unsigned: 128 is silence
  return bytes;
}
