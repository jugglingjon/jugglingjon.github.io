import * as THREE from 'three';
import { createFlannelTexture } from '../world/textures.js';

// A flannel shirt sleeve, from where the forearm leaves the hand up to the
// shoulder: a strip of bare wrist, the cuff, the forearm, the elbow and the
// upper arm. The forearm leaves the hand along the frame it's given, with the
// same oval section, so they meet without a seam; the elbow is at its far end,
// and the upper arm runs from there to the shoulder, however far that is.

export const FOREARM = 0.27;
const CUFF = 0.03; // along the forearm, from where it leaves the hand
const Y = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const axis = new THREE.Vector3();
let flannel = null; // one texture for both arms

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

export class Sleeve {
  constructor(skin) {
    flannel ??= createFlannelTexture();
    const material = new THREE.MeshStandardMaterial({ map: flannel, roughness: 0.9, side: THREE.DoubleSide });
    this.group = new THREE.Group();
    // Unit sections, scaled to the wrist each frame; the sleeve widens 45% to the elbow.
    this.forearm = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1, 1, 24, 1, true), material);
    this.upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 1, 24, 1, true), material);
    this.elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.057, 20, 12), material);
    this.cuff = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), new THREE.MeshStandardMaterial({ color: '#5a1410', roughness: 0.9 }));
    this.wristSkin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), skin);
    this.group.add(this.forearm, this.upperArm, this.elbowJoint, this.cuff, this.wristSkin);
    this.group.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true;
    });
    this.elbow = new THREE.Vector3();
  }

  setSkin(skin) {
    this.wristSkin.material = skin;
  }

  // Fit the sleeve to the forearm's frame (world: `position`, `quaternion`
  // with +Y up the arm, `halfWidth`, `halfThickness`, `cuffAt`) and the
  // shoulder, at scale `k`.
  pose(frame, shoulder, k = 1) {
    this.elbow.copy(frame.position).addScaledVector(axis.set(0, 1, 0).applyQuaternion(frame.quaternion), FOREARM * k);
    const { halfWidth: w, halfThickness: t, cuffAt } = frame;
    along(this.wristSkin, frame, 0, cuffAt, w * 0.97, t * 0.97);
    along(this.cuff, frame, cuffAt, cuffAt + CUFF * k, w + 0.008 * k, t + 0.008 * k);
    along(this.forearm, frame, cuffAt + CUFF * k, FOREARM * k, w + 0.01 * k, t + 0.011 * k);
    span(this.upperArm, this.elbow, shoulder);
    this.elbowJoint.position.copy(this.elbow);
  }
}
