import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import './styles/main.scss';
import { cloneDefaults, createFx } from './screen/params.js';
import { SignalPass } from './screen/SignalPass.js';
import { ScreenMaterial } from './screen/ScreenMaterial.js';
import { OSD } from './screen/OSD.js';
import { COLLAPSE, degauss } from './screen/transitions.js';
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
import { ArmRig } from './viewmodel/ArmRig.js';
import { XRHand } from './viewmodel/XRHand.js';
import { liftCurtain } from './intro/curtain.js';
import { IDENT, createIdent, loadIdentFonts } from './intro/ident.js';
import { CanHand } from './viewmodel/CanHand.js';
import { LeftArm } from './viewmodel/LeftArm.js';
import { Drink } from './viewmodel/Drink.js';
import { locatePointer, remoteArea } from './camera/pointerZones.js';
import { Interactions } from './world/Interactions.js';
import { HoverOutline } from './world/HoverOutline.js';
import { PostFX } from './render/PostFX.js';
import { createTestCards, sourceFromFile } from './lab/sources.js';
import { projects } from '../content/projects.js';
import { resume } from '../content/resume.js';
import { loadResumeFonts } from './world/resumePage.js';
import { projectChannels } from './content/channels.js';
import { channelNumbers, FIRST_CHANNEL } from './content/lineup.js';
import { renderCaseStudy } from './content/caseStudy.js';
import { mediaUrl } from './content/media.js';
import { StoryOverlay } from './content/StoryOverlay.js';
import './content/story.css';
import { createLabGui } from './lab/LabGui.js';
import { createRemotePad } from './lab/RemotePad.js';
import { createScreenRectOverlay } from './lab/ScreenRectOverlay.js';
import { loadSaved } from './lab/storage.js';

// Screen lab: the CRT pipeline (Phase 1), driven by the set's tuner, remote and
// sound (Phase 2), seen from the couch in a greybox apartment (Phase 3) with
// the remote in your outstretched hand (Phase 4), or from an orbit camera, or
// as a flat screen.


// No WebGL 2, no TV: the plain pages have all the work.
if (!document.createElement('canvas').getContext('webgl2')) {
  window.location.replace(`${import.meta.env.BASE_URL}work/`);
  throw new Error('WebGL 2 is not available; showing the plain pages instead.');
}

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
// hud and remotePad: the lab's info/help panel and its 2D remote, both off until switched on in the lab.
const state = { mode: 'seated', overlay: false, channel: FIRST_CHANNEL, preset: '80s living room', panel: true, timeScale: 1, hud: false, remotePad: false };

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

// The set, its lineup and the remote. Your work (content/projects.js) comes
// first, then the test cards; every source gets a channel number, and
// numbers without a source tune to dead air.
const channelSettings = { reducedMotion };
const shows = [...projectChannels(projects, { base: import.meta.env.BASE_URL, settings: channelSettings }), ...createTestCards()];
const numbers = channelNumbers(shows.map((source) => source.project?.channel));
const lineup = shows.map((source, i) => ({ number: numbers[i], name: source.name, source }));
const tv = new Television({ fx, osd, lineup, reducedMotion });
const remote = new Remote(tv);

// Your arm, holding the remote out towards the TV.
const rig = new ArmRig({ remote, aimAt: screenWorld });
room.scene.add(rig.root);
rig.model.steadyInvite = reducedMotion;

// A button on the remote pulses to show you what to press next: POWER while
// the set's off, INFO while a show with a story is on.
function inviteAPress() {
  rig.model.invite = !tv.on ? 'power' : tv.channel?.source?.project ? 'info' : null;
}
inviteAPress();

// Click the can for a drink: your left hand (once its model has loaded)
// picks it up, your right thumb opens it, you drink and put it back.
const drink = new Drink({ can: room.can, seated, rig, scene: room.scene, eye: EYE });
drink.reducedMotion = reducedMotion;
const DRINK_SOUNDS = { pick: 'canPick', open: 'canOpen', gulp: 'gulp', ahh: 'ahh', set: 'canSet' };
drink.onEvent = (name) => audio?.[DRINK_SOUNDS[name]]();

