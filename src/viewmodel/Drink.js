import * as THREE from 'three';
import { FACE_Y } from './RemoteModel.js';
import { CAN } from '../world/props.js';

// Click the can and you have a drink. You lean in to the coffee table, your
// left hand reaches out, picks the can up and brings it to the middle of the
// view; the first time, your right hand comes over (remote and all) and your
// thumb levers the tab open, with a crack and a fizz. Up to your mouth, three
// gulps, back down, "ahhh", and you lean in again to put it back exactly
// where it was.
//
// It all runs off one clock: tracks of keyframes, eased between, for the
// hand's pose, how closed it is, how far you lean in and tip your head back,
// the right hand borrowing the remote and the tab; and one-off events for the
// sounds. The hand's poses are either at the table (world space) or in front
// of you (camera space, so they move with your head).

const GRIP_HEIGHT = 0.058; // where the hand holds the can, above its base
const LEAN = 0.6; // how far you lean in towards the can (metres)
const SIP_TILT = 0.2; // how far your head tips back to drink (radians)
const HELD = { position: new THREE.Vector3(-0.02, -0.05, -0.42), tip: 0.25 }; // in front of you, top tipped your way
// At your mouth: the can's top just below and in front of your eyes, its
// length running away from you and up to the left (bottom → top along these),
// tipped up further as you drink. You turn it in your hand on the way, to
// bring the opening to your lips, which puts your hand under its near side
// rather than across the top: palm underneath, fingers round its left side.
const MOUTH = {
  at: new THREE.Vector3(0, -0.085, -0.075),
  sip: new THREE.Vector3(0.25, -0.25, 0.93).normalize(),
  deep: new THREE.Vector3(0.25, -0.6, 0.76).normalize(),
  turn: 1.57,
};
const REST = new THREE.Vector3(-0.3, -0.5, -0.1); // the hand, out of view
const HOVER = new THREE.Vector3(-0.07, 0.07, 0.04); // the hand on its way in, from where it'll hold the can
// The remote stood up beside the can, its face against the can's side, for
// your thumb to reach over the rim: the ring sits here in remote space, a
// thumb's height over the face, level with the middle of the keypad. Your
// thumb's middle joint bends up, towards the remote's tip, so it comes down
// on the ring over the rim rather than through the side of the can.
const THUMB_ON_RING = new THREE.Vector3(0, FACE_Y + 0.02, 0);
const THUMB_BEND = new THREE.Vector3(0, -0.01, 0.06);
// The remote's axes in the can's grip space: its tip up, its face towards the
// can (your left), and its left edge away from you. Your forearm then drops
// away from the hand down and back towards your shoulder, as it should.
const REMOTE_BY_CAN = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)),
);

const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Where a track is at time t: the keys either side and how far between (eased).
function between(keys, t) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][1], 0];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      return [a, b, ease((t - t0) / (t1 - t0))];
    }
  }
  const last = keys.at(-1)[1];
  return [last, last, 0];
}

export function trackValue(keys, t) {
  const [a, b, u] = between(keys, t);
  return a + (b - a) * u;
}

