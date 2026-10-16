import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import './styles/main.scss';
import { cloneDefaults, createFx } from './screen/params.js';
import { SignalPass } from './screen/SignalPass.js';
import { ScreenMaterial } from './screen/ScreenMaterial.js';
import { OSD } from './screen/OSD.js';
import { degauss } from './screen/transitions.js';
import { Television } from './tv/Television.js';
import { Remote } from './tv/Remote.js';
import { AudioEngine, SOUND_DEFAULTS } from './audio/AudioEngine.js';
import { createScreenGeometry, SCREEN_HEIGHT, SCREEN_WIDTH } from './world/screenGeometry.js';
import { createEnvTexture, createSmudgeTexture } from './world/textures.js';
import { SCREEN_CENTER, TV } from './world/TV.js';
import { Room } from './world/Room.js';
import { TVGlow } from './world/TVGlow.js';
import { COUCH, EYE, FLOOR_LAMP, STAND, WINDOW } from './world/layout.js';
import { SeatedCamera } from './camera/SeatedCamera.js';
import { createTestSources, sourceFromFile } from './lab/sources.js';
import { createLabGui } from './lab/LabGui.js';
import { createRemotePad } from './lab/RemotePad.js';
import { createScreenRectOverlay } from './lab/ScreenRectOverlay.js';
import { loadSaved } from './lab/storage.js';

// Screen lab: the CRT pipeline (Phase 1), driven by the set's tuner, remote and
// sound (Phase 2), seen from the couch in a greybox apartment (Phase 3), or
// from an orbit camera, or as a flat screen.

const FIRST_CHANNEL = 1; // so number keys 1–9 land on the first nine channels

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2; // the screen ignores tone mapping, so this only lifts the room
renderer.shadowMap.enabled = true; // one caster: the neon through the blinds
renderer.shadowMap.type = THREE.PCFShadowMap;
RectAreaLightUniformsLib.init();

const params = cloneDefaults();
loadSaved(params);
const fx = createFx();
const state = { mode: 'seated', overlay: false, channel: FIRST_CHANNEL, preset: '80s living room', panel: true, timeScale: 1 };

// Screen pipeline: Stage A (signal) → Stage B (tube + glass).
const osd = new OSD();
const signal = new SignalPass(renderer, osd.texture);
const screenWorld = SCREEN_CENTER.clone().add(STAND.position).setY(SCREEN_CENTER.y + STAND.height);
const env = createEnvTexture({ origin: screenWorld, eye: EYE, couch: COUCH, floorLamp: FLOOR_LAMP, window: WINDOW });
const screenMaterial = new ScreenMaterial({ signal: signal.texture, env, smudge: createSmudgeTexture() });
const screenGeometry = createScreenGeometry();

// Flat view: the glass alone, head-on.
const flat = { scene: new THREE.Scene(), camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10) };
flat.scene.background = new THREE.Color('#060504');
flat.scene.add(new THREE.Mesh(screenGeometry, screenMaterial));
flat.camera.position.z = 1;

// The apartment, the set in it, and the light it throws.
const room = new Room({ env });
const tvModel = new TV({ screenGeometry, screenMaterial });
room.placeTV(tvModel);
const glow = new TVGlow(renderer, { width: 0.47, height: 0.35 });
glow.light.position.copy(tvModel.screenCenter).add(new THREE.Vector3(0, 0, 0.01));
tvModel.group.add(glow.light);

// Seated: you, on the couch. Orbit: a free debug camera around the room.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seated = new SeatedCamera({ eye: EYE, target: screenWorld });
seated.reducedMotion = reducedMotion;

const orbitCamera = new THREE.PerspectiveCamera(45, 1, 0.05, 50);
const controls = new OrbitControls(orbitCamera, canvas);
controls.enableDamping = true;
controls.minDistance = 0.5;
controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * 0.53;

function resetCamera() {
  orbitCamera.position.set(1.6, 1.7, 3.2);
  controls.target.set(0, 0.9, 0.8);
  controls.update();
}
resetCamera();

const overlay = createScreenRectOverlay();
document.body.append(overlay.el);

// The head turns a little towards the pointer.
window.addEventListener('pointermove', (e) => {
  seated.setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});
document.documentElement.addEventListener('pointerleave', () => seated.setPointer(0, 0));

