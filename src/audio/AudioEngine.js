import { brownNoise, roomImpulse, softClipCurve, whiteNoise } from './synth.js';

const FLYBACK_HZ = 15734; // NTSC line rate: the CRT's high-pitched whine

export const SOUND_DEFAULTS = { master: 0.8, music: 1, static: 1, whine: 0.3, roomTone: 0.5 };
const MUSIC_GAIN = 1.5; // music level at settings.music = 1
const RADIO_GAIN = 0.28; // the clock radio's station is mastered loud: about as loud as the TV at its starting volume
const RADIO_PAN = 0.4; // the bookshelf is off to your right

// Everything you hear. The set's own sounds are synthesized with Web Audio;
// only channel music, video soundtracks and the clock radio come from files.
//
//   TV speaker: channel music, soundtracks and static, through a small boxy
//   speaker and the room, scaled by the set's volume. Static tracks the snow
//   on screen, so picture and sound can never drift apart.
//   Hardware: remote clicks, the tuner relay, power thunk, degauss hum and
//   flyback whine come from the plastic and the chassis, so the volume knob
//   doesn't touch them.
//   Clock radio: its own speaker on the bookshelf (see toggleRadio).
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

  // The clock radio on the bookshelf: click it on, click it off again (it
  // picks up where it left off, or from the top once the song has ended). The
  // station is an MP3, streamed rather than decoded up front, through a
  // little speaker off to your right. Returns whether it's now playing.
  toggleRadio(url) {
    const t = this.ctx.currentTime;
    this.noiseBurst(t, { duration: 0.018, level: 0.3, type: 'bandpass', freq: 3400, q: 1.5 }); // its switch
    this.tone(t, { freq: 420, to: 260, duration: 0.04, level: 0.05 });
    if (!this.radio) {
      this.radio = new Audio(url);
      if (this.ctx.createMediaElementSource) {
        const out = this.ctx.createStereoPanner();
        out.pan.value = RADIO_PAN;
        chain(
          this.ctx.createMediaElementSource(this.radio),
          biquad(this.ctx, 'highpass', 150),
          biquad(this.ctx, 'lowpass', 6500),
          biquad(this.ctx, 'peaking', 1600, 1, 3),
          gain(this.ctx, RADIO_GAIN),
          out,
        );
        out.connect(this.master);
        out.connect(this.room);
      } else this.radio.volume = RADIO_GAIN;
    }
    if (!this.radio.paused) {
      this.radio.pause();
      return false;
    }
    this.radio.play().catch((error) => console.warn(`The radio couldn't play ${url}`, error));
    return true;
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

  // The can, lifted off the table: a light tink of aluminium on wood.
  canPick() {
    const t = this.ctx.currentTime;
    this.noiseBurst(t, { duration: 0.03, level: 1, type: 'bandpass', freq: 2600, q: 2 });
    this.tone(t, { freq: 2350, to: 2300, duration: 0.12, level: 0.1 });
  }

  // …and put back down: a hollow tok.
  canSet() {
    const t = this.ctx.currentTime;
    this.tone(t, { freq: 420, to: 260, duration: 0.07, level: 0.4, type: 'triangle' });
    this.noiseBurst(t, { duration: 0.025, level: 0.5, type: 'bandpass', freq: 1800, q: 1.5 });
    this.tone(t, { freq: 1900, to: 1850, duration: 0.15, level: 0.035 });
  }

  // The tab: a sharp crack as the seal breaks, then the fizz, settling into a
  // faint crackle of bubbles.
  canOpen() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.noiseBurst(t, { duration: 0.012, level: 0.45, type: 'highpass', freq: 2500 });
    this.tone(t, { freq: 3200, to: 1400, duration: 0.03, level: 0.04, type: 'triangle' });
    const fizz = ctx.createBufferSource();
    fizz.buffer = this.noise;
    const band = biquad(ctx, 'bandpass', 6500, 0.9);
    band.frequency.setValueAtTime(6500, t);
    band.frequency.exponentialRampToValueAtTime(4200, t + 0.9);
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0, t + 0.008);
    env.gain.linearRampToValueAtTime(0.32, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.045, t + 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    chain(fizz, biquad(ctx, 'highpass', 2500), band, env, this.hardware);
    fizz.start(t, Math.random() * 1.5);
    fizz.stop(t + 1.15);
    for (let i = 0; i < 14; i++) {
      this.noiseBurst(t + 0.2 + Math.random() * 1.1, { duration: 0.004, level: 0.04 + Math.random() * 0.05, type: 'highpass', freq: 5000 });
    }
  }

  // A swallow: a soft glug in the throat.
  gulp() {
    const t = this.ctx.currentTime;
    const pitch = 0.9 + Math.random() * 0.2;
    this.tone(t, { freq: 190 * pitch, to: 85 * pitch, duration: 0.14, level: 0.5 });
    this.noiseBurst(t + 0.02, { duration: 0.09, level: 0.3, type: 'bandpass', freq: 420 * pitch, q: 4 });
    this.tone(t + 0.05, { freq: 640 * pitch, to: 980 * pitch, duration: 0.05, level: 0.05 });
  }

  // A satisfied "ahhh": a voice falling in pitch through the formants of the
  // vowel, breathy as it starts and as it trails off.
  ahh() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const length = 1.2;
    const voice = ctx.createOscillator();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(185, t);
    voice.frequency.linearRampToValueAtTime(160, t + 0.25);
    voice.frequency.exponentialRampToValueAtTime(105, t + length);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 5.2;
    wobble.connect(gain(ctx, 2)).connect(voice.frequency);
    const voiced = gain(ctx, 0);
    voiced.gain.setValueAtTime(0, t);
    voiced.gain.linearRampToValueAtTime(0.55, t + 0.14);
    voiced.gain.setValueAtTime(0.55, t + 0.55);
    voiced.gain.exponentialRampToValueAtTime(0.0001, t + length);
    voice.connect(voiced);

    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    const breathy = gain(ctx, 0);
    breathy.gain.setValueAtTime(0, t);
    breathy.gain.linearRampToValueAtTime(0.5, t + 0.06);
    breathy.gain.exponentialRampToValueAtTime(0.06, t + 0.35);
    breathy.gain.linearRampToValueAtTime(0.12, t + length - 0.2);
    breathy.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.15);
    breath.connect(breathy);

    // "ah": the first three formants of the vowel, summed.
    const mouth = gain(ctx, 1);
    for (const [freq, q, level] of [[780, 7, 1], [1180, 9, 0.5], [2600, 12, 0.16]]) {
      voiced.connect(biquad(ctx, 'bandpass', freq, q)).connect(gain(ctx, level)).connect(mouth);
      breathy.connect(biquad(ctx, 'bandpass', freq, q / 2)).connect(gain(ctx, level * 0.6)).connect(mouth);
    }
    mouth.connect(biquad(ctx, 'lowpass', 3800)).connect(this.hardware);
    for (const source of [voice, wobble, breath]) {
      source.start(t);
      source.stop(t + length + 0.2);
    }
  }

  // The terracotta pot coming back down on the carpet after its twirl: a
  // dull, muffled thud, a knock of clay, a faint ring, and the soil settling.
  potClunk() {
    const t = this.ctx.currentTime;
    this.tone(t, { freq: 150, to: 85, duration: 0.13, level: 0.55 });
    this.noiseBurst(t, { duration: 0.05, level: 0.5, type: 'bandpass', freq: 640, q: 3 });
    this.tone(t + 0.004, { freq: 830, to: 812, duration: 0.16, level: 0.035, type: 'triangle' });
    this.noiseBurst(t + 0.02, { duration: 0.09, level: 0.06, type: 'bandpass', freq: 2600, q: 1 });
  }

  // The stuffed panda's squeaker: a reedy squeal as it's squeezed, and a
  // softer, falling one as it fills back up with air.
  squeak() {
    const t = this.ctx.currentTime;
    const pitch = 0.92 + Math.random() * 0.16;
    this.squeal(t, { from: 950 * pitch, to: 1650 * pitch, duration: 0.16, level: 0.25 });
    this.squeal(t + 0.2, { from: 1500 * pitch, to: 1100 * pitch, duration: 0.13, level: 0.11 });
  }

  squeal(t, { from, to, duration, level }) {
    const ctx = this.ctx;
    const reed = ctx.createOscillator();
    reed.type = 'square';
    reed.frequency.setValueAtTime(from, t);
    reed.frequency.exponentialRampToValueAtTime(to, t + duration * 0.7);
    // The rubber flutters as the air squeezes past.
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 32;
    flutter.connect(gain(ctx, from * 0.03)).connect(reed.frequency);
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + 0.015);
    env.gain.setValueAtTime(level, t + duration * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    chain(reed, biquad(ctx, 'bandpass', 2300, 1.6), biquad(ctx, 'lowpass', 5000), env, this.hardware);
    for (const source of [reed, flutter]) {
      source.start(t);
      source.stop(t + duration + 0.02);
    }
    this.noiseBurst(t, { duration: duration * 0.6, level: level * 0.25, type: 'bandpass', freq: 3200, q: 1.2 });
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
