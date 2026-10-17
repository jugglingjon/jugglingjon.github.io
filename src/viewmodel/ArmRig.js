import * as THREE from 'three';
import { Hand } from './Hand.js';
import { RemoteModel, TRAVEL } from './RemoteModel.js';
import { nearestButton, pointerToField, solveTwoBone } from './thumbing.js';
import { createFlannelTexture } from '../world/textures.js';

export const ARM_DEFAULTS = {
  x: 0.12, // where the remote is held, in camera space (metres)
  y: -0.08,
  distance: 0.5,
  tilt: 0.45, // nose-up, so the face turns towards you (radians)
  roll: -0.3,
  hand: 'webxr', // which hand model, once it has loaded ('procedural' is always there)
  follow: 1, // how much the arm drifts and swings towards the pointer
  area: 0.7, // the remote area: a centred square this share of the viewport height
  size: 1,
  snap: 0.7, // how strongly the thumb settles onto the targeted button
  highlight: true,
};

const HOVER = 0.007; // gap between the thumb pad and the targeted button
// Your right shoulder and the elbow's pull, in camera space, and arm bone lengths.
const SHOULDER = new THREE.Vector3(0.17, -0.22, 0.06);
const ELBOW_POLE = new THREE.Vector3(0.55, -0.6, -0.1);
const UPPER_ARM = 0.3;
const FOREARM = 0.27;
const WRIST_SKIN = 0.045; // bare wrist before the cuff, for a hand that doesn't say…
const CUFF = 0.03; // …and the cuff, along the forearm from where it leaves the hand
const PRESS = { down: 0.06, hold: 0.06, up: 0.1 };
const PRESS_LENGTH = PRESS.down + PRESS.hold + PRESS.up;
const Y = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const axis = new THREE.Vector3();
const heldTurn = new THREE.Quaternion();

// Stretch a unit-height mesh between two points.
function span(mesh, a, b) {
  dir.subVectors(b, a);
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.scale.y = dir.length();
  mesh.quaternion.setFromUnitVectors(Y, dir.normalize());
}

// Fit a unit cylinder along a frame's +Y, from `from` to `to` metres out,
// with an oval section of half-sizes `sx` (across) and `sz`.
function along(mesh, frame, from, to, sx, sz) {
  axis.set(0, 1, 0).applyQuaternion(frame.quaternion);
  mesh.quaternion.copy(frame.quaternion);
  mesh.position.copy(frame.position).addScaledVector(axis, (from + to) / 2);
  mesh.scale.set(sx, to - from, sz);
}

