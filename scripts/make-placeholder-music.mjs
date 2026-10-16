#!/usr/bin/env node
// Renders the placeholder channel music: short, seamless synth loops written as
// note data and synthesized here, so there is nothing to license. Swap in real
// tracks whenever you like (README → "Channel music"). Needs ffmpeg for MP3.
//
//   node scripts/make-placeholder-music.mjs

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const TAU = Math.PI * 2;
const OUT_DIR = fileURLToPath(new URL('../public/media/music/', import.meta.url));

// --- Notes -----------------------------------------------------------------

const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (name) => {
  const [, letter, accidental, octave] = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  return PITCH[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + (Number(octave) + 1) * 12;
};
const hz = (note) => 440 * 2 ** (((typeof note === 'number' ? note : midi(note)) - 69) / 12);

let seed = 1;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const noise = () => rand() * 2 - 1;

// --- Voices ----------------------------------------------------------------

const frac = (p) => p - Math.floor(p);
const WAVES = {
  sine: (p) => Math.sin(TAU * p),
  tri: (p) => 1 - 4 * Math.abs(frac(p) - 0.5),
  saw: (p) => 2 * frac(p) - 1,
  pulse: (duty) => (p) => (frac(p) < duty ? 1 : -1),
  // Two-operator FM: a soft Rhodes-ish electric piano and a glassy bell.
  epiano: (p, t) => Math.sin(TAU * p + 1.4 * Math.exp(-t * 2.5) * Math.sin(TAU * p)) + 0.25 * Math.exp(-t * 4) * Math.sin(TAU * 2 * p),
  bell: (p, t) => Math.sin(TAU * p + 2.5 * Math.exp(-t * 3) * Math.sin(TAU * 3.5 * p)),
};

// a/d/r in seconds, s = sustain level. cutoff (+ env) runs a one-pole lowpass.
const VOICES = {
  chip: { wave: WAVES.pulse(0.25), a: 0.002, d: 0.1, s: 0.55, r: 0.05, gain: 0.16, vibrato: [5.5, 0.004], echo: 0.5 },
  chipThin: { wave: WAVES.pulse(0.125), a: 0.001, d: 0.06, s: 0.4, r: 0.03, gain: 0.11 },
  chipBass: { wave: WAVES.tri, a: 0.002, d: 0.2, s: 0.8, r: 0.03, gain: 0.42 },
  stab: { wave: WAVES.pulse(0.5), a: 0.002, d: 0.08, s: 0.2, r: 0.05, gain: 0.07, cutoff: 1800, echo: 0.3 },
  bass: { wave: WAVES.saw, a: 0.003, d: 0.15, s: 0.6, r: 0.05, gain: 0.32, cutoff: 260, cutoffEnv: 900, cutoffDecay: 0.08 },
  sub: { wave: WAVES.sine, a: 0.01, d: 0.4, s: 0.85, r: 0.1, gain: 0.4 },
  brass: { wave: WAVES.saw, a: 0.015, d: 0.2, s: 0.6, r: 0.08, gain: 0.08, cutoff: 700, cutoffEnv: 2600, cutoffDecay: 0.12, detune: [-6, 6], echo: 0.25 },
  lead: { wave: WAVES.saw, a: 0.02, d: 0.3, s: 0.7, r: 0.15, gain: 0.11, cutoff: 1900, detune: [-5, 5], vibrato: [5, 0.005], echo: 0.6 },
  pad: { wave: WAVES.saw, a: 0.6, d: 1, s: 0.8, r: 0.9, gain: 0.05, cutoff: 1100, detune: [-12, -4, 4, 12] },
  softPad: { wave: WAVES.tri, a: 1.2, d: 2, s: 0.9, r: 1.6, gain: 0.08, detune: [-8, 0, 8], tremolo: [0.3, 0.25] },
  epiano: { wave: WAVES.epiano, a: 0.003, d: 0.9, s: 0.25, r: 0.3, gain: 0.09, tremolo: [4.5, 0.15], echo: 0.25 },
  bell: { wave: WAVES.bell, a: 0.002, d: 0.6, s: 0.0, r: 0.4, gain: 0.07, echo: 0.8 },
};

function adsr(t, dur, { a, d, s, r }) {
  const held = (x) => (x < a ? x / a : s + (1 - s) * Math.exp(-(x - a) / d));
  if (t < dur) return held(t);
  // Exponential release, tapered to land exactly on zero (no click at the cut).
  const k = Math.max(0, 1 - (t - dur) / r);
  return held(dur) * Math.exp(-(t - dur) / (r / 4)) * k;
}

// --- Songs -----------------------------------------------------------------

// A loop on a 16th-note grid. Everything written past the end wraps back to
// the start, so release tails and echoes carry across the loop point.
function createSong({ bpm, bars }) {
  const step = 60 / bpm / 4;
  const length = Math.round(bars * 16 * step * RATE);
  const dry = new Float32Array(length);
  const wet = new Float32Array(length);
  const at = (steps) => Math.round(steps * step * RATE);

  return {
    bpm,
    bars,
    step,
    length,
    dry,
    wet,
    note(voiceName, start, note, steps, vel = 1) {
      const v = VOICES[voiceName];
      const f = hz(note);
      const dur = steps * step;
      const detune = (v.detune ?? [0]).map((c) => 2 ** (c / 1200));
      const phases = detune.map(() => rand());
      const total = Math.ceil((dur + v.r) * RATE);
      const offset = at(start);
      let lp = 0;
      for (let i = 0; i < total; i++) {
        const t = i / RATE;
        const vib = v.vibrato ? 1 + v.vibrato[1] * Math.sin(TAU * v.vibrato[0] * t) * Math.min(1, t / 0.25) : 1;
        let x = 0;
        for (let k = 0; k < detune.length; k++) {
          phases[k] += (f * detune[k] * vib) / RATE;
          x += v.wave(phases[k], t);
        }
        x /= Math.sqrt(detune.length);
        if (v.cutoff) {
          const fc = Math.min(18000, v.cutoff + (v.cutoffEnv ?? 0) * Math.exp(-t / (v.cutoffDecay ?? 0.2)));
          lp += (1 - Math.exp((-TAU * fc) / RATE)) * (x - lp);
          x = lp;
        }
        const trem = v.tremolo ? 1 - v.tremolo[1] * (0.5 + 0.5 * Math.sin(TAU * v.tremolo[0] * t)) : 1;
        const y = x * adsr(t, dur, v) * trem * vel * v.gain;
        const idx = (offset + i) % length;
        dry[idx] += y;
        if (v.echo) wet[idx] += y * v.echo;
      }
    },
    chord(voiceName, start, notes, steps, vel = 1) {
      notes.forEach((n) => this.note(voiceName, start, n, steps, vel));
    },
    hit(kind, start, vel = 1) {
      drum(kind, dry, at(start), vel);
    },
  };
}

function drum(kind, buf, offset, vel) {
  const N = buf.length;
  const write = (seconds, fn) => {
    let state = { phase: 0, prev: 0, held: 0, lp: 0 };
    for (let i = 0; i < Math.ceil(seconds * RATE); i++) buf[(offset + i) % N] += fn(i / RATE, state, i) * vel;
  };
  const highpass = (x, s) => {
    const y = x - s.prev;
    s.prev = x;
    return y;
  };
  switch (kind) {
    case 'kick':
      return write(0.4, (t, s) => {
        s.phase += (45 + 120 * Math.exp(-t / 0.03)) / RATE;
        return 0.9 * Math.sin(TAU * s.phase) * Math.exp(-t / 0.16) + 0.15 * noise() * Math.exp(-t / 0.003);
      });
    case 'snare':
      return write(0.3, (t, s) => 0.4 * highpass(noise(), s) * Math.exp(-t / 0.07) + 0.35 * Math.sin(TAU * 185 * t) * Math.exp(-t / 0.05));
    case 'gated': // the big 80s gated-reverb snare
      return write(0.42, (t, s) => (t < 0.32 ? 0.38 * highpass(noise(), s) * (0.4 + 0.6 * Math.exp(-t / 0.06)) : 0) + 0.35 * Math.sin(TAU * 180 * t) * Math.exp(-t / 0.06));
    case 'clap':
      return write(0.25, (t, s) => {
        const burst = [0, 0.011, 0.022].some((b) => t >= b && t < b + 0.006) ? 1 : 0;
        return 0.4 * highpass(noise(), s) * Math.max(burst, Math.exp(-(t - 0.022) / 0.06) * (t > 0.022));
      });
    case 'hat':
      return write(0.08, (t, s) => 0.16 * highpass(highpass(noise(), s), { prev: 0 }) * Math.exp(-t / 0.018));
    case 'brush':
      return write(0.2, (t, s) => {
        s.lp += 0.3 * (noise() - s.lp);
        return 0.12 * s.lp * Math.exp(-t / 0.08);
      });
    case 'chipKick':
      return write(0.15, (t, s) => {
        s.phase += (60 + 300 * Math.exp(-t / 0.02)) / RATE;
        return 0.6 * WAVES.tri(s.phase) * Math.exp(-t / 0.06);
      });
    case 'chipNoise': // sample-and-hold noise, like an 8-bit noise channel
      return write(0.12, (t, s, i) => {
        if (i % 6 === 0) s.held = noise();
        return 0.22 * s.held * Math.exp(-t / 0.035);
      });
    case 'chipSnare':
      return write(0.18, (t, s, i) => {
        if (i % 3 === 0) s.held = noise();
        return 0.3 * s.held * Math.exp(-t / 0.06);
      });
  }
}

const each = (bars, fn) => {
  for (let bar = 0; bar < bars; bar++) fn(bar, bar * 16);
};
// [step, note, length] lists written relative to a bar start
const phrase = (song, voice, start, notes, vel = 1) => notes.forEach(([s, n, l]) => song.note(voice, start + s, n, l, vel));

// Neon Burger Co.: bright, bouncy jingle. C major, 124 bpm.
function neonBurger() {
  const song = createSong({ bpm: 124, bars: 8 });
  const roots = ['C2', 'A1', 'F1', 'G1'];
  const stabs = [['E4', 'G4', 'C5'], ['E4', 'A4', 'C5'], ['F4', 'A4', 'C5'], ['D4', 'G4', 'B4']];
  each(8, (bar, b) => {
    const i = bar % 4;
    [0, 4, 8, 12].forEach((s) => song.hit('kick', b + s));
    [4, 12].forEach((s) => song.hit('clap', b + s));
    [2, 6, 10, 14].forEach((s) => song.hit('hat', b + s));
    for (let s = 0; s < 16; s += 2) song.note('bass', b + s, midi(roots[i]) + (s % 4 ? 12 : 0), 1.5);
    [2, 6, 10, 14].forEach((s) => song.chord('stab', b + s, stabs[i], 1));
  });
  const A = [[[0, 'E5', 2], [2, 'G5', 2], [4, 'A5', 1], [5, 'G5', 1], [6, 'E5', 2], [8, 'C5', 2], [10, 'D5', 2], [12, 'E5', 4]],
    [[0, 'C5', 2], [2, 'E5', 2], [4, 'A5', 3], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 4]],
    [[0, 'A5', 2], [2, 'C6', 2], [4, 'A5', 2], [6, 'F5', 2], [8, 'G5', 2], [10, 'A5', 2], [12, 'F5', 4]],
    [[0, 'G5', 2], [2, 'B5', 2], [4, 'D6', 4], [8, 'B5', 2], [10, 'G5', 2], [12, 'D5', 4]]];
  const ending = [[0, 'G5', 2], [2, 'F5', 2], [4, 'E5', 2], [6, 'D5', 2], [8, 'B4', 4], [12, 'G4', 4]];
  [...A, A[0], A[1], A[2], ending].forEach((notes, bar) => phrase(song, 'chip', bar * 16, notes));
  return song;
}