// The whole drink: tracks of [time, value] keys, [time, event] events, and
// when the can's in your hand. The tab only plays while the can's still shut,
// and the rest comes 1.8 s sooner once it's open.
export function drinkTimeline(opened) {
  const tab = opened ? 0 : 1.8;
  const T = (t) => t + tab; // after the tab
  return {
    duration: T(9.9),
    grab: 1.45, // the can's in your hand from here…
    set: T(8.45), // …until it's back on the table
    open: opened ? null : 3.8,
    grip: [
      [0, 'rest'],
      [0.85, 'hover'],
      [1.2, 'pick'],
      [1.5, 'pick'],
      [1.8, 'lift'],
      [2.8, 'held'],
      [T(2.8), 'held'],
      [T(3.8), 'mouth'],
      [T(5.3), 'deep'],
      [T(6.2), 'held'],
      [T(7.2), 'held'],
      [T(8.1), 'lift'],
      [T(8.45), 'pick'],
      [T(8.7), 'pick'],
      [T(9.0), 'hover'],
      [T(9.9), 'rest'],
    ],
    closed: [[0, 0], [1.15, 0], [1.45, 1], [T(8.45), 1], [T(8.7), 0]],
    lean: [[0, 0], [1, 1], [1.6, 1], [2.7, 0], [T(7.2), 0], [T(8.2), 1], [T(8.75), 1], [T(9.7), 0]],
    sip: [[T(2.9), 0], [T(3.8), 1], [T(5.3), 1], [T(6.2), 0]],
    remote: opened ? [[0, 0]] : [[2.7, 0], [3.3, 1], [4.15, 1], [4.7, 0]], // the right hand borrowing the remote
    thumb: opened ? [[0, 0]] : [[3.35, 0], [3.6, 1]], // the thumb over the ring (0), then on it (1)
    tab: opened ? [[0, 0.2]] : [[3.65, 0], [3.95, 1.25], [4.25, 0.2]],
    events: [
      [1.45, 'pick'],
      ...(opened ? [] : [[3.8, 'open']]),
      [T(3.95), 'gulp'],
      [T(4.5), 'gulp'],
      [T(5.05), 'gulp'],
      [T(6.35), 'ahh'],
      [T(8.45), 'set'],
    ],
  };
}