// Things in the room you can click, outlined while you point at them: the
// table lamp switches on and off, the listings magazine lifts into your
// hands, opens, and tunes the set to whichever show you pick, and the paper
// plane unfolds into your résumé.
const interactions = new Interactions();
const outline = new HoverOutline(renderer);

// Bloom, ambient occlusion, grain, vignette and a grade over the finished frame.
const post = new PostFX(renderer, { scene: room.scene, camera: seated.camera });
post.reducedMotion = reducedMotion;
post.markGlowing(...room.glowing, rig.model.group);
post.markScreen(tvModel.screen);
post.markFront(rig.root, room.magazines.listings.group, room.paperPlane.sheet);
const magazine = room.magazines.listings;
magazine.onCoverOpen = () => audio?.rustle();
const plane = room.paperPlane; // your résumé (content/resume.js), folded into a paper plane
plane.setResume(resume, projects);
plane.reducedMotion = reducedMotion;
plane.onCrease = () => audio?.crease();
interactions.add(room.tableLamp, {
  name: 'Table lamp',
  onClick: () => audio?.lampSwitch(room.toggleTableLamp()),
});
interactions.add(magazine.group, { name: 'Listings magazine', onClick: openMagazine, enabled: () => magazine.atRest });
interactions.add(plane.group, { name: 'Paper plane', onClick: openResume, enabled: () => plane.atRest });
interactions.add(room.lava.group, {
  name: 'Lava lamp',
  onClick: () => {
    room.lava.recolor();
    audio?.bloop();
  },
});
room.plantTwirl.reducedMotion = reducedMotion;
room.plantTwirl.onLand = () => audio?.potClunk();
interactions.add(room.plant.group, { name: 'Snake plant', onClick: () => room.plantTwirl.spin(), enabled: () => !room.plantTwirl.active });
room.panda.reducedMotion = reducedMotion;
interactions.add(room.bookshelf.panda, {
  name: 'Panda',
  onClick: () => {
    room.panda.squeeze();
    audio?.squeak();
  },
});
interactions.add(room.can.group, { name: 'Soda can', onClick: haveADrink, enabled: () => drink.ready && !drink.active });
interactions.add(room.bookshelf.radio, {
  name: 'Clock radio',
  onClick: () => audio?.toggleRadio(`${import.meta.env.BASE_URL}media/radio/station.mp3`),
});

// What can block the pointer: everything but your arms. Models swap in as
// they load, so this runs again each time.
function refreshOccluders() {
  interactions.setOccluders(room.scene, drink.arm ? [rig.root, drink.arm.root] : [rig.root]);
}
refreshOccluders();

function haveADrink() {
  if (!drink.start()) return;
  rig.setActive(false);
  seated.setLook(0, 0);
  seated.setZoomed(false); // the can comes up to the normal view, not the zoomed one
  interactions.clearPointer();
}

// The show the listings mark ON NOW: the channel on screen, if there is one
// (not with the set off, or during the station ident).
const onNow = () => (tv.on && !tv.ident ? tv.number : null);

function openMagazine() {
  magazine.touch = touching;
  magazine.setListings(tv.lineup, onNow());
  magazine.open(room.scene); // the cover rustles as it swings open (onCoverOpen)
  rig.setActive(false);
  seated.setLook(0, 0);
}

function closeMagazine() {
  if (!magazine.isOpen) return;
  magazine.close();
  audio?.rustle();
}

// The paper plane lifts off the table and unfolds into your résumé; a click
// off it folds it back up and puts it down.
function openResume() {
  plane.open(room.scene, seated.camera);
  rig.setActive(false);
  seated.setLook(0, 0);
  interactions.clearPointer();
  audio?.rustle();
}

function closeResume() {
  if (!plane.isOpen) return;
  plane.close();
}

