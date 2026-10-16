import * as THREE from 'three';
import { fitVerticalFov, projectBounds } from './framing.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

export const CAMERA_DEFAULTS = {
  fov: 42, // preferred vertical FOV on landscape screens
  frameWidth: 0.95, // metres around the TV that must always be in frame
  frameHeight: 0.85,
  tvHeight: 0.18, // how far above centre the TV sits, as a share of the half-frame
  breathing: 1,
  parallax: 1,
};

// The viewer, slumped on the couch: a fixed seat, framing that adapts to the
// screen's shape, a slow breath, and a head that turns a little towards the
// pointer. Phase 4's arm and remote will hang off this camera.
export class SeatedCamera {
  constructor({ eye, target }) {
    this.camera = new THREE.PerspectiveCamera(CAMERA_DEFAULTS.fov, 1, 0.03, 40);
    this.eye = eye.clone();
    this.target = target.clone();
    this.settings = { ...CAMERA_DEFAULTS };
    this.reducedMotion = false;
    this.aspect = 1;
    this.pointer = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.aim = new THREE.Vector3();
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.frame();
  }

  frame() {
    const s = this.settings;
    this.camera.fov = fitVerticalFov({
      aspect: this.aspect,
      distance: this.eye.distanceTo(this.target),
      width: s.frameWidth,
      height: s.frameHeight,
      preferred: s.fov,
    });
    this.camera.updateProjectionMatrix();
  }

  // Pointer in normalised device coordinates (−1…1, y up); (0, 0) recentres.
  setPointer(x, y) {
    this.pointer.set(x, y);
  }

  update(time, dt) {
    const s = this.settings;
    this.look.lerp(this.pointer, 1 - Math.exp(-dt * 3));
    const motion = this.reducedMotion ? 0 : s.breathing;
    const turn = s.parallax * (this.reducedMotion ? 0.3 : 1);

    this.forward.subVectors(this.target, this.eye).normalize();
    this.right.crossVectors(this.forward, UP).normalize();
    this.up.crossVectors(this.right, this.forward);

    const breath = Math.sin((time * TAU) / 4.8) * 0.006 * motion;
    const sway = Math.sin((time * TAU) / 11) * 0.004 * motion;
    this.camera.position
      .copy(this.eye)
      .addScaledVector(this.right, this.look.x * 0.035 * turn + sway)
      .addScaledVector(this.up, this.look.y * 0.02 * turn + breath);

    // Aim below the screen so the TV sits a little above centre, then let the
    // head drift towards the pointer.
    const distance = this.eye.distanceTo(this.target);
    const drop = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance * s.tvHeight;
    this.aim
      .copy(this.target)
      .addScaledVector(UP, -drop)
      .addScaledVector(this.right, this.look.x * 0.28 * turn)
      .addScaledVector(this.up, this.look.y * 0.16 * turn + breath * 0.5);
    this.camera.lookAt(this.aim);
    this.camera.updateMatrixWorld();
  }

  // Where the TV screen sits on screen, in NDC; Phase 4 maps the pointer against it.
  screenRect(screenMesh) {
    return projectBounds(screenMesh, this.camera);
  }
}
