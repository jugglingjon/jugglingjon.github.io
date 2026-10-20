import { gsap } from 'gsap';
import {
  acquireSignal,
  calm,
  deadAir,
  loseSignal,
  powerOff as powerOffFx,
  powerOn as powerOnFx,
  rejoinSearch,
} from '../screen/transitions.js';

export const VOLUME_STEPS = 20;

// Number buttons tune straight away: 1–9 are channels 1–9, and 0 (the tenth
// key) is channel 10.
export const digitChannel = (digit) => (digit === '0' ? 10 : Number(digit));

// The set itself: power, tuner, volume and on-screen display. Remote buttons
// arrive through receive(); the picture reacts through the shared `fx` object
// and the OSD. Times are seconds on the GSAP clock, so the lab's slow motion
// applies to everything here.
//
// Tuner phases:
//   off → locked ⇄ losing → searching → acquiring → locked
//                                     ↘ dead (no station on this number)
// Presses mid-change never restart the sequence: the tuner stays in the snow,
// swaps stations under it, and only locks once the viewer pauses.
//
// It can also power on into a station ident (powerOnWithIdent): the ident is
// on air in place of the channel, then the set switches itself off. A button
// on the remote cuts it short and does its job (the set changes over to the
// channel as if you'd tuned to it), and so does tuning to a channel.
//
// Events (detail in brackets):
//   power {on} · tune {number, channel} · swap {number, channel}
//   phase {phase} · relay · volume {level, muted}
export class Television extends EventTarget {
  constructor({ fx, osd, lineup = [], reducedMotion = false }) {
    super();
    this.fx = fx;
    this.osd = osd;
    this.reducedMotion = reducedMotion;
    this.roughChance = 0.2; // share of channel changes that come in extra wobbly
    this.searchHold = 0.12; // seconds of snow on a single press
    this.surfHold = 0.25; // seconds of quiet needed before locking while surfing

    this.on = false;
    this.phase = 'off';
    this.volume = 8;
    this.muted = false;
    this.surfing = false;
    this.look = { rough: 1, dir: 1 };
    this.timeline = null;
    this.acquireCall = null;
    this.osdCall = null;
    this.ident = null; // { name, source } on air in place of the channel, if any
    this.identCall = null;

    this.setLineup(lineup);
    this.number = this.lineup[0]?.number ?? 2;
    this.previous = this.number;
  }

  // Lineup entries are { number, name, source }. Numbers may have gaps;
  // tuning a gap gives dead air, and CH ▲/▼ skip over it.
  setLineup(lineup) {
    this.lineup = [...lineup].sort((a, b) => a.number - b.number);
  }

  channelAt(number) {
    return this.lineup.find((c) => c.number === number) ?? null;
  }

  // What's on: the ident while it's airing, else the station on this number.
  get channel() {
    return this.ident ?? this.channelAt(this.number);
  }

  receive(button) {
    if (this.ident && button !== 'power') this.endIdent(); // any other button cuts it short, then does its job
    if (button === 'power') {
      this.on ? this.powerOff() : this.powerOn();
      return;
    }
    if (!this.on) return;
    if (/^\d$/.test(button)) {
      this.tune(digitChannel(button));
      return;
    }
    switch (button) {
      case 'ch+':
        return this.step(1);
      case 'ch-':
        return this.step(-1);
      case 'recall':
        return this.tune(this.previous);
      case 'vol+':
        return this.setVolume(this.volume + 1);
      case 'vol-':
        return this.setVolume(this.volume - 1);
      case 'mute':
        return this.setMuted(!this.muted);
    }
  }

  powerOn() {
    if (this.on) return;
    this.on = true;
    this.killTuner();
    calm(this.fx);
    powerOnFx(this.fx);
    this.emit('power', { on: true });
    this.emit('swap', { number: this.number, channel: this.channel });
    if (this.channel) {
      this.setPhase('locked');
    } else {
      this.setPhase('dead');
      this.timeline = deadAir(this.fx, { reducedMotion: this.reducedMotion });
    }
    // The OSD comes up once the tube has warmed enough to show it (not over an ident).
    this.osdCall = gsap.delayedCall(0.9, () => {
      if (!this.ident) {
        this.osd.setChannel(this.number);
        if (this.channel) this.osd.setCaption(this.channel.name);
      }
      if (this.muted) this.osd.setMute(true);
    });
  }