// A link on the résumé: a web address opens in a new tab, an email address
// in your mail app.
function follow(url) {
  const a = document.createElement('a');
  a.href = url;
  if (!url.startsWith('mailto:')) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  a.click();
  audio?.click();
}

// Tune to a show picked from the listings (switching the set on if need be),
// then put the magazine down so you can watch.
function watch(row) {
  const channel = magazine.lineup[row];
  if (!channel) return;
  tv.tune(channel.number);
  if (!tv.on) remote.press('power');
  audio?.click();
  closeMagazine();
}

// In the remote area (a centred box), the pointer steers your thumb across
// the remote and nudges your arm about, and the view stays still. Outside it,
// the arm drops out of view and you look around a little instead, pointing at
// things in the room; the cursor shows there, so you can see where you're
// pointing. With the magazine or the résumé open, the pointer reads it instead.
// Leaving the page lowers the arm and faces the set again.
const pointer = new THREE.Vector2();
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches; // a phone or tablet
let touching = coarse; // the last pointer was a finger
function aim(e) {
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  touching = e.pointerType === 'touch';
  if (drink.active || story.isOpen) {
    // Hands full, or reading: the pointer waits.
    rig.setActive(false);
    seated.setLook(0, 0);
    interactions.clearPointer();
    document.body.dataset.aim = 'look';
    return { inside: false, busy: true };
  }
  if (magazine.isOpen || plane.isOpen) {
    rig.setActive(false);
    seated.setLook(0, 0);
    interactions.clearPointer();
    document.body.dataset.aim = 'look';
    return { inside: false, reading: true };
  }
  if (touching) {
    // No hover on a touch screen: the remote stays up, in reach, and a tap
    // does whatever it lands on (see the touch gestures below).
    rig.setActive(true);
    interactions.setPointer(pointer.x, pointer.y);
    document.body.dataset.aim = 'look';
    return { inside: false, touch: true };
  }
  const where = locatePointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight, rig.settings.area, rig.settings.areaWidth, rig.settings.areaRight, rig.settings.areaLift);
  if (where.inside) rig.setPointer(where.u, where.v);
  rig.setActive(where.inside);
  seated.setLook(where.lookX, where.lookY);
  if (where.inside) interactions.clearPointer();
  else interactions.setPointer(pointer.x, pointer.y);
  document.body.dataset.aim = where.inside ? 'remote' : 'look';
  return where;
}
window.addEventListener('pointermove', aim);
document.documentElement.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'touch') return; // a finger lifting off isn't the pointer leaving
  rig.setActive(false);
  seated.setLook(0, 0);
  interactions.clearPointer();
});

// Click presses whichever button the thumb is over; holding CH or VOL repeats.
// Aim first: a tap on a touch screen arrives without a hover. Outside the
// remote area a click works whatever you're pointing at; with the magazine
// open it picks a show, with the résumé open it follows a link, and a click
// off either puts it down.
canvas.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'seated' || e.button !== 0) return;
  const where = aim(e);
  if (where.busy) return;
  if (e.pointerType === 'touch') {
    touchDown(e, where);
    return;
  }
  if (where.reading) {
    readClick();
    return;
  }
  if (!where.inside) {
    interactions.pick(seated.camera)?.onClick();
    return;
  }
  canvas.setPointerCapture(e.pointerId);
  remote.hold(rig.target);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => remote.release());

// A click (or tap) while reading: a link or a listing does its thing, and off
// the page puts it down. On the résumé brought closer (by a pinch), a tap on
// the page takes it back out to the whole page.
function readClick() {
  if (plane.isOpen) {
    const link = plane.linkAtPointer(pointer, seated.camera);
    if (link) follow(link.url);
    else if (!plane.isUnder(pointer, seated.camera)) closeResume();
    else if (plane.zoom > 1) plane.setZoom(1);
    return;
  }
  const row = magazine.rowAtPointer(pointer, seated.camera);
  if (row >= 0) watch(row);
  else if (!magazine.isUnder(pointer, seated.camera)) closeMagazine();
}