// The set, its lineup and the remote. Every source gets a channel number;
// numbers without a source tune to dead air.
const lineup = createTestSources().map((source, i) => ({ number: FIRST_CHANNEL + i, name: source.name, source }));
const tv = new Television({ fx, osd, lineup, reducedMotion });
const remote = new Remote(tv);

let current = null;

function refit() {
  signal.setSource(current, params.source.fit, [params.source.focusX, params.source.focusY]);
}

function showSource(channel) {
  const source = channel?.source ?? null;
  if (source !== current) {
    current?.deactivate?.();
    if (current) current.onResize = null;
    current = source;
    if (current) {
      current.onResize = refit;
      current.activate?.();
    }
  }
  refit();
}

// Sound. Browsers only allow audio after a user gesture, so the first click or
// key press anywhere creates the engine (in the finished site, that's POWER).
const soundSettings = { ...SOUND_DEFAULTS };
let audio = null;

function startAudio() {
  if (audio) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) return;
  audio = new AudioEngine(new Context(), soundSettings);
  audio.preloadMusic(tv.lineup.map((c) => c.source.music).filter(Boolean));
  audio.setVolume(tv.volume, tv.muted);
  audio.setChannel(tv.on ? tv.channel : null);
  updateHud();
}
window.addEventListener('pointerdown', startAudio, true);
window.addEventListener('keydown', startAudio, true);

const nowPlaying = document.querySelector('#now-playing');
const soundLabel = document.querySelector('#sound');

function updateHud() {
  nowPlaying.textContent = tv.on
    ? `CH ${String(tv.number).padStart(2, '0')} · ${tv.channel?.name ?? 'no signal'}`
    : 'Off · press P or POWER';
  if (!audio) soundLabel.textContent = 'Sound: click or press a key to enable';
  else soundLabel.textContent = tv.muted ? 'Sound: muted' : `Sound: volume ${tv.volume}`;
}

tv.addEventListener('swap', (e) => {
  showSource(e.detail.channel);
  audio?.setChannel(e.detail.channel);
});
tv.addEventListener('tune', (e) => {
  state.channel = e.detail.number;
  updateHud();
});
tv.addEventListener('power', (e) => {
  tvModel.setPower(e.detail.on);
  document.body.classList.toggle('is-tv-on', e.detail.on);
  audio?.power(e.detail.on);
  if (!e.detail.on) audio?.setChannel(null);
  updateHud();
});
tv.addEventListener('relay', () => audio?.relay());
tv.addEventListener('volume', (e) => {
  audio?.setVolume(e.detail.level, e.detail.muted);
  updateHud();
});
remote.addEventListener('press', () => audio?.click());

document.body.append(createRemotePad(remote));

const MODES = ['seated', 'orbit', 'flat'];

function setMode(mode) {
  state.mode = mode;
  controls.enabled = mode === 'orbit';
  document.body.dataset.mode = mode;
}

async function addFiles(files) {
  let added = null;
  for (const file of files) {
    if (!/^(image|video)\//.test(file.type)) continue;
    try {
      const source = await sourceFromFile(file);
      const number = Math.max(FIRST_CHANNEL - 1, ...tv.lineup.map((c) => c.number)) + 1;
      tv.setLineup([...tv.lineup, { number, name: source.name, source }]);
      added = number;
    } catch (error) {
      console.warn(`Could not load ${file.name}`, error);
    }
  }
  if (added === null) return;
  lab.refreshChannels();
  tv.tune(added);
}

const fileInput = document.querySelector('#file');
fileInput.addEventListener('change', () => addFiles([...fileInput.files]));

const actions = {
  setMode,
  refit,
  resetCamera,
  press: (button) => remote.press(button),
  tune: (number) => tv.tune(number),
  channels: () => tv.lineup,
  degauss: () => degauss(fx),
  loadFile: () => fileInput.click(),
  setTimeScale(value) {
    // Browsers clamp playbackRate; 1/16 is the lowest Chrome allows.
    tv.lineup.forEach(({ source }) => source.video && (source.video.playbackRate = Math.max(0.0625, value)));
  },
};

const lab = createLabGui({ params, state, actions, glow, osd, renderer, tv, remote, soundSettings, seated, room });

// Drag and drop any image or video to tune it in.
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragDepth++;
  document.body.classList.add('is-dragging');
});
window.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) document.body.classList.remove('is-dragging');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('is-dragging');
  addFiles([...e.dataTransfer.files]);
});

