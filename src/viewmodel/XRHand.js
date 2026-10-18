import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { solveTwoBone, swingBone } from './thumbing.js';
import { bend, forearmFrame, forearmRest, orientHand, resetPose, restFrame, rigHand } from './handRig.js';

// The WebXR generic right hand (public/models/hand/right.glb, MIT, from
// @webxr-input-profiles/assets), gripping the remote. Same interface as the
// procedural Hand, so ArmRig can use either.
//
// Its joints are set directly (see handRig.js). The model lives in "hand
// space"; `placement` takes it into remote space (x across, +x on your left;
// y up out of the button face; +z towards the TV), and `group` slides the
// whole grip along the remote.

// How the hand holds the remote. Angles in radians, distances in metres.
// Fitted numerically, then tuned by eye in the lab's Grip folder: the hand lies
// along the remote, which crosses the palm diagonally, with the wrist just
// behind its tail (thumb on CH ▲), the fingers wrapping its left edge and the
// thumb reaching every button.
export const GRIP_DEFAULTS = {
  wristX: -0.055, // where the wrist sits, in remote space
  wristY: -0.043,
  wristZ: -0.105,
  heading: 1.025, // wrist → knuckles: turned from across the remote (+x) towards its tip (+z)…
  elevation: -0.121, // …and tilted up (negative: down)
  roll: -0.03, // the palm turned about that line
  scale: 1.188,
  bendKnuckle: 0.643, // finger bends at the knuckle, middle and end joints…
  bendMiddle: 0.64,
  bendEnd: 0.33,
  wrapIndex: 0.77, // …scaled per finger, since the longer ones loop wider
  wrapMiddle: 1.26,
  wrapRing: 1.5,
  wrapPinky: 1.56,
  thumbLength: 1.2, // the model's thumb is short for a remote this wide; this stretches it
  thumbSwing: 0.332, // how far the CMC swings the thumb across for the far button column
  slideFollow: 0.4, // how much of the way the grip shifts up the remote after the thumb
};

// With the thumb on the CH ▲ row, the grip sits where the settings put it;
// it shifts up the remote (partly) for buttons further along.
const HOME_Z = -0.024;

// The thumb, in remote space. Reaching across the face, the CMC swings the big
// knuckle up and over (`oppose`): `nearSwing` radians for the near button
// column (`across[0]`, remote x) up to the grip's `thumbSwing` for the far one
// (`across[1]`). The IP joint bends towards `pole`, an offset from the big knuckle.
const THUMB = {
  oppose: new THREE.Vector3(0.55, 0.83, 0),
  across: [-0.0135, 0.0165],
  nearSwing: -0.1,
  pole: new THREE.Vector3(-0.01, 0.054, -0.01),
};

// The thumb-tip joint sits at the very end of the thumb; this is how far above
// a button it rests when touching it (ArmRig adds its hover gap on top).
const TIP_ABOVE = 0.006;

const UP = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const turn = new THREE.Quaternion();