// Touch gestures. Tap a button on the remote and your thumb presses it (hold
// CH or VOL to repeat); tap something in the room to click it; drag to look
// around (further on a narrow screen: see resize); pinch to zoom in on the
// set and back out. Reading, a tap works like a click; and on the résumé a
// pinch brings the page closer, and a drag slides it about.
const fingers = new Map(); // touch pointerId → [x, y] now
let gesture = null; // what the fingers down are doing: 'press', 'tap', 'look', 'pan' or 'pinch'
const clampOne = (n) => Math.max(-1, Math.min(1, n));
const spread = () => {
  const [[ax, ay], [bx, by]] = [...fingers.values()];
  return Math.hypot(ax - bx, ay - by);
};

function touchDown(e, where) {
  fingers.set(e.pointerId, [e.clientX, e.clientY]);
  if (fingers.size === 2) {
    // A second finger: a pinch, whatever the first was doing.
    remote.release();
    gesture = { kind: 'pinch', from: spread(), zoom: plane.isOpen ? plane.zoom : null };
    return;
  }
  if (fingers.size > 2) return;
  const button = !where.reading && rig.buttonAt(pointer, seated.camera);
  if (button) {
    rig.pin(button);
    seated.setLook(0, 0); // using the remote, you look at the set
    canvas.setPointerCapture(e.pointerId);
    remote.hold(button);
    gesture = { kind: 'press' };
    return;
  }
  gesture = { kind: 'tap', x: e.clientX, y: e.clientY, last: [e.clientX, e.clientY], look: seated.lookTarget.clone(), reading: Boolean(where.reading) };
}

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch' || !fingers.has(e.pointerId)) return;
  fingers.set(e.pointerId, [e.clientX, e.clientY]);
  if (gesture?.kind === 'pinch') {
    if (fingers.size < 2) return;
    const ratio = spread() / gesture.from;
    if (gesture.zoom !== null) plane.setZoom(gesture.zoom * ratio); // the résumé, held up: closer or further
    else if (ratio > 1.15) seated.setZoomed(true);
    else if (ratio < 0.87) seated.setZoomed(false);
    return;
  }
  if (gesture?.kind === 'tap' && Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 10) gesture.kind = gesture.reading ? 'pan' : 'look';
  if (gesture?.kind === 'pan') {
    // Slide the page with the finger.
    if (plane.isOpen) plane.panBy(((e.clientX - gesture.last[0]) / window.innerWidth) * 2, (-(e.clientY - gesture.last[1]) / window.innerHeight) * 2);
    gesture.last = [e.clientX, e.clientY];
  }
  if (gesture?.kind === 'look') {
    // Drag the room: the view turns the opposite way to the finger.
    const dx = (e.clientX - gesture.x) / (window.innerWidth / 2);
    const dy = (e.clientY - gesture.y) / (window.innerHeight / 2);
    seated.setLook(clampOne(gesture.look.x - dx), clampOne(gesture.look.y + dy));
  }
});

for (const type of ['pointerup', 'pointercancel']) {
  canvas.addEventListener(type, (e) => {
    if (e.pointerType !== 'touch' || !fingers.delete(e.pointerId)) return;
    if (type === 'pointerup' && gesture?.kind === 'tap') {
      if (gesture.reading) readClick();
      else interactions.pick(seated.camera)?.onClick();
    }
    if (!fingers.size) {
      gesture = null;
      interactions.clearPointer();
    }
  });
}

let current = null;

