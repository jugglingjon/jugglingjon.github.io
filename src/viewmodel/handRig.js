import * as THREE from 'three';

// What the WebXR hands share (XRHand holds the remote in your right hand,
// CanHand the can in your left). Their 25 joints follow the WebXR Hand Input
// names and aren't parented to each other: each one is set directly. Each
// joint's −Z runs along its bone and +Y out of the back of the hand (the nail
// side), so +X is its hinge, on either hand.

export const FINGERS = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
export const FINGER_PARTS = ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
export const THUMB_PARTS = ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'];

// Where the forearm leaves the model. The wrist joint's +Z runs back up the
// arm (X across the wrist, Y out of the back of the hand); the mesh carries on
// 2.2 cm past the joint, with an oval section about 5.2 × 2.9 cm. The forearm
// starts a little inside it, and the shirt cuff begins just before the mesh
// ends (`cuffAt` along the forearm), so the cuff wraps over the join.
export const WRIST_SECTION = { back: 0.008, halfWidth: 0.026, halfThickness: 0.0145, cuffAt: 0.012 };

const pivot = new THREE.Vector3();
const axis = new THREE.Vector3();
const turn = new THREE.Quaternion();
const basis = new THREE.Matrix4();
const restBasis = new THREE.Matrix4();

// Turn the chain from joint `k` on about `axis` (through that joint) by `angle`.
function rotateFrom(chain, k, angle) {
  turnAt(chain, k, turn.setFromAxisAngle(axis, angle));
}

// Turn a chain at joint `k` by a quaternion (about that joint).
export function turnAt(chain, k, quaternion) {
  pivot.copy(chain[k].position);
  for (let i = k; i < chain.length; i++) {
    if (i > k) chain[i].position.sub(pivot).applyQuaternion(quaternion).add(pivot);
    chain[i].quaternion.premultiply(quaternion);
  }
}

// Bend a chain at joint `k`, about the joint's own hinge (+X): positive angles
// curl towards the palm.
export function bendAt(chain, k, angle) {
  if (!angle) return;
  axis.set(1, 0, 0).applyQuaternion(chain[k].quaternion);
  rotateFrom(chain, k, -angle);
}

// Bend a chain at each joint in turn.
export function bend(chain, angles) {
  angles.forEach((angle, k) => bendAt(chain, k, angle));
}

// Turn a chain at joint `k` about its own bone (towards the next joint).
export function twistAt(chain, k, angle) {
  if (!angle) return;
  axis.subVectors(chain[k + 1].position, chain[k].position).normalize();
  rotateFrom(chain, k, angle);
}

// A loaded hand model's joints, wearing `skin`: its bones by name, their rest
// pose, the finger and thumb chains, and the skinned mesh.
export function rigHand(model, skin) {
  const bones = {};
  let mesh = null;
  model.traverse((o) => {
    if (o.isSkinnedMesh) {
      mesh = o;
      o.material = skin;
      o.frustumCulled = false; // its bounds don't follow the pose
      o.receiveShadow = true;
    }
    if (o.isBone) bones[o.name] = o;
  });
  const rest = new Map(Object.values(bones).map((b) => [b, { p: b.position.clone(), q: b.quaternion.clone() }]));
  return {
    bones,
    mesh,
    rest,
    fingers: FINGERS.map((f) => FINGER_PARTS.map((p) => bones[`${f}-${p}`])),
    thumb: THUMB_PARTS.map((p) => bones[`thumb-${p}`]),
  };
}

// Back to the rest pose.
export function resetPose(rest) {
  for (const [bone, { p, q }] of rest) {
    bone.position.copy(p);
    bone.quaternion.copy(q);
  }
}

// The hand's own frame at rest: wrist → middle knuckle, the palm's normal
// (pointing out of the palm) and their cross product.
export function restFrame({ bones, rest, fingers }) {
  const at = (bone) => rest.get(bone).p;
  const wrist = at(bones.wrist);
  const forward = new THREE.Vector3().subVectors(at(fingers[1][1]), wrist).normalize();
  const palm = new THREE.Vector3()
    .crossVectors(new THREE.Vector3().subVectors(at(fingers[0][1]), wrist), new THREE.Vector3().subVectors(at(fingers[3][1]), wrist))
    .normalize();
  const back = new THREE.Vector3(0, 1, 0).applyQuaternion(rest.get(fingers[1][1]).q); // nail side
  if (palm.dot(back) > 0) palm.negate();
  palm.addScaledVector(forward, -palm.dot(forward)).normalize();
  return { wrist: wrist.clone(), forward, palm, side: new THREE.Vector3().crossVectors(forward, palm) };
}

// The forearm's start and frame at rest: +Y up the arm, X across the wrist,
// Z out of the palm.
export function forearmRest({ bones, rest }) {
  const wrist = rest.get(bones.wrist);
  const across = new THREE.Vector3(1, 0, 0).applyQuaternion(wrist.q);
  const upArm = new THREE.Vector3(0, 0, 1).applyQuaternion(wrist.q);
  const outOfPalm = new THREE.Vector3(0, -1, 0).applyQuaternion(wrist.q);
  return {
    origin: wrist.p.clone().addScaledVector(upArm, WRIST_SECTION.back),
    quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, upArm, outOfPalm)),
  };
}

// Turn and place `placement` (which holds the model) so the hand's rest frame
// lines up with `forward` (wrist → knuckles) and `palm` (out of the palm),
// unit and square to each other, at `scale`, with the wrist at `wrist`.
export function orientHand(placement, frame, forward, palm, scale, wrist) {
  const side = new THREE.Vector3().crossVectors(forward, palm);
  basis.makeBasis(frame.palm, frame.forward, frame.side);
  restBasis.copy(basis).transpose();
  basis.makeBasis(palm, forward, side).multiply(restBasis);
  placement.quaternion.setFromRotationMatrix(basis);
  placement.scale.setScalar(scale);
  placement.position.copy(wrist).sub(frame.wrist.clone().multiplyScalar(scale).applyQuaternion(placement.quaternion));
  placement.updateMatrix();
}

// Where the forearm leaves a placed hand, in the placement's parent space:
// the centre of the wrist's oval section, a frame whose +Y runs up the arm (X
// across the wrist), the section's half-width and half-thickness, and how far
// along the forearm the cuff should start.
export function forearmFrame(out, placement, rest, scale) {
  out.position.copy(rest.origin).applyMatrix4(placement.matrix);
  out.quaternion.copy(placement.quaternion).multiply(rest.quaternion);
  out.halfWidth = WRIST_SECTION.halfWidth * scale;
  out.halfThickness = WRIST_SECTION.halfThickness * scale;
  out.cuffAt = WRIST_SECTION.cuffAt * scale;
  return out;
}
