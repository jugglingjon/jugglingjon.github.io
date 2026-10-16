import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { solveTwoBone, swingBone } from './thumbing.js';

// A right hand gripping the remote, built in remote-local space (x across,
// y up out of the button face, +z towards the TV; +x is on your left). The
// palm wraps the bottom-right edge, the fingers curl under and up round
// your-left edge, and the thumb reaches over the face from the right.
//
// The thumb is three bones, solved every frame. The metacarpal swings from
// the CMC joint down by the wrist, carrying the big knuckle (MCP) up and over
// the face as you reach across it, and the fleshy pad at its base stretches
// with it. Then the MCP and IP joints bend (two-bone IK) to put the pad on
// the target. The whole grip can also slide along the remote (`slide`), the
// way you shuffle it in your hand to reach the far end.

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
  cmc: v(-0.046, -0.016, -0.082), // where the thumb meets the wrist
  base: v(-0.034, 0.006, -0.03), // the big knuckle at rest, beside the remote's edge
  pole: v(-0.044, 0.06, -0.04), // the middle joint arches up and back (moves with the knuckle)
  lengths: [0.04, 0.034],
  radii: [0.0105, 0.0095],
  // Reaching across the face, the CMC swings the knuckle up and over
  // (`oppose`): from `swing[0]` radians for a target `across[0]` across from
  // the knuckle (the near column; a little back and down, out of the way) to
  // `swing[1]` at `across[1]` (the far column).
  oppose: v(0.55, 0.83, 0),
  across: [0.02, 0.05],
  swing: [-0.1, 0.32],
};
const THENAR_ROOT = v(-0.052, -0.02, -0.09); // the fleshy pad starts in the palm…
const THENAR_ALONG = 0.5; // …and runs to this far up the metacarpal

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

    // Thumb: metacarpal (CMC → MCP) with the fleshy pad beneath it, then the
    // two phalanges.
    const [la, lb] = THUMB.lengths;
    const [ra, rb] = THUMB.radii;
    this.metacarpal = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.0122, THUMB.cmc.distanceTo(THUMB.base), 6, 12), skin));
    this.thenarEnd = new THREE.Vector3().lerpVectors(THUMB.cmc, THUMB.base, THENAR_ALONG);
    this.thenar = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.016, THENAR_ROOT.distanceTo(this.thenarEnd), 6, 12), skin));
    this.proximal = add(new THREE.Mesh(new THREE.CapsuleGeometry(ra, la, 6, 12), skin));
    this.distal = add(new THREE.Mesh(new THREE.CapsuleGeometry(rb, lb, 6, 12), skin));
    const thumbNail = new THREE.Mesh(new RoundedBoxGeometry(0.0105, 0.012, 0.002, 2, 0.0009), nail);
    thumbNail.position.set(0, lb / 2 - 0.003, rb * 0.9);
    this.distal.add(thumbNail);

    this.knuckle = THUMB.base.clone(); // MCP, moved by the CMC
    this.pole = new THREE.Vector3();
    this.joint = new THREE.Vector3(); // IP
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
  // remote space: swing the metacarpal from the CMC, then bend the MCP and IP.
  setThumbTip(target) {
    const [la, lb] = THUMB.lengths;
    this.local.copy(target).setZ(target.z - this.group.position.z);
    const [near, far] = THUMB.across;
    const across = THREE.MathUtils.clamp((this.local.x - THUMB.base.x - near) / (far - near), 0, 1);
    swingBone(THUMB.cmc, THUMB.base, THUMB.oppose, THREE.MathUtils.lerp(...THUMB.swing, across), this.knuckle);
    this.pole.subVectors(THUMB.pole, THUMB.base).add(this.knuckle);
    solveTwoBone(this.knuckle, this.local, la, lb, this.pole, this.joint, this.tip);
    align(this.metacarpal, THUMB.cmc, this.knuckle);
    this.thenarEnd.lerpVectors(THUMB.cmc, this.knuckle, THENAR_ALONG);
    align(this.thenar, THENAR_ROOT, this.thenarEnd);
    align(this.proximal, this.knuckle, this.joint);
    align(this.distal, this.joint, this.tip);
  }

  // Where the CMC sits, in hand space (fixed; the knuckle moves).
  static get cmc() {
    return THUMB.cmc;
  }
}
