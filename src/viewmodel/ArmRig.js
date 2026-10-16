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
const PRESS = { down: 0.06, hold: 0.06, up: 0.1 };
const PRESS_LENGTH = PRESS.down + PRESS.hold + PRESS.up;
const Y = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();

// Stretch a unit-height mesh between two points.
function span(mesh, a, b) {
  dir.subVectors(b, a);
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.scale.y = dir.length();
  mesh.quaternion.setFromUnitVectors(Y, dir.normalize());
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
    this.hand = new Hand();
    this.held.add(this.model.group, this.hand.group);
    this.root.add(this.held);

    const sleeveMaterial = new THREE.MeshStandardMaterial({ map: createFlannelTexture(), roughness: 0.9, side: THREE.DoubleSide });
    this.sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.056, 1, 24, 1, true), sleeveMaterial);
    this.upperSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 1, 24, 1, true), sleeveMaterial);
    this.elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.057, 20, 12), sleeveMaterial);
    this.cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 24), new THREE.MeshStandardMaterial({ color: '#5a1410', roughness: 0.9 }));
    this.wristSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.029, 1, 16), this.hand.skin);
    this.root.add(this.sleeve, this.upperSleeve, this.elbowJoint, this.cuff, this.wristSkin);
    this.root.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true;
    });

    // A little warm fill so the hand reads against the dark room.
    this.fill = new THREE.PointLight('#ffd6b8', 0.35, 1.2, 2);
    this.root.add(this.fill);

    // Rest the thumb over CH ▲ until the pointer arrives.
    this.pointer = new THREE.Vector2(0.41, -0.45);
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
    this.cuffStart = new THREE.Vector3();
    this.cuffEnd = new THREE.Vector3();
    this.elbow = new THREE.Vector3();
    this.shoulder = new THREE.Vector3();
    this.pole = new THREE.Vector3();
    this.reached = new THREE.Vector3();

    remote.addEventListener('press', (e) => this.animatePress(e.detail.button));
  }

  // Pointer in NDC (−1…1, y up). The target updates straight away, so a
  // press right after (a tap) goes to the right button.
  setPointer(x, y) {
    this.pointer.set(x, y);
    this.hovered = nearestButton(pointerToField(x, y), this.hovered);
  }

  // Lowered while the pointer is off the page.
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
    this.raise += ((this.active ? 1 : 0) - this.raise) * (1 - Math.exp(-dt * 5));
    const lower = 1 - this.raise;
    const sway = reducedMotion ? 0 : 1;

    // Hold the remote out in front, aimed at the TV, face tilted towards you.
    this.offset.set(
      s.x + Math.sin(time * 0.9) * 0.002 * sway,
      s.y - lower * 0.45 + Math.sin(time * 1.3) * 0.0015 * sway,
      -s.distance + lower * 0.1,
    );
    this.held.position.copy(this.offset).applyMatrix4(camera.matrixWorld);
    this.held.lookAt(this.aimAt);
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
    const slide = Hand.slideFor(this.tipTarget);
    this.slide = this.slide === null ? slide : THREE.MathUtils.damp(this.slide, slide, 7, dt);
    this.hand.setSlide(this.slide);
    this.hand.setThumbTip(this.tip);
    this.model.setPress(pressing ? this.pressButton : null, press);
    this.model.setHighlight(s.highlight && this.raise > 0.5 ? aim : null);
    this.model.update(dt);

    // The arm, shoulder to wrist, with the elbow dropping out to the right.
    this.wrist.copy(this.hand.wrist).applyMatrix4(this.held.matrixWorld);
    this.shoulder.copy(SHOULDER).applyMatrix4(camera.matrixWorld);
    this.pole.copy(ELBOW_POLE).applyMatrix4(camera.matrixWorld);
    solveTwoBone(this.shoulder, this.wrist, UPPER_ARM, FOREARM, this.pole, this.elbow, this.reached);
    this.cuffStart.subVectors(this.elbow, this.wrist).setLength(0.045).add(this.wrist);
    this.cuffEnd.subVectors(this.elbow, this.wrist).setLength(0.075).add(this.wrist);
    span(this.wristSkin, this.wrist, this.cuffStart);
    span(this.cuff, this.cuffStart, this.cuffEnd);
    span(this.sleeve, this.cuffEnd, this.elbow);
    span(this.upperSleeve, this.elbow, this.shoulder);
    this.elbowJoint.position.copy(this.elbow);

    this.fill.position.set(0.05, 0.12, 0.08).applyMatrix4(camera.matrixWorld);
  }

  // The button the thumb is currently over.
  get target() {
    return this.hovered;
  }
}