// Field Notes: slow, warm travel-documentary ambience. D major, 72 bpm.
function fieldNotes() {
  const song = createSong({ bpm: 72, bars: 8 });
  const chords = [['D3', 'A3', 'C#4', 'F#4'], ['B2', 'F#3', 'A3', 'D4'], ['G2', 'D3', 'F#3', 'B3'], ['A2', 'E3', 'A3', 'C#4']];
  const bells = [['F#5', 'A5', 'C#6', 'E5'], ['D5', 'F#5', 'B5', 'A5'], ['B5', 'D6', 'F#5', 'G5'], ['E5', 'A5', 'C#6', 'B5']];
  chords.forEach((notes, i) => {
    song.chord('softPad', i * 32, notes, 30);
    song.note('sub', i * 32, midi(notes[0]) - 12, 30, 0.8);
    [0, 6, 16, 22].forEach((s, k) => song.note('bell', i * 32 + s, bells[i][k], 4, 0.8));
  });
  return song;
}

// Orbit Analytics: an 80s business-news theme. Eb major, 108 bpm.
function orbitAnalytics() {
  const song = createSong({ bpm: 108, bars: 8 });
  const roots = ['Eb2', 'C2', 'Ab1', 'Bb1'];
  const chords = [['G3', 'Bb3', 'Eb4'], ['G3', 'C4', 'Eb4'], ['Ab3', 'C4', 'Eb4'], ['F3', 'Bb3', 'D4']];
  each(8, (bar, b) => {
    const i = bar % 4;
    [0, 6, 8].forEach((s) => song.hit('kick', b + s));
    [4, 12].forEach((s) => song.hit('clap', b + s));
    for (let s = 0; s < 16; s++) song.hit('hat', b + s, s % 2 ? 0.5 : 1);
    [[0, 0], [3, 7], [6, 12], [8, 0], [11, 7], [14, 12]].forEach(([s, up]) => song.note('bass', b + s, midi(roots[i]) + up, 2));
    [[0, 3], [6, 2], [10, 2]].forEach(([s, l]) => song.chord('brass', b + s, chords[i], l));
  });
  const fanfare = [[[0, 'Bb4', 4], [4, 'Eb5', 4], [8, 'G5', 4], [12, 'Bb5', 4]],
    [[0, 'G5', 6], [6, 'F5', 2], [8, 'Eb5', 4], [12, 'C5', 4]],
    [[0, 'Ab5', 3], [3, 'G5', 3], [6, 'F5', 2], [8, 'Eb5', 4], [12, 'C5', 4]],
    [[0, 'D5', 6], [6, 'F5', 2], [8, 'Bb5', 8]]];
  [...fanfare, ...fanfare].forEach((notes, bar) => phrase(song, 'lead', bar * 16, notes, 0.9));
  return song;
}

