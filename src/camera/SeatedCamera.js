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
};

// Scroll zoom: the framed field of view is multiplied by this (below 1 zooms in).
export const ZOOM = { min: 0.3, max: 1.25 };

// The viewer, slumped on the couch: a fixed seat, framing that adapts to the
// screen's shape, a slow breath, and a zoom. The head stays put; the pointer
// moves your arm instead (see ArmRig), which hangs off this camera. The arm is
// drawn through `viewmodel`, a twin camera that never zooms, so zooming brings
// the TV closer without blowing up the remote in your hand.
export class SeatedCamera {
  constructor({ eye, target }) {
    this.camera = new THREE.PerspectiveCamera(CAMERA_DEFAULTS.fov, 1, 0.03, 40);
    this.viewmodel = new THREE.PerspectiveCamera(CAMERA_DEFAULTS.fov, 1, 0.03, 40);
    this.baseFov = CAMERA_DEFAULTS.fov;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.eye = eye.clone();
    this.target = target.clone();
    this.settings = { ...CAMERA_DEFAULTS };
    this.reducedMotion = false;
    this.aspect = 1;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.aim = new THREE.Vector3();
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.viewmodel.aspect = aspect;
    this.frame();
  }

  frame() {
    const s = this.settings;
    this.baseFov = fitVerticalFov({
      aspect: this.aspect,
      distance: this.eye.distanceTo(this.target),
      width: s.frameWidth,
      height: s.frameHeight,
      preferred: s.fov,
    });
    this.applyFov();
  }

  applyFov() {
    this.camera.fov = this.baseFov * this.zoom;
    this.camera.updateProjectionMatrix();
    this.viewmodel.fov = this.baseFov;
    this.viewmodel.updateProjectionMatrix();
  }

  // Zoom in (factor below 1) or out, within ZOOM; it eases there in update().
  zoomBy(factor) {
    this.zoomTarget = THREE.MathUtils.clamp(this.zoomTarget * factor, ZOOM.min, ZOOM.max);
  }

  update(time, dt = 1) {
    const s = this.settings;
    if (this.zoom !== this.zoomTarget) {
      this.zoom = THREE.MathUtils.damp(this.zoom, this.zoomTarget, 10, dt);
      if (Math.abs(this.zoom - this.zoomTarget) < 1e-4) this.zoom = this.zoomTarget;
      this.applyFov();
    }
    const motion = this.reducedMotion ? 0 : s.breathing;

    this.forward.subVectors(this.target, this.eye).normalize();
    this.right.crossVectors(this.forward, UP).normalize();
    this.up.crossVectors(this.right, this.forward);

    const breath = Math.sin((time * TAU) / 4.8) * 0.006 * motion;
    const sway = Math.sin((time * TAU) / 11) * 0.004 * motion;
    this.camera.position
      .copy(this.eye)
      .addScaledVector(this.right, sway)
      .addScaledVector(this.up, breath);

    // Aim below the screen so the TV sits a little above centre.
    const distance = this.eye.distanceTo(this.target);
    const drop = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance * s.tvHeight;
    this.aim
      .copy(this.target)
      .addScaledVector(UP, -drop)
      .addScaledVector(this.up, breath * 0.5);
    this.camera.lookAt(this.aim);
    this.camera.updateMatrixWorld();
    this.viewmodel.position.copy(this.camera.position);
    this.viewmodel.quaternion.copy(this.camera.quaternion);
    this.viewmodel.updateMatrixWorld();
  }

  // Where the TV screen sits on screen, in NDC.
  screenRect(screenMesh) {
    return projectBounds(screenMesh, this.camera);
  }
}