// Your arm, outstretched, pointing the remote at the TV. The pointer steers
// your thumb across the buttons (the targeted one lights up); a press, from
// the mouse, keyboard, scroll or lab remote, plays out with the thumb.
export class ArmRig {
  constructor({ remote, aimAt }) {
    this.settings = { ...ARM_DEFAULTS };
    this.aimAt = aimAt.clone();
    this.root = new THREE.Group();

    this.held = new THREE.Group(); // remote-local space
    this.model = new RemoteModel();
    this.hands = { procedural: new Hand() };
    this.hand = this.hands.procedural;
    this.held.add(this.model.group, this.hand.group);
    this.root.add(this.held);

    const sleeveMaterial = new THREE.MeshStandardMaterial({ map: createFlannelTexture(), roughness: 0.9, side: THREE.DoubleSide });
    // Unit sections, scaled to the wrist each frame; the sleeve widens 45% to the elbow.
    this.sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1, 1, 24, 1, true), sleeveMaterial);
    this.upperSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 1, 24, 1, true), sleeveMaterial);
    this.elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.057, 20, 12), sleeveMaterial);
    this.cuff = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), new THREE.MeshStandardMaterial({ color: '#5a1410', roughness: 0.9 }));
    this.wristSkin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), this.hand.skin);
    this.root.add(this.sleeve, this.upperSleeve, this.elbowJoint, this.cuff, this.wristSkin);
    this.root.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true;
    });

    // A little warm fill so the hand reads against the dark room.
    this.fill = new THREE.PointLight('#ffd6b8', 0.35, 1.2, 2);
    this.root.add(this.fill);

    // Rest the thumb over CH ▲ until the pointer arrives.
    this.pointer = new THREE.Vector2(0.41, -0.45);
    this.look = this.pointer.clone(); // the pointer, eased, for the arm's drift
    this.aim = new THREE.Vector3();
    this.active = true;
    this.raise = 0;
    this.hovered = 'ch+';
    this.pressButton = null;
    this.pressTime = Infinity;
    this.tip = null;
    this.tipTarget = new THREE.Vector3();
    this.slide = null;
    this.offset = new THREE.Vector3();
    this.wrist = new THREE.Vector3();
    this.elbow = new THREE.Vector3();
    this.shoulder = new THREE.Vector3();
    this.pole = new THREE.Vector3();
    this.reached = new THREE.Vector3();
    this.forearmFrame = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), halfWidth: 0, halfThickness: 0, cuffAt: 0 };

    remote.addEventListener('press', (e) => this.animatePress(e.detail.button));
  }

  // Make another hand available (the WebXR model, once it has loaded).
  addHand(name, hand) {
    this.hands[name] = hand;
    this.syncHand();
  }

  // Show the hand named in settings, falling back to the procedural one.
  syncHand() {
    const next = this.hands[this.settings.hand] ?? this.hands.procedural;
    if (next === this.hand) return;
    this.held.remove(this.hand.group);
    this.held.add(next.group);
    this.hand = next;
    this.wristSkin.material = next.skin;
    this.slide = null;
  }

  // Pointer across the remote area (−1…1 each way, y up). The target updates
  // straight away, so a press right after (a tap) goes to the right button.
  setPointer(x, y) {
    this.pointer.set(x, y);
    this.hovered = nearestButton(pointerToField(x, y), this.hovered);
  }

  // Lowered out of view while the pointer is outside the remote area.
  setActive(active) {
    this.active = active;
  }

  animatePress(button) {
    this.pressButton = button;
    this.pressTime = 0;
    this.model.blink();
  }

  pressAmount() {
    const t = this.pressTime;
    if (t < PRESS.down) return 1 - (1 - t / PRESS.down) ** 2;
    if (t < PRESS.down + PRESS.hold) return 1;
    return Math.max(0, 1 - (t - PRESS.down - PRESS.hold) / PRESS.up);
  }

  update(dt, camera, time, { reducedMotion = false } = {}) {
    const s = this.settings;
    this.syncHand();
    this.raise += ((this.active ? 1 : 0) - this.raise) * (1 - Math.exp(-dt * 5));
    const lower = 1 - this.raise;
    const sway = reducedMotion ? 0 : 1;
    this.look.lerp(this.pointer, 1 - Math.exp(-dt * 4));
    const follow = s.follow * (reducedMotion ? 0.5 : 1);

    // Hold the remote out in front, aimed at the TV, face tilted towards you.
    // The arm drifts a few centimetres after the pointer, and the tip swings
    // that way a little, while still pointing at the set.
    this.offset.set(
      s.x + this.look.x * 0.02 * follow + Math.sin(time * 0.9) * 0.002 * sway,
      s.y + this.look.y * 0.014 * follow - lower * 0.45 + Math.sin(time * 1.3) * 0.0015 * sway,
      -s.distance + lower * 0.1,
    );
    this.held.position.copy(this.offset).applyMatrix4(camera.matrixWorld);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    this.aim
      .copy(this.aimAt)
      .addScaledVector(right, this.look.x * 0.2 * follow)
      .addScaledVector(up, this.look.y * 0.12 * follow);
    this.held.lookAt(this.aim);
    this.held.rotateX(-s.tilt + lower * 0.9);
    this.held.rotateZ(s.roll);
    this.held.scale.setScalar(s.size);
    this.held.updateMatrixWorld();

    // Which button the thumb is after. A press in progress wins.
    const field = pointerToField(this.pointer.x, this.pointer.y);
    this.hovered = nearestButton(field, this.hovered);
    this.pressTime += dt;
    const pressing = this.pressTime < PRESS_LENGTH && this.model.buttons.has(this.pressButton);
    const aim = pressing ? this.pressButton : this.hovered;
    const { def, top } = this.model.buttons.get(aim);
    const press = pressing ? this.pressAmount() : 0;
    const snap = pressing ? 1 : s.snap;

    // Pad hovers over the button, then sinks with it on a press.
    this.tipTarget.set(
      THREE.MathUtils.lerp(field.x, def.x, snap),
      top.y - press * TRAVEL + this.hand.thumbRadius + HOVER * (1 - press),
      THREE.MathUtils.lerp(field.z, def.z, snap),
    );
    if (!this.tip) this.tip = this.tipTarget.clone();
    this.tip.lerp(this.tipTarget, 1 - Math.exp(-dt * (pressing ? 45 : 18)));
    // The grip shuffles along the remote, more lazily than the thumb moves.
    const slide = this.hand.slideFor(this.tipTarget);
    this.slide = this.slide === null ? slide : THREE.MathUtils.damp(this.slide, slide, 7, dt);
    this.hand.setSlide(this.slide);
    this.hand.setThumbTip(this.tip);
    this.model.setPress(pressing ? this.pressButton : null, press);
    this.model.setHighlight(s.highlight && this.raise > 0.5 ? aim : null);
    this.model.update(dt);

    // The arm. The forearm leaves the hand along the wrist's own axis with the
    // same oval section, so they meet without a seam or a kink; the elbow is at
    // its far end, and the upper arm runs from there up to the shoulder.
    const fa = this.forearmFrame;
    const k = this.held.scale.x;
    this.shoulder.copy(SHOULDER).applyMatrix4(camera.matrixWorld);
    if (this.hand.forearm) {
      this.hand.forearm(fa);
      fa.position.applyMatrix4(this.held.matrixWorld);
      fa.quaternion.premultiply(this.held.getWorldQuaternion(heldTurn));
      fa.halfWidth *= k;
      fa.halfThickness *= k;
      fa.cuffAt *= k;
    } else {
      // The built-in hand has no wrist frame: aim at the elbow the arm's IK picks.
      this.wrist.copy(this.hand.wrist).applyMatrix4(this.held.matrixWorld);
      this.pole.copy(ELBOW_POLE).applyMatrix4(camera.matrixWorld);
      solveTwoBone(this.shoulder, this.wrist, UPPER_ARM, FOREARM, this.pole, this.elbow, this.reached);
      fa.position.copy(this.wrist);
      fa.quaternion.setFromUnitVectors(Y, dir.subVectors(this.elbow, this.wrist).normalize());
      fa.halfWidth = fa.halfThickness = 0.0265 * k;
      fa.cuffAt = WRIST_SKIN * k;
    }
    this.wrist.copy(fa.position);
    this.elbow.copy(fa.position).addScaledVector(axis.set(0, 1, 0).applyQuaternion(fa.quaternion), FOREARM * k);
    const { halfWidth: w, halfThickness: t, cuffAt } = fa;
    along(this.wristSkin, fa, 0, cuffAt, w * 0.97, t * 0.97);
    along(this.cuff, fa, cuffAt, cuffAt + CUFF * k, w + 0.008 * k, t + 0.008 * k);
    along(this.sleeve, fa, cuffAt + CUFF * k, FOREARM * k, w + 0.01 * k, t + 0.011 * k);
    span(this.upperSleeve, this.elbow, this.shoulder);
    this.elbowJoint.position.copy(this.elbow);

    this.fill.position.set(0.05, 0.12, 0.08).applyMatrix4(camera.matrixWorld);
  }

  // The button the thumb is currently over.
  get target() {
    return this.hovered;
  }
}