// Game of Life: 8-bit arpeggios. A minor, 140 bpm.
function gameOfLife() {
  const song = createSong({ bpm: 140, bars: 8 });
  const arps = [['A4', 'C5', 'E5', 'A5'], ['F4', 'A4', 'C5', 'F5'], ['C5', 'E5', 'G5', 'C6'], ['G4', 'B4', 'D5', 'G5']];
  const roots = ['A2', 'F2', 'C3', 'G2'];
  each(8, (bar, b) => {
    const i = bar % 4;
    for (let s = 0; s < 16; s++) song.note('chipThin', b + s, arps[i][s % 4], 1, 0.8);
    for (let s = 0; s < 16; s += 2) song.note('chipBass', b + s, midi(roots[i]) + (s % 4 ? 12 : 0), 1.6);
    [0, 8].forEach((s) => song.hit('chipKick', b + s));
    [4, 12].forEach((s) => song.hit('chipSnare', b + s));
    [2, 6, 10, 14].forEach((s) => song.hit('chipNoise', b + s, 0.7));
  });
  const tune = [[[0, 'E5', 2], [4, 'A5', 2], [8, 'C6', 2], [10, 'B5', 2], [12, 'A5', 4]],
    [[0, 'A5', 4], [4, 'F5', 4], [8, 'C5', 8]],
    [[0, 'G5', 2], [4, 'E5', 2], [6, 'G5', 2], [8, 'C6', 8]],
    [[0, 'B5', 2], [2, 'A5', 2], [4, 'G5', 4], [8, 'D5', 4], [12, 'B4', 4]]];
  tune.forEach((notes, bar) => phrase(song, 'chip', (bar + 4) * 16, notes));
  return song;
}