// A source can carry its own fit and focus (a project's video, say).
function refit() {
  signal.setSource(current, current?.fit ?? params.source.fit, current?.focus ?? [params.source.focusX, params.source.focusY]);
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
// iOS only counts the end of a tap (or a click) as a gesture that may start sound.
window.addEventListener('touchend', startAudio, true);
window.addEventListener('click', startAudio, true);

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
  inviteAPress();
  if (magazine.isOpen) magazine.setListings(tv.lineup, onNow());
});
tv.addEventListener('tune', (e) => {
  state.channel = e.detail.number;
  updateHud();
});
tv.addEventListener('power', (e) => {
  tvModel.setPower(e.detail.on);
  inviteAPress();
  if (magazine.isOpen) magazine.setListings(tv.lineup, onNow());
  document.body.classList.toggle('is-tv-on', e.detail.on);
  audio?.power(e.detail.on);
  if (!e.detail.on) {
    audio?.setChannel(null);
    // Once the picture has collapsed, let go of it, so the next power-on
    // starts it afresh (an ident from its first frame, a video back on air).
    gsap.delayedCall(COLLAPSE, () => tv.on || showSource(null));
  }
  updateHud();
});
tv.addEventListener('relay', () => audio?.relay());
tv.addEventListener('volume', (e) => {
  audio?.setVolume(e.detail.level, e.detail.muted);
  updateHud();
});
remote.addEventListener('press', (e) => {
  audio?.click();
  if (e.detail.button === 'info') toggleStory();
});

// INFO: the story behind the show on now, over the TV. The test cards (and a
// set that's off) have none; the OSD says so.
const story = new StoryOverlay({ onClose: () => document.body.classList.remove('is-reading') });
function toggleStory() {
  if (story.isOpen) return story.close();
  if (!tv.on) return;
  const project = tv.channel?.source?.project;
  if (!project) {
    osd.setCaption('NO LISTING');
    return;
  }
  closeMagazine();
  closeResume();
  rig.setActive(false);
  seated.setLook(0, 0);
  interactions.clearPointer();
  document.body.classList.add('is-reading');
  story.open({
    slug: project.slug,
    html: renderCaseStudy(project, { url: (path) => mediaUrl(project, path, import.meta.env.BASE_URL), channel: tv.number }),
    page: `${import.meta.env.BASE_URL}work/${project.slug}/`,
  });
}

const hud = document.querySelector('.hud');
const remotePad = createRemotePad(remote);
document.body.append(remotePad);

// Show or hide the info/help panel and the 2D remote (Screen Lab → TV).
function showLabExtras() {
  hud.hidden = !state.hud;
  remotePad.hidden = !state.remotePad;
}
showLabExtras();

const MODES = ['seated', 'orbit', 'flat'];

