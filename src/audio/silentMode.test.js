import { describe, expect, it } from 'vitest';
import { isAppleTouch, playThroughSilentMode, silentWav } from './silentMode.js';

const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const MAC = IPAD;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

describe('playThroughSilentMode', () => {
  it('asks for playback where Safari has the Audio Session API', () => {
    const nav = { userAgent: IPAD, maxTouchPoints: 5, audioSession: { type: 'auto' } };
    expect(playThroughSilentMode({ nav })).toBe('audio session');
    expect(nav.audioSession.type).toBe('playback');
  });

  it('falls back to a silent loop on an older iPhone or iPad', () => {
    expect(playThroughSilentMode({ nav: { userAgent: IPHONE, maxTouchPoints: 5 } })).toBe('silent loop');
  });

  it('leaves everything else alone', () => {
    expect(playThroughSilentMode({ nav: { userAgent: ANDROID, maxTouchPoints: 5 } })).toBe('none');
    expect(playThroughSilentMode({ nav: { userAgent: MAC, maxTouchPoints: 0 } })).toBe('none');
  });
});

describe('isAppleTouch', () => {
  it('knows an iPad by its touch screen, though it says it is a Mac', () => {
    expect(isAppleTouch({ userAgent: IPAD, maxTouchPoints: 5 })).toBe(true);
    expect(isAppleTouch({ userAgent: MAC, maxTouchPoints: 0 })).toBe(false);
    expect(isAppleTouch({ userAgent: IPHONE, maxTouchPoints: 5 })).toBe(true);
    expect(isAppleTouch({ userAgent: ANDROID, maxTouchPoints: 5 })).toBe(false);
  });
});

describe('silentWav', () => {
  it('is a valid WAV file of silence', () => {
    const bytes = silentWav(0.5, 8000);
    const view = new DataView(bytes.buffer);
    const text = (at) => String.fromCharCode(...bytes.slice(at, at + 4));
    expect([text(0), text(8), text(12), text(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect([view.getUint16(20, true), view.getUint16(22, true), view.getUint32(24, true), view.getUint16(34, true)]).toEqual([1, 1, 8000, 8]);
    expect(view.getUint32(40, true)).toBe(4000);
    expect(bytes.slice(44).every((b) => b === 128)).toBe(true);
  });
});
