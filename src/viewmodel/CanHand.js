import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bendAt, forearmFrame, forearmRest, orientHand, resetPose, restFrame, rigHand, turnAt } from './handRig.js';

// The WebXR generic left hand (public/models/hand/left.glb, MIT, from
// @webxr-input-profiles/assets), holding a can. It works in "grip space": the
// can's axis runs up +y through the origin, at the height the hand holds it;
// +z is the side facing you and +x is your right. The palm rests against the
// can's left side with the fingers round its far side; each finger, and the
// thumb round the near side, curls joint by joint until it meets the can
// (wrapAngles), so the grip fits the can whatever the settings. setClosed()
// opens the hand to let go (0) or closes it round the can (1).
//
// The placement was fitted numerically: no skin inside the can or below its
// base (the table, when it's standing there), the palm and fingertips resting
// on it, the thumb round the near side, and the wrist in line with the forearm.

export const CAN_GRIP_DEFAULTS = {
  radius: 0.0323, // the can's, in metres
  wristX: -0.086, // where the wrist sits
  wristY: -0.019,
  wristZ: 0.071,
  heading: 0.091, // wrist → knuckles: from straight ahead (−z), turned this far towards your right…
  pitch: 0.23, // …and tilted up
  roll: -0.156, // the palm turned about that line, from facing the can
  scale: 1.188, // as the right hand
  thumbAround: 0.061, // the thumb swings from its base across the can's near side, towards this far round it (radians from straight towards you, + to your right)…
  thumbHeight: 0.034, // …at this height
  thickness: 0.0085, // a finger's half-thickness, so the skin rests on the can, not the bone
};

// The open hand: a relaxed curl at each finger joint (knuckle, middle, end).
const OPEN = [0.15, 0.2, 0.1];
const MAX_BEND = 1.7;

const UP = new THREE.Vector3(0, 1, 0);
const NO_TURN = new THREE.Quaternion();
const swing = new THREE.Quaternion();
const hinge = new THREE.Vector3();
const probe = new THREE.Vector3();
const offset = new THREE.Vector3();

// Distance from `p` to the line through `centre` along unit `up`.
function axisDistance(p, centre, up) {
  offset.subVectors(p, centre);
  return offset.addScaledVector(up, -offset.dot(up)).length();
}

// Curl `chain` at each joint from `first` to the second-last, about the
// joint's hinge, just far enough that the next joint meets a cylinder (axis
// through `centre` along unit `up`, `radius` plus the finger's
// `thickness`; a little wider for longer bones, so their middles clear it
// too). Bends the chain as it goes and returns the angles. A joint that can't
// reach curls as close as it gets.
export function wrapAngles(chain, first, centre, up, radius, thickness, max = MAX_BEND) {
  const angles = [];
  for (let k = first; k < chain.length - 1; k++) {
    const joint = chain[k].position;
    const next = chain[k + 1].position;
    const reach = Math.hypot(radius + thickness, joint.distanceTo(next) / 2);
    hinge.set(1, 0, 0).applyQuaternion(chain[k].quaternion);
    const distanceAt = (a) => axisDistance(probe.subVectors(next, joint).applyAxisAngle(hinge, -a).add(joint), centre, up);

    let angle = 0;
    if (distanceAt(0) > reach) {
      // Step round until it touches, then close in on the touch.
      let lo = 0;
      let hi = null;
      let closest = 0;
      let best = Infinity;
      for (let a = 0.05; a <= max + 1e-9; a += 0.05) {
        const d = distanceAt(a);
        if (d < best) [best, closest] = [d, a];
        if (d <= reach) {
          hi = a;
          break;
        }
        lo = a;
      }
      if (hi === null) angle = closest;
      else {
        for (let i = 0; i < 20; i++) {
          const mid = (lo + hi) / 2;
          if (distanceAt(mid) > reach) lo = mid;
          else hi = mid;
        }
        angle = hi;
      }
    }
    bendAt(chain, k, angle);
    angles.push(angle);
  }
  return angles;
}