function setMode(mode) {
  if (mode !== 'seated') {
    closeMagazine();
    closeResume();
  }
  state.mode = mode;
  controls.enabled = mode === 'orbit';
  document.body.dataset.mode = mode;
  // OrbitControls leaves an inline cursor on the canvas; let the stylesheet
  // decide (hidden over the remote area, ordinary elsewhere).
  if (mode !== 'orbit') canvas.style.removeProperty('cursor');
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

// Scroll wheel / trackpad: scroll up to zoom in on the set, down to go back to
// the whole room; the view eases between the two. A trackpad pinch arrives as
// a wheel event with Ctrl held, so it zooms the scene rather than the page.
// Orbit view keeps the wheel for its own zoom.
canvas.addEventListener(
  'wheel',
  (e) => {
    if (state.mode !== 'seated') return;
    e.preventDefault();
    if (e.deltaY < 0) seated.setZoomed(true);
    else if (e.deltaY > 0) seated.setZoomed(false);
  },
  { passive: false },
);

const fileInput = document.querySelector('#file');
fileInput.addEventListener('change', () => addFiles([...fileInput.files]));

// The station ident the set comes on to, once a visit (src/intro/ident.js).
const ident = { name: 'Station ident', source: createIdent({ reducedMotion }) };

const actions = {
  setMode,
  drink: () => haveADrink(),
  refit,
  resetCamera,
  press: (button) => remote.press(button),
  tune: (number) => tv.tune(number),
  channels: () => tv.lineup,
  degauss: () => degauss(fx),
  loadFile: () => fileInput.click(),
  showLabExtras,
  replayIntro() {
    tv.powerOff();
    gsap.delayedCall(0.8, () => tv.powerOnWithIdent(ident, IDENT.seconds));
  },
  setTimeScale(value) {
    // Browsers clamp playbackRate; 1/16 is the lowest Chrome allows.
    tv.lineup.forEach(({ source }) => source.video && (source.video.playbackRate = Math.max(0.0625, value)));
  },
};

const lab = createLabGui({ params, state, actions, glow, osd, renderer, tv, remote, soundSettings, seated, room, rig, post });
// On a phone or tablet the lab's panel would crowd the screen: it starts hidden.
if (coarse) {
  state.panel = false;
  lab.gui.show(false);
}

// The WebXR hand model replaces the built-in hand once it has loaded.
const rightHand = XRHand.load(`${import.meta.env.BASE_URL}models/hand/right.glb`)
  .then((hand) => {
    rig.addHand('webxr', hand);
    post.markFront(hand.group); // it can block the TV's glow, like the rest of your arm
    lab.addGripControls(hand);
  })
  .catch((err) => console.warn("Couldn't load the hand model; keeping the built-in hand.", err));

// Models for the plant's leaves and the can replace their built-in stand-ins once they've loaded.
const models = new GLTFLoader();
const plantLeaves = models
  .loadAsync(`${import.meta.env.BASE_URL}models/plant/sansevieria.glb`)
  .then((gltf) => {
    room.setPlantLeaves(gltf.scene);
    refreshOccluders();
  })
  .catch((err) => console.warn("Couldn't load the plant model; keeping the built-in leaves.", err));
const canModel = models
  .loadAsync(`${import.meta.env.BASE_URL}models/can/soda-can.glb`)
  .then((gltf) => {
    room.setCanModel(gltf.scene);
    refreshOccluders();
  })
  .catch((err) => console.warn("Couldn't load the can model; keeping the built-in can (and no drink).", err));
const radioModel = models
  .loadAsync(`${import.meta.env.BASE_URL}models/radio/clock-radio.glb`)
  .then((gltf) => {
    room.setRadioModel(gltf.scene);
    room.radioMeter.reducedMotion = reducedMotion;
    post.markGlowing(room.radioMeter.mesh);
    refreshOccluders();
  })
  .catch((err) => console.warn("Couldn't load the clock radio; the shelf stays empty.", err));

// The listings magazine's cover (27:38 portrait); the drawn one stays if it can't load.
const listingsCover = new THREE.TextureLoader()
  .loadAsync(`${import.meta.env.BASE_URL}media/listings/cover.webp`)
  .then((texture) => magazine.setCover(texture))
  .catch((err) => console.warn("Couldn't load the listings cover; keeping the drawn one.", err));

// Your left hand, for the drink.
const leftHand = CanHand.load(`${import.meta.env.BASE_URL}models/hand/left.glb`)
  .then((hand) => {
    drink.arm = new LeftArm(hand);
    room.scene.add(drink.arm.root);
    post.markFront(drink.arm.root);
    refreshOccluders();
    lab.addCanGripControls(hand);
  })
  .catch((err) => console.warn("Couldn't load the left hand; the can stays put.", err));

// What the curtain waits for before the room fades up (src/intro/curtain.js).
const resumeFont = loadResumeFonts(import.meta.env.BASE_URL).then(() => plane.redraw());
const startupLoads = [rightHand, plantLeaves, canModel, radioModel, listingsCover, leftHand, loadIdentFonts(import.meta.env.BASE_URL), resumeFont];

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
  // Page Up is channel up.
  pageup: 'ch+',
  pagedown: 'ch-',
  i: 'info',
};

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (story.isOpen) return; // the story has the keys (arrows scroll it; Esc and I close it)
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
    case 'escape':
      closeMagazine();
      closeResume();
      break;
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
  post.setSize(width, height);
  seated.setAspect(width / height);
  // Dragging to look around on a touch screen reaches further on a narrow
  // one, which shows less of the room: on a phone held upright, from the
  // bookshelf to the plant.
  if (coarse) seated.settings.lookAround = Math.max(1, 1.6 / (width / height));
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
  const frameTime = now - last; // uncapped, for judging the frame rate
  const realDt = Math.min(frameTime, 0.1);
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
    if (seatedView) seated.update(clock, realDt);
    else controls.update();
    drink.update(dt, seated.camera);
    // On a touch screen the remote stays up whenever you're not busy with something else.
    if (touching && !drink.active && !story.isOpen && !magazine.isOpen && !plane.isOpen) rig.setActive(true);
    rig.update(dt, seated.camera, clock, { reducedMotion, viewFov: seated.baseFov });
    drink.arm?.update(seated.camera);
    magazine.update(dt, seated.camera);
    plane.update(dt, seated.camera);
    // What the pointer's over: a listing or a link while you read, otherwise
    // something in the room (outlined).
    const listings = seatedView && magazine.isOpen;
    const page = seatedView && plane.isOpen;
    magazine.setHover(listings ? magazine.rowAtPointer(pointer, seated.camera) : -1);
    plane.setHover(page ? plane.linkAtPointer(pointer, seated.camera) : null);
    const hovered = seatedView && !listings && !page && !drink.active ? interactions.update(seated.camera) : null;
    outline.setTarget(hovered?.object ?? null);
    document.body.dataset.hover = String(Boolean(hovered) || magazine.hover >= 0 || Boolean(plane.hover));
    glow.update(signal.texture, fx.power * params.display.emission, realDt);
    room.update(clock, {
      tvColor: glow.light.color,
      tvLevel: glow.level,
      pixelScale: renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))),
      camera,
      radioOn: audio?.radioOn,
    });
    renderer.render(room.scene, camera);
    outline.render(room.scene, camera, clock);
    post.render(room.scene, camera, clock);
    post.track(frameTime);
    if (seatedView && state.overlay) {
      overlay.update(seated.screenRect(tvModel.screen), window.innerWidth, window.innerHeight, remoteArea(window.innerWidth, window.innerHeight, rig.settings.area, rig.settings.areaWidth, rig.settings.areaRight, rig.settings.areaLift));
    }
    else overlay.hide();
  }

  fpsFrames++;
  fpsTime += Math.min(frameTime, 5);
  if (fpsTime >= 0.5) {
    fpsLabel.textContent = `${Math.round(fpsFrames / fpsTime)} fps`;
    fpsFrames = 0;
    fpsTime = 0;
  }
});

