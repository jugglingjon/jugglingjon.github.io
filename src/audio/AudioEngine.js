import { brownNoise, roomImpulse, softClipCurve, whiteNoise } from './synth.js';

const FLYBACK_HZ = 15734; // NTSC line rate: the CRT's high-pitched whine

export const SOUND_DEFAULTS = { master: 0.8, music: 1, static: 1, whine: 0.3, roomTone: 0.5 };
const MUSIC_GAIN = 1.5; // music level at settings.music = 1

// Everything you hear. The set's own sounds are synthesized with Web Audio;
// only channel music and video soundtracks come from files.
//
//   TV speaker: channel music, soundtracks and static, through a small boxy
//   speaker and the room, scaled by the set's volume. Static tracks the snow
//   on screen, so picture and sound can never drift apart.
//   Hardware: remote clicks, the tuner relay, power thunk, degauss hum and
//   flyback whine come from the plastic and the chassis, so the volume knob
//   doesn't touch them.
export class AudioEngine {
  constructor(ctx, settings = { ...SOUND_DEFAULTS }) {
    this.ctx = ctx;
    this.settings = settings;
    this.noise = whiteNoise(ctx);
    this.mediaNodes = new WeakMap();
    this.channelNode = null;
    this.channelTone = null;
    this.musicBuffers = new Map(); // url → Promise<AudioBuffer | null>
    this.musicOffsets = new WeakMap(); // source → where its "broadcast" started
    this.music = null;
    this.musicToken = 0;

    this.master = gain(ctx, settings.master);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    this.master.connect(limiter).connect(ctx.destination);

    this.room = ctx.createConvolver();
    this.room.buffer = roomImpulse(ctx);
    this.room.connect(gain(ctx, 0.22)).connect(this.master);

    this.hardware = gain(ctx, 1);
    this.hardware.connect(this.master);
    this.hardware.connect(this.room);

    // The TV speaker.
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClipCurve();
    this.speaker = gain(ctx, 1);
    this.volume = gain(ctx, 0);
    chain(
      this.speaker,
      biquad(ctx, 'highpass', 180),
      biquad(ctx, 'lowpass', 5200),
      biquad(ctx, 'peaking', 1300, 1, 4),
      shaper,
      this.volume,
    );
    this.volume.connect(this.master);
    this.volume.connect(this.room);

    this.staticGain = gain(ctx, 0);
    const hiss = loop(ctx, this.noise);
    chain(hiss, biquad(ctx, 'highpass', 350), biquad(ctx, 'lowpass', 7500), this.staticGain, this.speaker);

    this.channelBus = gain(ctx, 0);
    this.channelBus.connect(this.speaker);
    this.musicBus = gain(ctx, settings.music * MUSIC_GAIN);
    this.musicBus.connect(this.channelBus);

    this.whine = ctx.createOscillator();
    this.whine.frequency.value = FLYBACK_HZ;
    this.whineGain = gain(ctx, 0);
    chain(this.whine, this.whineGain, this.hardware);

    // Room tone: distant traffic and a fridge hum from the next room.
    this.roomTone = gain(ctx, 0);
    chain(loop(ctx, brownNoise(ctx)), biquad(ctx, 'lowpass', 260), this.roomTone);
    const hum = ctx.createOscillator();
    hum.frequency.value = 120;
    chain(hum, gain(ctx, 0.05), this.roomTone);
    this.roomTone.connect(this.master);

    hiss.start();
    this.whine.start();
    hum.start();
  }

  // Called every frame with the shared fx object.
  update(fx) {
    const t = this.ctx.currentTime;
    const s = this.settings;
    const alive = Math.min(1, fx.power * 1.5);
    this.staticGain.gain.setTargetAtTime(Math.pow(fx.snow, 1.3) * 0.2 * s.static * alive, t, 0.015);
    this.channelBus.gain.setTargetAtTime((1 - fx.snow) * alive, t, 0.03);
    this.whineGain.gain.setTargetAtTime(0.004 * s.whine * fx.power, t, 0.05);
    this.roomTone.gain.setTargetAtTime(0.35 * s.roomTone, t, 0.2);
    this.master.gain.setTargetAtTime(s.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * MUSIC_GAIN, t, 0.05);
  }

  setVolume(level, muted, max = 20) {
    const value = muted ? 0 : Math.pow(level / max, 2) * 1.4;
    this.volume.gain.setTargetAtTime(value, this.ctx.currentTime, 0.03);
  }

  // Route the current station's sound (video soundtrack or test tone) to the speaker.
  setChannel(channel) {
    this.playMusic(channel?.source);
    this.channelNode?.disconnect();
    this.channelTone?.stop();
    this.channelNode = this.channelTone = null;
    const source = channel?.source;
    if (!source) return;

    if (source.video && this.ctx.createMediaElementSource) {
      let node = this.mediaNodes.get(source.video);
      if (!node) {
        node = this.ctx.createMediaElementSource(source.video);
        this.mediaNodes.set(source.video, node);
      }
      source.video.muted = false; // its sound now only reaches the speakers through this graph
      this.channelNode = node;
    } else if (source.tone) {
      this.channelTone = this.ctx.createOscillator();
      this.channelTone.frequency.value = source.tone;
      this.channelNode = this.channelTone.connect(gain(this.ctx, 0.05));
      this.channelTone.start();
    }
    this.channelNode?.connect(this.channelBus);
  }

  // Fetch and decode channel music ahead of time so tuning in is instant.
  preloadMusic(urls) {
    urls.forEach((url) => this.loadMusic(url));
  }

