import * as THREE from 'three';
import { Hand } from './Hand.js';
import { RemoteModel, TRAVEL } from './RemoteModel.js';
import { nearestButton, pointerToField, solveTwoBone } from './thumbing.js';
import { FOREARM, Sleeve } from './Sleeve.js';

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
const WRIST_SKIN = 0.045; // bare wrist before the cuff, for a hand that doesn't say
const PRESS = { down: 0.06, hold: 0.06, up: 0.1 };
const PRESS_LENGTH = PRESS.down + PRESS.hold + PRESS.up;
const Y = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const heldTurn = new THREE.Quaternion();

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

    this.sleeve = new Sleeve(this.hand.skin);
    this.root.add(this.sleeve.group);

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

    // Something else can borrow the remote hand for a moment (the drink: your
    // thumb opens the can). `weight` (0…1) eases the remote towards `position`
    // and `quaternion` (world), and the thumb tip towards `thumb` (world),
    // its middle joint bending towards `bend` (remote space, from the knuckle).
    this.override = {
      weight: 0,
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      thumb: new THREE.Vector3(),
      bend: new THREE.Vector3(),
    };
    this.thumbAt = new THREE.Vector3();

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
    this.sleeve.setSkin(next.skin);
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
    const o = this.override;
    if (o.weight > 0) {
      this.held.position.lerp(o.position, o.weight);
      this.held.quaternion.slerp(o.quaternion, o.weight);
    }
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
    if (o.weight > 0) this.tipTarget.lerp(this.held.worldToLocal(this.thumbAt.copy(o.thumb)), o.weight);
    if (!this.tip) this.tip = this.tipTarget.clone();
    this.tip.lerp(this.tipTarget, 1 - Math.exp(-dt * (pressing || o.weight > 0 ? 45 : 18)));
    // The grip shuffles along the remote, more lazily than the thumb moves.
    const slide = this.hand.slideFor(this.tipTarget);
    this.slide = this.slide === null ? slide : THREE.MathUtils.damp(this.slide, slide, 7, dt);
    this.hand.setSlide(this.slide);
    this.hand.bendThumbTowards?.(o.bend, o.weight);
    this.hand.setThumbTip(this.tip);
    this.model.setPress(pressing ? this.pressButton : null, press);
    this.model.setHighlight(s.highlight && this.raise > 0.5 && o.weight === 0 ? aim : null);
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
    this.sleeve.pose(fa, this.shoulder, k);
    this.elbow.copy(this.sleeve.elbow);

    this.fill.position.set(0.05, 0.12, 0.08).applyMatrix4(camera.matrixWorld);
  }

  // The button the thumb is currently over.
  get target() {
    return this.hovered;
  }
}