// Gradient Reel: synthwave, all neon and gated snares. F minor, 92 bpm.
function gradientReel() {
  const song = createSong({ bpm: 92, bars: 8 });
  const chords = [['F3', 'Ab3', 'C4'], ['F3', 'Ab3', 'Db4'], ['Eb3', 'Ab3', 'C4'], ['Eb3', 'G3', 'Bb3']];
  const roots = ['F1', 'Db1', 'Ab1', 'Eb1'];
  each(8, (bar, b) => {
    const i = bar % 4;
    song.chord('pad', b, chords[i], 16);
    for (let s = 0; s < 16; s += 2) song.note('bass', b + s, midi(roots[i]) + 12, 1.7);
    [0, 8].forEach((s) => song.hit('kick', b + s));
    [4, 12].forEach((s) => song.hit('gated', b + s));
    [2, 6, 10, 14].forEach((s) => song.hit('hat', b + s, 0.8));
  });
  const melody = [[[0, 'C5', 8], [8, 'Ab4', 4], [12, 'F4', 4]],
    [[0, 'F4', 8], [8, 'Ab4', 4], [12, 'Db5', 4]],
    [[0, 'C5', 12], [12, 'Eb5', 4]],
    [[0, 'Bb4', 8], [8, 'G4', 8]]];
  [...melody, ...melody.slice(0, 3), [[0, 'Bb4', 4], [4, 'C5', 12]]].forEach((notes, bar) => phrase(song, 'lead', bar * 16, notes));
  return song;
}

