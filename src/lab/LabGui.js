import GUI from 'lil-gui';
import { PRESETS, applyPreset } from '../screen/params.js';
import { clearSaved, lookOnly, save } from './storage.js';

// Tuning panel for the screen lab. Every look parameter is live; changes
// auto-save to this browser, and "Copy JSON" exports them for a preset.
export function createLabGui({ params, state, actions, glow, osd, renderer, tv, remote, soundSettings }) {
  const gui = new GUI({ title: 'Screen Lab' });
  gui.onFinishChange(() => save(params));

  const set = gui.addFolder('TV');
  set.add(state, 'mode', { 'TV set (3D)': 'tv', 'Flat screen': 'flat' }).name('View').listen().onChange(actions.setMode);
  set.add({ power: () => actions.press('power') }, 'power').name('Power   P');
  set.add({ up: () => actions.press('ch+') }, 'up').name('Channel ▲   ↑ →');
  set.add({ down: () => actions.press('ch-') }, 'down').name('Channel ▼   ↓ ←');
  set.add(actions, 'degauss').name('Degauss   D');
  set.add(actions, 'resetCamera').name('Reset camera');
  set.add(state, 'timeScale', 0.02, 1, 0.01).name('Speed (slow-mo)').onChange(actions.setTimeScale);
  set.add(glow, 'strength', 0, 1000, 5).name('Room glow');
  set.add(renderer, 'toneMappingExposure', 0.2, 5, 0.05).name('Room exposure');

  const source = gui.addFolder('Source');
  const channelOptions = () => Object.fromEntries(actions.channels().map((c) => [`${c.number} · ${c.name}`, c.number]));
  const channel = source.add(state, 'channel', channelOptions()).name('Channel').listen().onChange(actions.tune);
  source.add(params.source, 'fit', ['cover', 'contain']).name('Fit').onChange(actions.refit);
  source.add(params.source, 'focusX', 0, 1, 0.01).name('Focus X').onChange(actions.refit);
  source.add(params.source, 'focusY', 0, 1, 0.01).name('Focus Y').onChange(actions.refit);
  source.add(actions, 'loadFile').name('Load image / video…');
  source.add(osd, 'pinned').name('Pin OSD');

  const tuner = gui.addFolder('Tuner').close();
  tuner.add(tv, 'reducedMotion').name('Reduced motion');
  tuner.add(tv, 'roughChance', 0, 1, 0.05).name('Rough changes');
  tuner.add(remote, 'latency', 0, 0.3, 0.01).name('IR latency (s)');
  tuner.add(tv, 'searchHold', 0, 0.6, 0.01).name('Snow hold (s)');
  tuner.add(tv, 'surfHold', 0.05, 1, 0.01).name('Surf hold (s)');
  tuner.add(tv, 'entryTimeout', 0.5, 3, 0.1).name('Digit wait (s)');

  // Volume lives on the TV (it drives the OSD); the rest is the mix.
  const knob = {
    get volume() {
      return tv.volume;
    },
    set volume(level) {
      tv.setVolume(level);
    },
    get muted() {
      return tv.muted;
    },
    set muted(muted) {
      tv.setMuted(muted);
    },
  };
  const sound = gui.addFolder('Sound').close();
  sound.add(knob, 'volume', 0, 20, 1).name('TV volume').listen();
  sound.add(knob, 'muted').name('Mute   M').listen();
  sound.add(soundSettings, 'master', 0, 1, 0.01).name('Master');
  sound.add(soundSettings, 'static', 0, 1.5, 0.01).name('Static');
  sound.add(soundSettings, 'whine', 0, 1, 0.01).name('Flyback whine');
  sound.add(soundSettings, 'roomTone', 0, 1.5, 0.01).name('Room tone');

  const s = params.signal;
  const signal = gui.addFolder('Signal · Stage A').close();
  signal.add(s, 'roll', 0, 1, 0.001).name('Vertical roll');
  signal.add(s, 'rollSpeed', -1, 1, 0.01).name('V-hold drift');
  signal.add(s, 'rollBar', 0, 1, 0.01).name('Blanking bar');
  signal.add(s, 'hsync', 0, 1, 0.01).name('Sync tearing');
  signal.add(s, 'jitter', 0, 0.01, 0.0001).name('Line jitter');
  signal.add(s, 'wobble', 0, 0.01, 0.0001).name('H wobble');
  signal.add(s, 'snow', 0, 1, 0.01).name('Snow');
  signal.add(s, 'noise', 0, 0.3, 0.001).name('Noise');
  signal.add(s, 'brightness', -0.3, 0.3, 0.005).name('Brightness');
  signal.add(s, 'contrast', 0.5, 1.6, 0.01).name('Contrast');
  signal.add(s, 'saturation', 0, 2, 0.01).name('Colour');
  signal.add(s, 'hue', -0.6, 0.6, 0.01).name('Tint');
  signal.add(s, 'bleed', 0, 5, 0.05).name('Chroma bleed');
  signal.add(s, 'chromaShift', -4, 4, 0.05).name('Chroma shift');
  signal.add(s, 'ghost', 0, 0.5, 0.005).name('Ghost');
  signal.add(s, 'ghostOffset', 0, 0.06, 0.001).name('Ghost offset');
  signal.add(s, 'breathing', 0, 0.2, 0.001).name('Breathing');
  signal.add(s, 'persistence', 0, 0.95, 0.01).name('Persistence');

  const d = params.display;
  const display = gui.addFolder('Tube · Stage B').close();
  display.add(d, 'emission', 0, 4, 0.01).name('Brightness');
  display.add(d, 'barrel', 0, 0.2, 0.001).name('Barrel');
  display.add(d, 'overscan', 0, 0.15, 0.001).name('Overscan');
  display.add(d, 'cornerRadius', 0, 0.4, 0.005).name('Corner radius');
  display.add(d, 'scanlines', 120, 600, 1).name('Scanlines');
  display.add(d, 'scanlineStrength', 0, 1, 0.01).name('Scanline depth');
  display.add(d, 'beamSpread', 0, 0.4, 0.005).name('Beam bloom');
  display.add(d, 'maskType', { None: 0, 'Aperture grille': 1, 'Slot mask': 2 }).name('Phosphor mask');
  display.add(d, 'maskStrength', 0, 1, 0.01).name('Mask strength');
  display.add(d, 'maskTriads', 80, 640, 1).name('Mask triads');
  display.add(d, 'convergenceX', -0.006, 0.006, 0.0001).name('Convergence X');
  display.add(d, 'convergenceY', -0.006, 0.006, 0.0001).name('Convergence Y');
  display.add(d, 'halation', 0, 1, 0.01).name('Halation');
  display.add(d, 'halationLod', 1, 6, 0.1).name('Halation radius');
  display.add(d, 'vignette', 0, 1.5, 0.01).name('Vignette');
  display.add(d, 'edgeShadow', 0, 1, 0.01).name('Edge shadow');
  display.add(d, 'flicker', 0, 0.1, 0.001).name('Flicker');

  const g = params.glass;
  const glass = gui.addFolder('Glass').close();
  glass.addColor(g, 'tint').name('Body tint');
  glass.add(g, 'reflection', 0, 8, 0.05).name('Reflection');
  glass.add(g, 'roughness', 0, 1, 0.01).name('Roughness');
  glass.add(g, 'smudge', 0, 2, 0.01).name('Smudges');
  glass.add(g, 'envIntensity', 0, 3, 0.01).name('Room brightness');

  const presets = gui.addFolder('Presets');
  presets
    .add(state, 'preset', Object.keys(PRESETS))
    .name('Preset')
    .onChange((name) => {
      applyPreset(params, name);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      save(params);
    });
  const tools = {
    copy() {
      navigator.clipboard?.writeText(JSON.stringify(lookOnly(params), null, 2));
    },
    reset() {
      clearSaved();
      applyPreset(params, state.preset);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    },
  };
  presets.add(tools, 'copy').name('Copy JSON');
  presets.add(tools, 'reset').name('Reset to preset');

  return {
    gui,
    refreshChannels() {
      channel.options(channelOptions());
    },
  };
}
