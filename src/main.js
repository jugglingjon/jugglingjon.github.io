import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import './styles/main.scss';
import { cloneDefaults, createFx } from './screen/params.js';
import { SignalPass } from './screen/SignalPass.js';
import { ScreenMaterial } from './screen/ScreenMaterial.js';
import { OSD } from './screen/OSD.js';
import { channelChange, degauss, powerOff, powerOn } from './screen/transitions.js';
import { createScreenGeometry, SCREEN_HEIGHT, SCREEN_WIDTH } from './world/screenGeometry.js';
import { createEnvTexture, createSmudgeTexture } from './world/textures.js';
import { TV } from './world/TV.js';
import { Stage } from './world/Stage.js';
import { TVGlow } from './world/TVGlow.js';
import { createTestSources, sourceFromFile } from './lab/sources.js';
import { createLabGui } from './lab/LabGui.js';
import { loadSaved } from './lab/storage.js';

// Phase 1 screen lab: tune the two-stage CRT pipeline on a flat screen or on a
// procedural TV in a greybox corner of the apartment.

const FIRST_CHANNEL = 2; // VHF starts at 2

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2; // the screen ignores tone mapping, so this only lifts the room
RectAreaLightUniformsLib.init();

const params = cloneDefaults();
loadSaved(params);
const fx = createFx();
const state = { mode: 'tv', channel: 0, power: false, preset: '80s living room', panel: true, timeScale: 1 };

// Screen pipeline: Stage A (signal) → Stage B (tube + glass).
const osd = new OSD();
const signal = new SignalPass(renderer, osd.texture);
const env = createEnvTexture();
const screenMaterial = new ScreenMaterial({ signal: signal.texture, env, smudge: createSmudgeTexture() });
const screenGeometry = createScreenGeometry();

// Flat view: the glass alone, head-on.
const flat = { scene: new THREE.Scene(), camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10) };
flat.scene.background = new THREE.Color('#060504');
flat.scene.add(new THREE.Mesh(screenGeometry, screenMaterial));
flat.camera.position.z = 1;

// TV set view.
const stage = new Stage({ env });
const tv = new TV({ screenGeometry, screenMaterial });
stage.placeTV(tv);
const glow = new TVGlow(renderer, { width: 0.47, height: 0.35 });
glow.light.position.copy(tv.screenCenter).add(new THREE.Vector3(0, 0, 0.01));
tv.group.add(glow.light);
tv.group.updateMatrixWorld(true);
const screenWorld = tv.group.localToWorld(tv.screenCenter);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 0.5;
controls.maxDistance = 4.5;
controls.maxPolarAngle = Math.PI * 0.53;

function resetCamera() {
  // Roughly where you'd sit on the couch.
  camera.position.set(0.25, 1.12, 2.35);
  controls.target.copy(screenWorld);
  controls.update();
}
resetCamera();

// Channels.
const sources = createTestSources();
let current = null;

function refit() {
  signal.setSource(current, params.source.fit, [params.source.focusX, params.source.focusY]);
}

function setSource(index) {
  if (current) {
    current.deactivate?.();
    current.onResize = null;
  }
  current = sources[index];
  current.onResize = refit;
  current.activate?.();
  refit();
  osd.show(index + FIRST_CHANNEL, current.name);
  nowPlaying.textContent = `CH ${String(index + FIRST_CHANNEL).padStart(2, '0')} · ${current.name}`;
}

function tune(index) {
  state.channel = index;
  if (!state.power) {
    setSource(index);
    return;
  }
  channelChange(fx, () => setSource(state.channel));
}

const step = (dir) => tune((state.channel + dir + sources.length) % sources.length);

function togglePower() {
  state.power = !state.power;
  tv.setPower(state.power);
  if (state.power) {
    powerOn(fx);
    osd.show(state.channel + FIRST_CHANNEL, current.name);
  } else {
    powerOff(fx);
  }
}

function setMode(mode) {
  state.mode = mode;
  controls.enabled = mode === 'tv';
  document.body.dataset.mode = mode;
}

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!/^(image|video)\//.test(file.type)) continue;
    try {
      sources.push(await sourceFromFile(file));
      added++;
    } catch (error) {
      console.warn(`Could not load ${file.name}`, error);
    }
  }
  if (!added) return;
  lab.refreshChannels();
  tune(sources.length - 1);
}

const fileInput = document.querySelector('#file');
fileInput.addEventListener('change', () => addFiles([...fileInput.files]));

const actions = {
  setMode,
  tune,
  refit,
  resetCamera,
  togglePower,
  channelUp: () => step(1),
  channelDown: () => step(-1),
  degauss: () => degauss(fx),
  loadFile: () => fileInput.click(),
  setTimeScale(value) {
    // Browsers clamp playbackRate; 1/16 is the lowest Chrome allows.
    sources.forEach((s) => s.video && (s.video.playbackRate = Math.max(0.0625, value)));
  },
  channelNames: () => sources.map((s) => s.name),
};

const nowPlaying = document.querySelector('#now-playing');
const lab = createLabGui({ params, state, actions, glow, osd, renderer });

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

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'arrowright':
      step(1);
      break;
    case 'arrowdown':
    case 'arrowleft':
      step(-1);
      break;
    case 'p':
      togglePower();
      break;
    case 'd':
      degauss(fx);
      break;
    case 'v':
      setMode(state.mode === 'tv' ? 'flat' : 'tv');
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
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

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

  if (state.mode === 'tv') {
    controls.update();
    stage.update(clock);
    glow.update(signal.texture, fx.power * params.display.emission, realDt);
    renderer.render(stage.scene, camera);
  } else {
    renderer.render(flat.scene, flat.camera);
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
setSource(0);
setTimeout(togglePower, 600);

if (import.meta.env.DEV) window.lab = { params, fx, state, actions, renderer, camera, controls, glow, stage, tv, sources, signal, osd };
