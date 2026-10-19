import GUI from 'lil-gui';
import { PRESETS, applyPreset } from '../screen/params.js';
import { clearSaved, lookOnly, save } from './storage.js';

// Tuning panel for the screen lab. Every look parameter is live; changes
// auto-save to this browser, and "Copy JSON" exports them for a preset.
export function createLabGui({ params, state, actions, glow, osd, renderer, tv, remote, soundSettings, seated, room, rig, post }) {
  const gui = new GUI({ title: 'Screen Lab' }).close(); // collapsed until you open it
  gui.onFinishChange(() => save(params));

  const set = gui.addFolder('TV');
  set.add(state, 'mode', { 'Seated (you)': 'seated', 'Orbit (debug)': 'orbit', 'Flat screen': 'flat' }).name('View   V').listen().onChange(actions.setMode);
  set.add({ power: () => actions.press('power') }, 'power').name('Power   P');
  set.add(actions, 'replayIntro').name('Replay the intro');
  set.add({ up: () => actions.press('ch+') }, 'up').name('Channel ▲   ↑ →');
  set.add({ down: () => actions.press('ch-') }, 'down').name('Channel ▼   ↓ ←');
  set.add(actions, 'degauss').name('Degauss   D');
  set.add(actions, 'resetCamera').name('Reset orbit camera');
  set.add(state, 'timeScale', 0.02, 1, 0.01).name('Speed (slow-mo)').onChange(actions.setTimeScale);
  set.add(glow, 'strength', 0, 1000, 5).name('Room glow');
  set.add(renderer, 'toneMappingExposure', 0.2, 5, 0.05).name('Room exposure');
  set.add(state, 'hud').name('Info & help panel').onChange(actions.showLabExtras);
  set.add(state, 'remotePad').name('2D remote').onChange(actions.showLabExtras);

  const source = gui.addFolder('Source');
  const channelOptions = () => Object.fromEntries(actions.channels().map((c) => [`${c.number} · ${c.name}`, c.number]));
  const channel = source.add(state, 'channel', channelOptions()).name('Channel').listen().onChange(actions.tune);
  source.add(params.source, 'fit', ['cover', 'contain']).name('Fit').onChange(actions.refit);
  source.add(params.source, 'focusX', 0, 1, 0.01).name('Focus X').onChange(actions.refit);
  source.add(params.source, 'focusY', 0, 1, 0.01).name('Focus Y').onChange(actions.refit);
  source.add(actions, 'loadFile').name('Load image / video…');
  source.add(osd, 'pinned').name('Pin OSD');

  const view = gui.addFolder('Camera').close();
  const reframe = () => seated.frame();
  view.add(seated.settings, 'fov', 30, 60, 0.5).name('Preferred FOV').onChange(reframe);
  view.add(seated.settings, 'frameWidth', 0.5, 2, 0.01).name('Keep width (m)').onChange(reframe);
  view.add(seated.settings, 'frameHeight', 0.5, 2, 0.01).name('Keep height (m)').onChange(reframe);
  view.add(seated.settings, 'tvHeight', -0.5, 0.6, 0.01).name('TV height in frame');
  view.add(seated.settings, 'breathing', 0, 3, 0.05).name('Breathing');
  view.add(seated.settings, 'lookAround', 0, 3, 0.05).name('Look around');
  view.add(state, 'overlay').name('Show screen rect');

  const a = rig.settings;
  const arm = gui.addFolder('Arm & remote').close();
  arm.add(a, 'x', -0.3, 0.3, 0.005).name('Across');
  arm.add(a, 'y', -0.45, 0.05, 0.005).name('Height');
  arm.add(a, 'distance', 0.25, 0.8, 0.005).name('Reach');
  arm.add(a, 'tilt', -0.2, 1.2, 0.01).name('Face tilt');
  arm.add(a, 'roll', -0.8, 0.8, 0.01).name('Roll');
  arm.add(a, 'hand', { 'WebXR model': 'webxr', 'Built-in (code)': 'procedural' }).name('Hand');
  arm.add(a, 'follow', 0, 3, 0.05).name('Follow pointer');
  arm.add(a, 'area', 0.3, 1, 0.01).name('Remote area (× height)');
  arm.add(a, 'areaWidth', 0.3, 1.5, 0.01).name('Remote area width (× its height)');
  arm.add(a, 'areaRight', 0, 0.6, 0.01).name('Remote area: extra on the right');
  arm.add(a, 'areaLift', 0, 0.6, 0.01).name('Remote area: bottom raised');
  arm.add(a, 'size', 0.6, 1.6, 0.01).name('Size');
  arm.add(a, 'snap', 0, 1, 0.01).name('Thumb snap');
  arm.add(a, 'highlight').name('Highlight target');

  const p = post.settings;
  const postFolder = gui.addFolder('Post-processing').close();
  postFolder.add(p, 'quality', { Auto: 'auto', High: 'high', 'Medium (no AO)': 'medium', 'Low (off)': 'low' }).name('Quality');
  postFolder.add({ get inUse() { return post.tier; } }, 'inUse').name('In use').listen().disable();
  postFolder.add(p, 'ao', 0, 2, 0.05).name('Ambient occlusion');
  postFolder.add(p, 'aoRadius', 0.05, 1, 0.01).name('AO radius (m)');
  postFolder.add(p, 'bloom', 0, 2, 0.01).name('Bloom');
  postFolder.add(p, 'bloomRadius', 0, 1, 0.01).name('Bloom spread');
  postFolder.add(p, 'bloomThreshold', 0, 1, 0.01).name('Bloom threshold');
  postFolder.add(p, 'screenGlow', 0, 1, 0.01).name('Screen glow');
  postFolder.add(p, 'grain', 0, 0.2, 0.005).name('Grain');
  postFolder.add(p, 'vignette', 0, 1, 0.01).name('Vignette');
  postFolder.add(p, 'saturation', 0, 2, 0.01).name('Saturation');
  postFolder.add(p, 'contrast', 0.5, 1.5, 0.01).name('Contrast');
  postFolder.addColor(p, 'shadowTint').name('Shadow tint');
  postFolder.add(p, 'tint', 0, 0.3, 0.005).name('Shadow tint amount');

  const r = room.settings;
  const roomFolder = gui.addFolder('Room').close();
  roomFolder.add(r, 'lamps').name('Lamps on');
  roomFolder.add(r, 'lampLevel', 0, 3, 0.05).name('Lamp brightness');
  roomFolder.add(r, 'neon', 0, 3, 0.05).name('Neon sign');
  roomFolder.add(r, 'flicker').name('Neon flicker');
  roomFolder.add(r, 'bookshelf').name('Bookshelf + lava lamp');
  roomFolder.add(r, 'lavaLight', 0, 2, 0.01).name('Lava lamp light');
  roomFolder.add(r, 'radioLight', 0, 0.3, 0.005).name('Clock radio glow');
  roomFolder.add(r, 'blinds', -1.5, 1.5, 0.01).name('Blind tilt');
  roomFolder.add(r, 'dust', 0, 3, 0.05).name('Dust brightness');
  roomFolder.add(r, 'dustSize', 0.2, 5, 0.05).name('Dust size');
  roomFolder.add(r, 'tableReflectivity', 0, 1, 0.01).name('Table reflectivity');
  roomFolder.add(r, 'tableGloss', 0, 1, 0.01).name('Table gloss');
  roomFolder.add(r, 'rain').name('Rain');
  roomFolder.add(actions, 'drink').name('Have a drink (or click the can)');

  const tuner = gui.addFolder('Tuner').close();
  tuner.add(tv, 'reducedMotion').name('Reduced motion');
  tuner.add(tv, 'roughChance', 0, 1, 0.05).name('Rough changes');
  tuner.add(remote, 'latency', 0, 0.3, 0.01).name('IR latency (s)');
  tuner.add(tv, 'searchHold', 0, 0.6, 0.01).name('Snow hold (s)');
  tuner.add(tv, 'surfHold', 0.05, 1, 0.01).name('Surf hold (s)');

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
  sound.add(soundSettings, 'music', 0, 1.5, 0.01).name('Channel music');
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
    // How the WebXR hand holds the remote; added once the model has loaded.
    addGripControls(hand) {
      const g = hand.settings;
      const grip = arm.addFolder('Grip (WebXR hand)').close();
      const apply = () => hand.applyGrip();
      [
        ['wristX', -0.15, 0.02, 0.001, 'Wrist across'],
        ['wristY', -0.12, 0.02, 0.001, 'Wrist height'],
        ['wristZ', -0.18, 0.02, 0.001, 'Wrist along'],
        ['heading', -0.6, 1.8, 0.01, 'Hand heading'],
        ['elevation', -1, 0.7, 0.01, 'Hand tilt'],
        ['roll', -1.8, 1.8, 0.01, 'Palm roll'],
        ['scale', 0.8, 1.4, 0.01, 'Hand size'],
        ['bendKnuckle', 0, 1.9, 0.01, 'Finger bend: knuckle'],
        ['bendMiddle', 0, 1.9, 0.01, 'Finger bend: middle'],
        ['bendEnd', 0, 1.9, 0.01, 'Finger bend: end'],
        ['wrapIndex', 0.5, 1.6, 0.01, 'Wrap: index'],
        ['wrapMiddle', 0.5, 1.6, 0.01, 'Wrap: middle'],
        ['wrapRing', 0.5, 1.6, 0.01, 'Wrap: ring'],
        ['wrapPinky', 0.5, 1.6, 0.01, 'Wrap: pinky'],
        ['thumbLength', 0.9, 1.4, 0.01, 'Thumb length'],
        ['thumbSwing', 0, 0.9, 0.01, 'Thumb swing (CMC)'],
        ['slideFollow', 0, 1, 0.01, 'Grip follows thumb'],
      ].forEach(([key, min, max, step, name]) => grip.add(g, key, min, max, step).name(name).onChange(apply));
      grip
        .add(
          {
            copy: () =>
              navigator.clipboard?.writeText(JSON.stringify(g, null, 2)).catch(() => console.log(JSON.stringify(g, null, 2))),
          },
          'copy',
        )
        .name('Copy grip JSON');
    },
    // How the left hand holds the can; added once the model has loaded. The
    // fingers and thumb wrap themselves round it from wherever this puts them.
    addCanGripControls(hand) {
      const g = hand.settings;
      const grip = roomFolder.addFolder('Can grip (left hand)').close();
      const apply = () => hand.applyGrip();
      [
        ['wristX', -0.15, 0, 0.001, 'Wrist across'],
        ['wristY', -0.08, 0.04, 0.001, 'Wrist height'],
        ['wristZ', -0.02, 0.15, 0.001, 'Wrist back'],
        ['heading', -0.8, 0.8, 0.01, 'Hand heading'],
        ['pitch', -0.8, 0.8, 0.01, 'Hand tilt'],
        ['roll', -0.8, 0.8, 0.01, 'Palm roll'],
        ['scale', 0.8, 1.4, 0.01, 'Hand size'],
        ['thumbAround', -0.8, 1.2, 0.01, 'Thumb round the can'],
        ['thumbHeight', -0.04, 0.06, 0.001, 'Thumb height'],
        ['thickness', 0.004, 0.014, 0.0005, 'Finger thickness'],
      ].forEach(([key, min, max, step, name]) => grip.add(g, key, min, max, step).name(name).onChange(apply));
      grip
        .add({ copy: () => navigator.clipboard?.writeText(JSON.stringify(g, null, 2)).catch(() => console.log(JSON.stringify(g, null, 2))) }, 'copy')
        .name('Copy grip JSON');
    },
  };
}
