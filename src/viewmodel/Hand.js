import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { solveTwoBone } from './thumbing.js';

// A right hand gripping the remote, built in remote-local space (x across,
// y up out of the button face, +z towards the TV; +x is on your left). The
// palm wraps the bottom-right edge, the fingers curl under and up round
// your-left edge, and the thumb reaches over the face from the right; it's a two-bone chain solved
// with IK every frame. The whole grip can slide along the remote (`slide`),
// the way you shuffle it in your hand to reach the far buttons.

const UP = new THREE.Vector3(0, 1, 0);
const basis = new THREE.Matrix4();
const ax = new THREE.Vector3();
const ay = new THREE.Vector3();
const az = new THREE.Vector3();

// Point a segment's local +y from a to b, keeping its +z (nail side) towards `up`.
function align(mesh, a, b, up = UP) {
  ay.subVectors(b, a).normalize();
  ax.crossVectors(ay, up);
  if (ax.lengthSq() < 1e-8) ax.set(1, 0, 0);
  ax.normalize();
  az.crossVectors(ax, ay);
  basis.makeBasis(ax, ay, az);
  mesh.quaternion.setFromRotationMatrix(basis);
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);

const THUMB = {
  base: v(-0.034, 0.006, -0.03), // the big knuckle, beside the remote's edge
  pole: v(-0.044, 0.06, -0.04), // the middle joint arches up and back
  lengths: [0.04, 0.034],
  radii: [0.0105, 0.0095],
};

export class Hand {
  constructor() {
    this.group = new THREE.Group();
    const skin = (this.skin = new THREE.MeshStandardMaterial({ color: '#c98d6b', roughness: 0.6 }));
    const nail = new THREE.MeshStandardMaterial({ color: '#d9a28c', roughness: 0.3 });
    const add = (mesh) => {
      mesh.receiveShadow = true;
      this.group.add(mesh);
      return mesh;
    };
    const segment = (a, b, radius) => {
      const mesh = add(new THREE.Mesh(new THREE.CapsuleGeometry(radius, a.distanceTo(b), 6, 12), skin));
      align(mesh, a, b);
      return mesh;
    };

    // Palm wrapped round the bottom-right edge, back of the hand towards you.
    const palm = add(new THREE.Mesh(new RoundedBoxGeometry(0.062, 0.026, 0.088, 3, 0.012), skin));
    palm.position.set(-0.037, -0.023, -0.058);
    palm.rotation.z = -0.75;

    // Four fingers curling under the remote and up round its left edge,
    // fingertips just short of the face. Index nearest the tip.
    [
      [-0.024, 0.0088],
      [-0.044, 0.0092],
      [-0.064, 0.0088],
      [-0.082, 0.0076],
    ].forEach(([z, r]) => {
      const knuckle = v(-0.014, -0.036, z);
      const first = v(0.025, -0.025, z + 0.002);
      const second = v(0.042, -0.006, z + 0.003);
      const tip = v(0.035, 0.009, z + 0.004);
      segment(knuckle, first, r);
      segment(first, second, r * 0.95);
      segment(second, tip, r * 0.88);
    });

    // The fleshy pad at the base of the thumb, out to its big knuckle.
    segment(v(-0.05, -0.015, -0.088), v(-0.04, -0.003, -0.052), 0.016);
    segment(v(-0.04, -0.003, -0.052), THUMB.base, 0.0122);

    const [la, lb] = THUMB.lengths;
    const [ra, rb] = THUMB.radii;
    this.proximal = add(new THREE.Mesh(new THREE.CapsuleGeometry(ra, la, 6, 12), skin));
    this.distal = add(new THREE.Mesh(new THREE.CapsuleGeometry(rb, lb, 6, 12), skin));
    const thumbNail = new THREE.Mesh(new RoundedBoxGeometry(0.0105, 0.012, 0.002, 2, 0.0009), nail);
    thumbNail.position.set(0, lb / 2 - 0.003, rb * 0.9);
    this.distal.add(thumbNail);

    this.joint = new THREE.Vector3();
    this.tip = new THREE.Vector3();
    this.local = new THREE.Vector3();
    this.wristRest = v(-0.043, -0.03, -0.1); // where the forearm meets the hand
    this.wrist = this.wristRest.clone();
    this.thumbRadius = rb;
  }

  // How far along the remote (z) the grip should sit so the thumb reaches
  // `target` comfortably: knuckle a little behind the button, within limits.
  static slideFor(target) {
    return THREE.MathUtils.clamp(target.z - 0.03 - THUMB.base.z, -0.02, 0.06);
  }

  // Shift the whole grip along the remote.
  setSlide(z) {
    this.group.position.z = z;
    this.wrist.copy(this.wristRest).setZ(this.wristRest.z + z);
  }

  // Bend the thumb so its tip (centre of the pad) reaches `target`, given in
  // remote space.
  setThumbTip(target) {
    const [la, lb] = THUMB.lengths;
    this.local.copy(target).setZ(target.z - this.group.position.z);
    solveTwoBone(THUMB.base, this.local, la, lb, THUMB.pole, this.joint, this.tip);
    align(this.proximal, THUMB.base, this.joint);
    align(this.distal, this.joint, this.tip);
  }
}