export class XRHand {
  static async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new XRHand(gltf.scene);
  }

  constructor(model) {
    this.settings = { ...GRIP_DEFAULTS };
    this.group = new THREE.Group();
    this.placement = new THREE.Group();
    this.group.add(this.placement);
    this.placement.add(model);

    this.skin = new THREE.MeshStandardMaterial({ color: '#c98d6b', roughness: 0.6 });
    Object.assign(this, rigHand(model, this.skin)); // bones, mesh, rest, fingers, thumb

    // The thumb's rest pose: joint positions, bone lengths and directions.
    const at = (bone) => this.rest.get(bone).p;
    const [cmc, mcp, ip, tip] = this.thumb.map(at);
    this.cmc = cmc.clone();
    this.mcpModel = mcp.clone();
    this.mcpRest = mcp.clone(); // big knuckle at rest, after stretching
    this.modelLengths = [mcp.distanceTo(ip), ip.distanceTo(tip)];
    this.lengths = [...this.modelLengths];
    this.restDirs = [
      new THREE.Vector3().subVectors(mcp, cmc).normalize(),
      new THREE.Vector3().subVectors(ip, mcp).normalize(),
      new THREE.Vector3().subVectors(tip, ip).normalize(),
    ];

    this.restFrame = restFrame(this);
    this.forearmRest = forearmRest(this);

    this.knuckle = new THREE.Vector3(); // MCP, moved by the CMC
    this.joint = new THREE.Vector3(); // IP
    this.tip = new THREE.Vector3();
    this.local = new THREE.Vector3();
    this.pole = new THREE.Vector3();
    this.oppose = new THREE.Vector3();
    this.poleOffset = new THREE.Vector3();
    this.bendTowards = new THREE.Vector3(); // see bendThumbTowards
    this.bendWeight = 0;
    this.bendPole = new THREE.Vector3();
    this.inverse = new THREE.Matrix4();
    this.knuckleRest = new THREE.Vector3(); // big knuckle at rest, remote space (before sliding)
    this.wristRest = new THREE.Vector3();
    this.wrist = new THREE.Vector3(); // where the forearm meets the hand, remote space
    this.thumbRadius = TIP_ABOVE;
    this.applyGrip();
  }

  // Place the hand round the remote and curl the fingers, from `settings`.
  applyGrip() {
    const s = this.settings;
    const forward = new THREE.Vector3(
      Math.cos(s.elevation) * Math.cos(s.heading),
      Math.sin(s.elevation),
      Math.cos(s.elevation) * Math.sin(s.heading),
    );
    const palm = UP.clone().addScaledVector(forward, -UP.dot(forward)).normalize().applyAxisAngle(forward, s.roll);
    const r = this.restFrame;
    orientHand(this.placement, r, forward, palm, s.scale, new THREE.Vector3(s.wristX, s.wristY, s.wristZ));
    this.inverse.copy(this.placement.matrix).invert();

    // The thumb, stretched by `thumbLength`, and its directions brought into hand space.
    this.mcpRest.subVectors(this.mcpModel, this.cmc).multiplyScalar(s.thumbLength).add(this.cmc);
    this.lengths = this.modelLengths.map((l) => l * s.thumbLength);
    const toHand = this.placement.quaternion.clone().invert();
    this.oppose.copy(THUMB.oppose).applyQuaternion(toHand);
    this.poleOffset.copy(THUMB.pole).applyQuaternion(toHand).divideScalar(s.scale);
    this.knuckleRest.copy(this.mcpRest).applyMatrix4(this.placement.matrix);
    this.wristRest.copy(r.wrist).applyMatrix4(this.placement.matrix);
    this.setSlide(this.group.position.z);

    resetPose(this.rest);
    const wraps = [s.wrapIndex, s.wrapMiddle, s.wrapRing, s.wrapPinky];
    this.fingers.forEach((chain, n) => bend(chain, [0, s.bendKnuckle * wraps[n], s.bendMiddle * wraps[n], s.bendEnd * wraps[n]]));
    if (this.tipTarget) this.setThumbTip(this.tipTarget);
  }

  // How far along the remote (z) the grip shifts for the thumb to reach
  // `target`: part of the way, the thumb stretching or folding for the rest.
  slideFor(target) {
    return THREE.MathUtils.clamp((target.z - HOME_Z) * this.settings.slideFollow, -0.03, 0.09);
  }

  // Where the forearm leaves the hand, in remote space: the centre of the
  // wrist's oval section, a frame whose +Y runs up the arm (X across the
  // wrist), the section's half-width and half-thickness, and how far along
  // the forearm the cuff should start.
  forearm(out) {
    forearmFrame(out, this.placement, this.forearmRest, this.settings.scale);
    out.position.add(this.group.position);
    return out;
  }

  // Shift the whole grip along the remote.
  setSlide(z) {
    this.group.position.z = z;
    this.wrist.copy(this.wristRest).setZ(this.wristRest.z + z);
  }

  // Bend the thumb's IP joint towards `offset` from the big knuckle (remote
  // space) instead, by `weight`: for reaching over something rather than
  // across the remote's face.
  bendThumbTowards(offset, weight) {
    this.bendTowards.copy(offset).applyQuaternion(this.placement.quaternion.clone().invert()).divideScalar(this.settings.scale);
    this.bendWeight = weight;
  }

  // Put the end of the thumb on `target` (remote space): swing the metacarpal
  // from the CMC, then bend the MCP and IP (two-bone IK).
  setThumbTip(target) {
    this.tipTarget = target;
    this.local.copy(target).setZ(target.z - this.group.position.z).applyMatrix4(this.inverse);
    const [near, far] = THUMB.across;
    const across = THREE.MathUtils.clamp((target.x - near) / (far - near), 0, 1);
    swingBone(this.cmc, this.mcpRest, this.oppose, THREE.MathUtils.lerp(THUMB.nearSwing, this.settings.thumbSwing, across), this.knuckle);
    this.pole.addVectors(this.knuckle, this.poleOffset);
    if (this.bendWeight > 0) this.pole.lerp(this.bendPole.addVectors(this.knuckle, this.bendTowards), this.bendWeight);
    solveTwoBone(this.knuckle, this.local, ...this.lengths, this.pole, this.joint, this.tip);

    const [metacarpal, proximal, distal, end] = this.thumb;
    const points = [this.cmc, this.knuckle, this.joint, this.tip];
    [metacarpal, proximal, distal].forEach((bone, i) => {
      dir.subVectors(points[i + 1], points[i]).normalize();
      turn.setFromUnitVectors(this.restDirs[i], dir);
      bone.position.copy(points[i]);
      bone.quaternion.copy(this.rest.get(bone).q).premultiply(turn);
    });
    end.position.copy(this.tip);
    end.quaternion.copy(distal.quaternion);
  }
}