// Resolution Chart: smooth "local forecast" jazz. C major, 84 bpm.
function forecast() {
  const song = createSong({ bpm: 84, bars: 8 });
  const chords = [['F3', 'A3', 'C4', 'E4'], ['E3', 'G3', 'B3', 'D4'], ['D3', 'F3', 'A3', 'C4'], ['G2', 'F3', 'B3', 'D4']];
  const roots = ['F2', 'E2', 'D2', 'G1'];
  each(8, (bar, b) => {
    const i = Math.floor(bar / 2);
    [[0, 6], [6, 2], [10, 4]].forEach(([s, l]) => song.chord('epiano', b + s, chords[i], l, 0.9));
    const r = midi(roots[i]);
    [[0, r, 6], [6, r + 7, 2], [8, r + 12, 4], [12, r + (bar % 2 ? 2 : 4), 4]].forEach(([s, n, l]) => song.note('sub', b + s, n, l, 0.9));
    [4, 12].forEach((s) => song.hit('brush', b + s));
    [0, 10].forEach((s) => song.hit('kick', b + s, 0.35));
    [0, 3, 6, 8, 11, 14].forEach((s) => song.hit('hat', b + s, 0.45));
  });
  const melody = [[[0, 'E5', 4], [4, 'D5', 2], [6, 'C5', 6]], [[4, 'A4', 4], [8, 'C5', 4]],
    [[0, 'D5', 4], [4, 'C5', 2], [6, 'B4', 6]], [[4, 'G4', 4], [8, 'B4', 4]],
    [[0, 'C5', 4], [4, 'A4', 2], [6, 'F5', 6]], [[4, 'E5', 4], [8, 'C5', 4]],
    [[0, 'B4', 4], [4, 'D5', 4], [8, 'G5', 8]], [[0, 'F5', 4], [4, 'D5', 4], [8, 'B4', 8]]];
  melody.forEach((notes, bar) => phrase(song, 'bell', bar * 16, notes, 0.8));
  return song;
}

// --- Mixdown -----------------------------------------------------------------

function mixdown(song) {
  const { dry, wet, length, step } = song;
  const out = new Float32Array(length);
  const delay = Math.round(3 * step * RATE); // dotted-eighth echo, wrapped
  for (let i = 0; i < length; i++) {
    out[i] = dry[i] + 0.35 * wet[(i - delay + length) % length] + 0.15 * wet[(i - 2 * delay + 2 * length) % length];
  }
  let sum = 0;
  let peak = 0;
  for (const x of out) {
    sum += x * x;
    peak = Math.max(peak, Math.abs(x));
  }
  const rms = Math.sqrt(sum / length);
  const gain = Math.min(0.12 / rms, 0.89 / peak); // aim for ~-18 dBFS RMS, peaks under -1 dBFS
  return out.map((x) => x * gain);
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((x, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const SONGS = {
  'neon-burger': neonBurger,
  'field-notes': fieldNotes,
  'orbit-analytics': orbitAnalytics,
  'game-of-life': gameOfLife,
  'gradient-reel': gradientReel,
  forecast,
};

mkdirSync(OUT_DIR, { recursive: true });
const tmp = join(tmpdir(), `retro-music-${process.pid}`);
mkdirSync(tmp, { recursive: true });

for (const [name, make] of Object.entries(SONGS)) {
  seed = 1;
  const song = make();
  const samples = mixdown(song);
  const wavPath = join(tmp, `${name}.wav`);
  writeFileSync(wavPath, wav(samples));
  const mp3Path = join(OUT_DIR, `${name}.mp3`);
  const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libmp3lame', '-b:a', '96k', mp3Path]);
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${name}: ${result.stderr}`);
  console.log(`${name}.mp3  ${(samples.length / RATE).toFixed(1)}s  ${song.bpm} bpm`);
}
rmSync(tmp, { recursive: true, force: true });