// Keyboard → remote buttons. Channel and volume keys auto-repeat when held,
// like the real remote; everything else fires once per press.
const KEY_BUTTONS = {
  arrowup: 'ch+',
  arrowright: 'ch+',
  arrowdown: 'ch-',
  arrowleft: 'ch-',
  '+': 'vol+',
  '=': 'vol+',
  '-': 'vol-',
  _: 'vol-',
  p: 'power',
  m: 'mute',
  r: 'recall',
  backspace: 'recall',
};

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return; // leave browser shortcuts (zoom, etc.) alone
  const key = e.key.toLowerCase();
  const button = /^\d$/.test(key) ? key : KEY_BUTTONS[key];
  if (button) {
    if (!e.repeat || /^(ch|vol)[+-]$/.test(button)) remote.press(button);
    e.preventDefault();
    return;
  }
  if (e.repeat) return;
  switch (key) {
    case 'd':
      degauss(fx);
      break;
    case 'v':
      setMode(MODES[(MODES.indexOf(state.mode) + 1) % MODES.length]);
      break;
    case 'h':
      state.panel = !state.panel;
      lab.gui.show(state.panel);
      document.body.classList.toggle('is-clean', !state.panel);
      break;
    default:
      return;
  }
  e.preventDefault();
});

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  seated.setAspect(width / height);
  orbitCamera.aspect = width / height;
  orbitCamera.updateProjectionMatrix();

  // Fit the 4:3 glass in the flat view with a small margin.
  const aspect = width / height;
  let halfH = (SCREEN_HEIGHT / 2) * 1.08;
  let halfW = halfH * aspect;
  if (aspect < SCREEN_WIDTH / SCREEN_HEIGHT) {
    halfW = (SCREEN_WIDTH / 2) * 1.08;
    halfH = halfW / aspect;
  }
  Object.assign(flat.camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
  flat.camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// GSAP runs off the render loop rather than its own rAF chain, so transitions
// advance exactly once per rendered frame and never drift from the picture.
gsap.ticker.remove(gsap.updateRoot);

const fpsLabel = document.querySelector('#fps');
let fpsFrames = 0;
let fpsTime = 0;
let last = performance.now() / 1000;
let clock = 0; // lab time: runs slower than real time in slow motion
let frame = 0;

renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const realDt = Math.min(now - last, 0.1);
  const dt = realDt * state.timeScale;
  last = now;
  clock += dt;
  frame++;
  gsap.updateRoot(clock);

  current?.update?.(clock);
  signal.setOSDOpacity(osd.update(dt));
  signal.render(params, fx, clock, dt);
  screenMaterial.update(params, fx, signal.texture, clock, frame);
  audio?.update(fx);

  if (state.mode === 'flat') {
    overlay.hide();
    renderer.render(flat.scene, flat.camera);
  } else {
    const seatedView = state.mode === 'seated';
    const camera = seatedView ? seated.camera : orbitCamera;
    if (seatedView) seated.update(clock, dt);
    else controls.update();
    glow.update(signal.texture, fx.power * params.display.emission, realDt);
    room.update(clock, {
      tvColor: glow.light.color,
      tvLevel: glow.level,
      pixelScale: renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))),
    });
    renderer.render(room.scene, camera);
    if (seatedView && state.overlay) overlay.update(seated.screenRect(tvModel.screen), window.innerWidth, window.innerHeight);
    else overlay.hide();
  }

  fpsFrames++;
  fpsTime += realDt;
  if (fpsTime >= 0.5) {
    fpsLabel.textContent = `${Math.round(fpsFrames / fpsTime)} fps`;
    fpsFrames = 0;
    fpsTime = 0;
  }
});

setMode(state.mode);
updateHud();

if (import.meta.env.DEV) {
  window.lab = {
    params, fx, state, actions, renderer, seated, orbitCamera, controls, glow, room, tvModel, signal, osd, tv, remote,
    gsap,
    get audio() {
      return audio;
    },
    get clock() {
      return clock;
    },
  };
}