const pose = () => ({ position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
const tipped = new THREE.Quaternion();
const turned = new THREE.Quaternion();
const facing = new THREE.Quaternion();
const axis = new THREE.Vector3();
const ring = new THREE.Vector3();
const canUp = new THREE.Vector3();
const offset = new THREE.Vector3();

export class Drink {
  constructor({ can, seated, rig, scene, eye }) {
    this.can = can; // the room's can: its group on the table, and `top` once the model's in
    this.seated = seated;
    this.rig = rig;
    this.scene = scene;
    this.arm = null; // your left arm, once its hand has loaded
    this.reducedMotion = false;
    this.onEvent = () => {}; // sounds: 'pick', 'open', 'gulp', 'ahh', 'set'
    this.active = false;
    this.time = 0;
    this.next = 0;
    this.holding = false;

    // The can's place on the table, and the hand's pose there: holding it
    // GRIP_HEIGHT up, square to you. You lean in along the line to it.
    this.home = { position: can.group.position.clone(), quaternion: can.group.quaternion.clone() };
    this.pick = pose();
    this.pick.position.copy(this.home.position).y += GRIP_HEIGHT;
    this.pick.quaternion.setFromAxisAngle(UP, Math.atan2(eye.x - this.home.position.x, eye.z - this.home.position.z));
    this.leanTo = this.pick.position.clone().sub(eye).normalize().multiplyScalar(LEAN);
    // …and where the can sits in the hand (grip space), from there.
    const toGrip = this.pick.quaternion.clone().invert();
    this.inHand = pose();
    this.inHand.position.subVectors(this.home.position, this.pick.position).applyQuaternion(toGrip);
    this.inHand.quaternion.copy(toGrip).multiply(this.home.quaternion);
    this.from = pose();
    this.to = pose();
  }

  get ready() {
    return Boolean(this.arm && this.can.top);
  }

  start() {
    if (this.active || !this.ready) return false;
    this.timeline = drinkTimeline(this.can.top.opened);
    this.time = 0;
    this.next = 0;
    this.active = true;
    this.arm.root.visible = true;
    return true;
  }

  // Jump to a moment, skipping the sounds before it (for the lab).
  seek(time) {
    if (!this.active && !this.start()) return;
    this.time = time;
    this.next = this.timeline.events.findIndex(([t]) => t > time);
    if (this.next < 0) this.next = this.timeline.events.length;
  }

  // Put a named pose into `out` (world space).
  poseOf(name, camera, out) {
    const inView = (position, turn) => {
      out.position.copy(position).applyMatrix4(camera.matrixWorld);
      out.quaternion.copy(camera.getWorldQuaternion(facing)).multiply(turn);
    };
    switch (name) {
      case 'rest':
        return inView(REST, tipped.identity());
      case 'hover':
        out.position.copy(HOVER).applyQuaternion(this.pick.quaternion).add(this.pick.position);
        out.quaternion.copy(this.pick.quaternion);
        return;
      case 'lift':
        out.position.copy(this.pick.position).y += 0.1;
        out.quaternion.copy(this.pick.quaternion);
        return;
      case 'held':
        return inView(HELD.position, tipped.setFromAxisAngle(X, HELD.tip));
      case 'mouth':
      case 'deep': {
        // The top at your mouth: back from there down the can to where it's held.
        axis.copy(name === 'mouth' ? MOUTH.sip : MOUTH.deep);
        offset.copy(axis).multiplyScalar(-(CAN.height - GRIP_HEIGHT)).add(MOUTH.at);
        return inView(offset, tipped.setFromUnitVectors(UP, axis).multiply(turned.setFromAxisAngle(UP, MOUTH.turn)));
      }
      default:
        out.position.copy(this.pick.position);
        out.quaternion.copy(this.pick.quaternion);
    }
  }

  update(dt, camera) {
    if (!this.active) return;
    const tl = this.timeline;
    this.time = Math.min(this.time + dt, tl.duration);
    const t = this.time;
    const { hand } = this.arm;

    // You lean in to the table, looking at the can, and tip your head back to
    // drink (the camera picks these up on its next update).
    const motion = this.reducedMotion ? 0.35 : 1;
    const lean = trackValue(tl.lean, t) * motion;
    this.seated.lean.copy(this.leanTo).multiplyScalar(lean);
    this.seated.focus.copy(this.pick.position);
    this.seated.focusWeight = lean * 0.6;
    this.seated.tilt = trackValue(tl.sip, t) * SIP_TILT * motion;

    // The hand, and the can in it while you hold it.
    const [a, b, u] = between(tl.grip, t);
    this.poseOf(a, camera, this.from);
    this.poseOf(b, camera, this.to);
    hand.group.position.lerpVectors(this.from.position, this.to.position, u);
    hand.group.quaternion.slerpQuaternions(this.from.quaternion, this.to.quaternion, u);
    hand.group.updateMatrixWorld(true);
    hand.setClosed(trackValue(tl.closed, t));
    const holding = t >= tl.grab && t < tl.set;
    if (holding && !this.holding) this.grab();
    else if (!holding && this.holding) this.release();

    // The tab, and your right thumb on it.
    const top = this.can.top;
    top.setTab(trackValue(tl.tab, t));
    if (tl.open !== null && t >= tl.open && !top.opened) top.setOpen(true);
    const o = this.rig.override;
    o.weight = trackValue(tl.remote, t);
    if (o.weight > 0) {
      o.quaternion.copy(hand.group.quaternion).multiply(REMOTE_BY_CAN);
      o.position.copy(top.ring(ring, true)).sub(offset.copy(THUMB_ON_RING).multiplyScalar(this.rig.settings.size).applyQuaternion(o.quaternion));
      canUp.copy(UP).applyQuaternion(hand.group.quaternion);
      o.thumb.copy(top.ring(ring)).addScaledVector(canUp, THREE.MathUtils.lerp(0.014, 0.004, trackValue(tl.thumb, t)));
      o.bend.copy(THUMB_BEND);
    }

    while (this.next < tl.events.length && tl.events[this.next][0] <= t) this.onEvent(tl.events[this.next++][1]);
    if (t >= tl.duration) this.finish();
  }

  grab() {
    this.holding = true;
    this.arm.hand.group.add(this.can.group);
    this.can.group.position.copy(this.inHand.position);
    this.can.group.quaternion.copy(this.inHand.quaternion);
  }

  // Back on the table, exactly where it was.
  release() {
    this.holding = false;
    this.scene.attach(this.can.group);
    this.can.group.position.copy(this.home.position);
    this.can.group.quaternion.copy(this.home.quaternion);
  }

  finish() {
    this.active = false;
    if (this.holding) this.release();
    this.arm.root.visible = false;
    this.seated.lean.set(0, 0, 0);
    this.seated.focusWeight = 0;
    this.seated.tilt = 0;
    this.rig.override.weight = 0;
  }
}