setMode(state.mode);
updateHud();

// Arriving from a project's page (?channel=<slug>): the set comes on, tuned
// to that show.
const linked = new URLSearchParams(window.location.search).get('channel');
const linkedChannel = lineup.find((c) => c.source.project?.slug === linked);
if (linkedChannel) {
  tv.tune(linkedChannel.number);
  tv.powerOn();
}

// The curtain lifts once the room is ready. Then the set comes on by itself
// to the station ident, and switches off again when it's over: it's yours to
// switch on, and that click starts the sound too. (A link to a project has
// switched it on already.)
liftCurtain(document.querySelector('.curtain'), { loads: startupLoads, renderer, scene: room.scene, camera: seated.camera, reducedMotion }).then(() => {
  gsap.delayedCall(0.6, () => tv.on || tv.powerOnWithIdent(ident, IDENT.seconds));
});

// Then fetch every channel's media in the background, one at a time, so
// flicking through doesn't keep you waiting on a STAND BY card.
setTimeout(async () => {
  for (const { source } of lineup) await source.warm?.();
}, 3000);

if (import.meta.env.DEV) {
  window.lab = {
    params, fx, state, actions, renderer, seated, orbitCamera, controls, glow, room, tvModel, signal, osd, tv, remote, rig, post, drink, story, projects, plane,
    gsap,
    get audio() {
      return audio;
    },
    get clock() {
      return clock;
    },
  };
}