  loadMusic(url) {
    if (!this.musicBuffers.has(url)) {
      const pending = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((data) => this.ctx.decodeAudioData(data))
        .catch((error) => {
          console.warn(`Channel music failed to load: ${url}`, error);
          return null;
        });
      this.musicBuffers.set(url, pending);
    }
    return this.musicBuffers.get(url);
  }

  // Each channel's music loops forever "on air": tuning in lands mid-song,
  // wherever the broadcast has got to, rather than at the top.
  async playMusic(source) {
    const token = ++this.musicToken;
    this.music?.stop();
    this.music?.disconnect();
    this.music = null;
    if (!source?.music) return;

    const buffer = await this.loadMusic(source.music);
    if (!buffer || token !== this.musicToken) return; // surfed past while it loaded
    if (!this.musicOffsets.has(source)) this.musicOffsets.set(source, Math.random() * buffer.duration);

    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.connect(this.musicBus);
    node.start(0, (this.ctx.currentTime + this.musicOffsets.get(source)) % buffer.duration);
    this.music = node;
  }

  // A remote button: plastic tick over a soft thock.
  click() {
    const t = this.ctx.currentTime;
    const pitch = 0.92 + Math.random() * 0.16;
    this.noiseBurst(t, { duration: 0.025, level: 0.5, type: 'highpass', freq: 2500 * pitch });
    this.tone(t, { freq: 170 * pitch, to: 120 * pitch, duration: 0.05, level: 0.45 });
  }

  // A lamp's switch: a sharp snap and a little knock through the base.
  lampSwitch(on) {
    const t = this.ctx.currentTime;
    this.noiseBurst(t, { duration: 0.012, level: 0.8, type: 'bandpass', freq: on ? 4200 : 3600, q: 1.4 });
    this.tone(t, { freq: 230, to: 150, duration: 0.045, level: 0.22, type: 'triangle' });
  }

  // Wax: the lava lamp changing colour, a couple of rising bubbles.
  bloop() {
    const t = this.ctx.currentTime;
    this.tone(t, { freq: 260, to: 520, duration: 0.11, level: 0.16 });
    this.tone(t + 0.07, { freq: 380, to: 760, duration: 0.09, level: 0.1 });
  }

  // Paper: a magazine picked up and its cover turned, or put back down.
  rustle() {
    const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      this.noiseBurst(t + i * 0.05 + Math.random() * 0.025, {
        duration: 0.05 + Math.random() * 0.04,
        level: 0.1 + Math.random() * 0.06,
        type: 'bandpass',
        freq: 1600 + Math.random() * 3000,
        q: 0.7,
      });
    }
  }

  // The tuner's relay clicking over inside the set.
  relay() {
    const t = this.ctx.currentTime;
    this.noiseBurst(t, { duration: 0.01, level: 2, type: 'bandpass', freq: 3200, q: 3 });
    this.tone(t, { freq: 1500, to: 700, duration: 0.02, level: 0.12, type: 'triangle' });
  }

  power(on) {
    const t = this.ctx.currentTime;
    const pitch = this.whine.frequency;
    pitch.cancelScheduledValues(t);
    if (on) {
      // Relay thunk, the degauss coil's hum, and crackle as the tube charges up.
      this.tone(t, { freq: 95, to: 45, duration: 0.25, level: 0.5 });
      this.noiseBurst(t, { duration: 0.012, level: 0.3, type: 'bandpass', freq: 2000 });
      this.degaussHum(t + 0.05);
      for (let i = 0; i < 16; i++) {
        this.noiseBurst(t + 0.2 + Math.random() * 1.6, {
          duration: 0.003 + Math.random() * 0.004,
          level: 0.04 + Math.random() * 0.1,
          type: 'highpass',
          freq: 3000,
        });
      }
      pitch.setValueAtTime(FLYBACK_HZ * 0.9, t);
      pitch.linearRampToValueAtTime(FLYBACK_HZ, t + 1.2);
    } else {
      this.tone(t, { freq: 140, to: 40, duration: 0.15, level: 0.35 });
      this.noiseBurst(t, { duration: 0.01, level: 0.25, type: 'bandpass', freq: 1800 });
      pitch.setValueAtTime(FLYBACK_HZ, t);
      pitch.exponentialRampToValueAtTime(FLYBACK_HZ * 0.82, t + 0.5);
    }
  }

  // The degauss coil: a big 60 Hz buzz that wobbles and dies away.
  degaussHum(t) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    const wobble = gain(ctx, 1);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 9;
    chain(lfo, gain(ctx, 0.4), wobble.gain);
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.3, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    chain(osc, biquad(ctx, 'lowpass', 420), wobble, env, this.hardware);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 1.5);
    lfo.stop(t + 1.5);
  }

  noiseBurst(t, { duration, level, type, freq, q = 0.7, out = this.hardware }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const env = gain(this.ctx, 0);
    env.gain.setValueAtTime(level, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    chain(src, biquad(this.ctx, type, freq, q), env, out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + duration + 0.02);
  }

  tone(t, { freq, to = freq, duration, level, type = 'sine', out = this.hardware }) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    const env = gain(this.ctx, 0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    chain(osc, env, out);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
}

function gain(ctx, value) {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

function biquad(ctx, type, frequency, Q = 0.7, gainDb = 0) {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = Q;
  node.gain.value = gainDb;
  return node;
}

function loop(ctx, buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

// connect(a, b, c...) in series; returns the last node.
function chain(...nodes) {
  return nodes.reduce((a, b) => a.connect(b));
}