export class CanHand {
  static async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new CanHand(gltf.scene);
  }

  constructor(model) {
    this.settings = { ...CAN_GRIP_DEFAULTS };
    this.group = new THREE.Group(); // grip space
    this.placement = new THREE.Group();
    this.group.add(this.placement);
    this.placement.add(model);
    this.skin = new THREE.MeshStandardMaterial({ color: '#c98d6b', roughness: 0.6 });
    Object.assign(this, rigHand(model, this.skin)); // bones, mesh, rest, fingers, thumb
    this.restFrame = restFrame(this);
    this.forearmRest = forearmRest(this);
    this.inverse = new THREE.Matrix4();
    this.closed = 1;
    this.applyGrip();
  }

  // Place the hand against the can and work out how far each joint curls to
  // wrap it, from `settings`.
  applyGrip() {
    const s = this.settings;
    const forward = new THREE.Vector3(Math.sin(s.heading) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.heading) * Math.cos(s.pitch));
    // The palm faces the can's axis (+x, from its left side), square to the fingers.
    const palm = new THREE.Vector3(1, 0, 0).addScaledVector(forward, -forward.x).normalize().applyAxisAngle(forward, s.roll);
    orientHand(this.placement, this.restFrame, forward, palm, s.scale, new THREE.Vector3(s.wristX, s.wristY, s.wristZ));
    this.inverse.copy(this.placement.matrix).invert();

    // The can's axis and size in the model's own space.
    const centre = new THREE.Vector3().applyMatrix4(this.inverse);
    const up = UP.clone().transformDirection(this.inverse);
    const radius = s.radius / s.scale;
    const thickness = s.thickness / s.scale;

    // The thumb swings at its base to head for the near side of the can, then wraps it too.
    resetPose(this.rest);
    const [base, knuckle] = this.thumb.map((b) => b.position);
    const aim = new THREE.Vector3(Math.sin(s.thumbAround), 0, Math.cos(s.thumbAround))
      .multiplyScalar(s.radius + s.thickness * 2)
      .setY(s.thumbHeight)
      .applyMatrix4(this.inverse);
    const swung = new THREE.Quaternion().setFromUnitVectors(knuckle.clone().sub(base).normalize(), aim.sub(base).normalize());
    // …turned on its own axis so its knuckle's hinge runs along the can, and
    // it curls round the side rather than over the top. Of the two ways
    // round, the one that curls towards the can.
    turnAt(this.thumb, 0, swung);
    const bone = knuckle.clone().sub(base).normalize();
    const square = (v) => v.addScaledVector(bone, -v.dot(bone)).normalize();
    const hingeNow = square(new THREE.Vector3(1, 0, 0).applyQuaternion(this.thumb[1].quaternion));
    let best = Infinity;
    for (const sign of [1, -1]) {
      const along = square(up.clone().multiplyScalar(sign));
      const twist = new THREE.Quaternion().setFromAxisAngle(bone, Math.atan2(hingeNow.clone().cross(along).dot(bone), hingeNow.dot(along)));
      const turn = twist.multiply(swung);
      resetPose(this.rest);
      turnAt(this.thumb, 0, turn);
      bendAt(this.thumb, 1, 0.6);
      const reach = axisDistance(this.thumb.at(-1).position, centre, up);
      if (reach < best) [best, this.thumbTurn] = [reach, turn];
    }
    resetPose(this.rest);
    turnAt(this.thumb, 0, this.thumbTurn);
    this.wrapped = {
      fingers: this.fingers.map((chain) => wrapAngles(chain, 1, centre, up, radius, thickness)),
      thumb: wrapAngles(this.thumb, 1, centre, up, radius, thickness * 1.15),
    };
    this.setClosed(this.closed, true);
  }

  // Open (0) … wrapped round the can (1).
  setClosed(closed, force = false) {
    if (closed === this.closed && !force) return;
    this.closed = closed;
    resetPose(this.rest);
    const mix = (open, wrapped) => open + (wrapped - open) * closed;
    this.fingers.forEach((chain, n) => this.wrapped.fingers[n].forEach((angle, i) => bendAt(chain, i + 1, mix(OPEN[i], angle))));
    turnAt(this.thumb, 0, swing.slerpQuaternions(NO_TURN, this.thumbTurn, closed));
    this.wrapped.thumb.forEach((angle, i) => bendAt(this.thumb, i + 1, mix(0.1, angle)));
  }

  // Where the forearm leaves the hand, in grip space (see forearmFrame).
  forearm(out) {
    return forearmFrame(out, this.placement, this.forearmRest, this.settings.scale);
  }
}