  // Power on into `ident` ({ name, source }) for `seconds`, then off again.
  powerOnWithIdent(ident, seconds) {
    if (this.on) return;
    this.ident = ident;
    this.powerOn();
    this.identCall = gsap.delayedCall(seconds, () => this.powerOff());
  }

  // Off the ident and over to the channel, as if you'd tuned to it.
  endIdent() {
    if (!this.ident) return;
    this.dropIdent();
    this.osd.setChannel(this.number);
    this.osd.setCaption('');
    this.changeChannel();
  }

  powerOff() {
    if (!this.on) return;
    this.on = false;
    this.killTuner();
    this.ident = null;
    calm(this.fx);
    powerOffFx(this.fx);
    this.osd.clear();
    this.setPhase('off');
    this.emit('power', { on: false });
  }

  step(dir) {
    if (!this.lineup.length) return;
    const numbers = this.lineup.map((c) => c.number);
    const next =
      dir > 0
        ? (numbers.find((n) => n > this.number) ?? numbers[0])
        : (numbers.findLast((n) => n < this.number) ?? numbers[numbers.length - 1]);
    this.tune(next);
  }

  // Change channel. While the set is off this only presets the number (used by
  // the lab's channel picker); the remote can't reach tune() when off.
  // Off the ident, with no change of channel (the caller makes one).
  dropIdent() {
    this.identCall?.kill();
    this.identCall = null;
    this.ident = null;
  }

  tune(number) {
    // Tuning in ends the ident: over to the channel picked.
    if (this.ident && number === this.number) return this.endIdent();
    if (this.ident) this.dropIdent();
    if (number === this.number) {
      if (this.on) this.osd.setChannel(number);
      return;
    }
    this.previous = this.number;
    this.number = number;
    this.emit('tune', { number, channel: this.channel });
    if (!this.on) return;
    this.osd.setChannel(number);
    this.osd.setCaption('');
    this.changeChannel();
  }

  changeChannel() {
    const from = this.phase;
    if (from === 'losing') {
      this.surfing = true; // the swap at the end of the loss picks up the latest number
      return;
    }
    if (from === 'searching') {
      this.surfing = true;
      this.swap();
      this.holdThenAcquire(this.surfHold);
      return;
    }
    this.timeline?.kill();
    this.setPhase('losing');
    const motion = { reducedMotion: this.reducedMotion };
    if (from === 'locked') {
      this.surfing = false;
      this.look = { rough: Math.random() < this.roughChance ? 1.5 : 1, dir: Math.random() < 0.5 ? -1 : 1 };
      this.timeline = loseSignal(this.fx, { ...this.look, ...motion });
    } else {
      // Mid-acquire or leaving dead air: we're already in the snow, more or less.
      this.surfing = from === 'acquiring';
      this.timeline = rejoinSearch(this.fx, motion);
    }
    this.timeline.call(() => this.search());
  }

  search() {
    this.setPhase('searching');
    this.swap();
    this.holdThenAcquire(this.surfing ? this.surfHold : this.searchHold);
  }

  swap() {
    this.fx.chroma = 0;
    this.emit('relay');
    this.emit('swap', { number: this.number, channel: this.channel });
  }

  holdThenAcquire(hold) {
    this.acquireCall?.kill();
    this.acquireCall = gsap.delayedCall(hold, () => this.acquire());
  }

  acquire() {
    this.acquireCall = null;
    this.timeline?.kill();
    const channel = this.channel;
    if (!channel) {
      this.setPhase('dead');
      this.timeline = deadAir(this.fx, { reducedMotion: this.reducedMotion });
      return;
    }
    this.setPhase('acquiring');
    this.timeline = acquireSignal(this.fx, { ...this.look, reducedMotion: this.reducedMotion }).call(() => {
      this.setPhase('locked');
      this.osd.setCaption(channel.name);
    });
  }

  setVolume(level) {
    this.volume = Math.max(0, Math.min(VOLUME_STEPS, level));
    this.muted = false;
    this.osd.setMute(false);
    this.osd.setVolume(this.volume, VOLUME_STEPS);
    this.emit('volume', { level: this.volume, muted: false });
  }

  setMuted(muted) {
    this.muted = muted;
    this.osd.setMute(muted);
    this.emit('volume', { level: this.volume, muted });
  }

  setPhase(phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.emit('phase', { phase });
  }

  killTuner() {
    this.timeline?.kill();
    this.acquireCall?.kill();
    this.osdCall?.kill();
    this.identCall?.kill();
    this.timeline = this.acquireCall = this.osdCall = this.identCall = null;
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
