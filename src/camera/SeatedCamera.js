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
  lookAround: 1, // how far the view turns towards the pointer outside the remote area
};

// Looking around, at full reach (pointer at a screen edge): turn this far
// (radians), shift the head this far (metres), easing at this rate.
const LOOK = { yaw: 0.2, pitch: 0.12, shift: 0.03, rate: 3 };

// Scroll zoom: up eases the view in to this vertical field of view (degrees),
// down eases it back out to the framed view, over `duration` seconds.
export const ZOOM = { fov: 20, duration: 0.7, reducedDuration: 0.15 };

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// The viewer, slumped on the couch: a fixed seat, framing that adapts to the
// screen's shape, a slow breath, and a two-step zoom. While the pointer works
// the remote the head stays put; outside the remote area it turns a little
// towards the pointer (setLook). The arm hangs off this camera, so it zooms
// and turns with it.
export class SeatedCamera {
  constructor({ eye, target }) {
    this.camera = new THREE.PerspectiveCamera(CAMERA_DEFAULTS.fov, 1, 0.03, 40);
    this.baseFov = CAMERA_DEFAULTS.fov; // the framed view, before zooming
    this.zoomed = false;
    this.zoom = 0; // 0 = framed view, 1 = zoomed in
    this.zoomFrom = 0;
    this.zoomProgress = 1;
    this.lookTarget = new THREE.Vector2();
    this.look = new THREE.Vector2();
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
    this.camera.fov = THREE.MathUtils.lerp(this.baseFov, Math.min(ZOOM.fov, this.baseFov), this.zoom);
    this.camera.updateProjectionMatrix();
  }

  // Look towards the pointer: x, y in −1…1 (y up), 0 to face the set.
  setLook(x, y) {
    this.lookTarget.set(x, y);
  }

  // Zoom in on the set, or back out to the framed view; update() eases there,
  // picking up from wherever the view is if it's still moving.
  setZoomed(zoomed) {
    if (zoomed === this.zoomed) return;
    this.zoomed = zoomed;
    this.zoomFrom = this.zoom;
    this.zoomProgress = 0;
  }

  update(time, dt = 1) {
    const s = this.settings;
    if (this.zoomProgress < 1) {
      this.zoomProgress = Math.min(1, this.zoomProgress + dt / (this.reducedMotion ? ZOOM.reducedDuration : ZOOM.duration));
      this.zoom = THREE.MathUtils.lerp(this.zoomFrom, this.zoomed ? 1 : 0, easeInOut(this.zoomProgress));
      this.applyFov();
    }
    const motion = this.reducedMotion ? 0 : s.breathing;
    this.look.lerp(this.lookTarget, 1 - Math.exp(-dt * LOOK.rate));
    const turn = s.lookAround * (this.reducedMotion ? 0.5 : 1);

    this.forward.subVectors(this.target, this.eye).normalize();
    this.right.crossVectors(this.forward, UP).normalize();
    this.up.crossVectors(this.right, this.forward);

    const breath = Math.sin((time * TAU) / 4.8) * 0.006 * motion;
    const sway = Math.sin((time * TAU) / 11) * 0.004 * motion;
    this.camera.position
      .copy(this.eye)
      .addScaledVector(this.right, sway + this.look.x * LOOK.shift * turn)
      .addScaledVector(this.up, breath + this.look.y * LOOK.shift * 0.5 * turn);

    // Aim below the screen so the TV sits a little above centre, then turn
    // towards wherever you're looking.
    const distance = this.eye.distanceTo(this.target);
    const drop = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance * s.tvHeight;
    this.aim
      .copy(this.target)
      .addScaledVector(UP, -drop)
      .addScaledVector(this.up, breath * 0.5 + Math.tan(this.look.y * LOOK.pitch * turn) * distance)
      .addScaledVector(this.right, Math.tan(this.look.x * LOOK.yaw * turn) * distance);
    this.camera.lookAt(this.aim);
    this.camera.updateMatrixWorld();
  }

  // Where the TV screen sits on screen, in NDC.
  screenRect(screenMesh) {
    return projectBounds(screenMesh, this.camera);
  }
}
