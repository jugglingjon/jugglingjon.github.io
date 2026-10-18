import * as THREE from 'three';

// The remote's button layout, in remote-local metres: z along the face
// (+ = towards the TV), x across it. The remote points away from you, so its
// +x is on *your left*: things you see on the right have negative x. Same
// buttons and order as the lab's DOM remote, as you see them: INFO top left
// and POWER top right, the number pad with RCL / 0 / MUTE, then VOL (left) and
// CH (right) rockers.
const COLS = [0.0165, 0, -0.0165]; // your left → right
const ROWS = [0.05, 0.033, 0.016, -0.001];
const PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['recall', '0', 'mute'],
];
const LABELS = { recall: 'RCL', mute: 'MUTE', power: 'POWER', info: 'INFO', 'vol+': '+', 'vol-': '−', 'ch+': '▲', 'ch-': '▼' };

export const REMOTE_BUTTONS = [
  { button: 'info', x: 0.012, z: 0.066, w: 0.018, d: 0.0095, kind: 'info' },
  { button: 'power', x: -0.012, z: 0.066, w: 0.018, d: 0.0095, kind: 'power' },
  ...PAD.flatMap((row, r) => row.map((button, c) => ({ button, x: COLS[c], z: ROWS[r], w: 0.0125, d: 0.0095, kind: 'key' }))),
  { button: 'vol+', x: 0.0135, z: -0.024, w: 0.017, d: 0.0155, kind: 'rocker' },
  { button: 'vol-', x: 0.0135, z: -0.043, w: 0.017, d: 0.0155, kind: 'rocker' },
  { button: 'ch+', x: -0.0135, z: -0.024, w: 0.017, d: 0.0155, kind: 'rocker' },
  { button: 'ch-', x: -0.0135, z: -0.043, w: 0.017, d: 0.0155, kind: 'rocker' },
].map((b) => ({ ...b, label: LABELS[b.button] ?? b.button }));

// The area the thumb can roam: the buttons plus a small margin.
export const FIELD = { minX: -0.026, maxX: 0.026, minZ: -0.054, maxZ: 0.082 };

// Pointer (NDC, −1…1, y up) → a point on the button field, as you see it:
// screen up runs towards the remote's tip, screen right to its right-hand
// edge (−x). The middle `reach` of the screen covers the whole field, so you
// never need the edges.
export function pointerToField(px, py, reach = 0.8, field = FIELD) {
  const u = THREE.MathUtils.clamp((px / reach + 1) / 2, 0, 1);
  const v = THREE.MathUtils.clamp((py / reach + 1) / 2, 0, 1);
  return { x: THREE.MathUtils.lerp(field.maxX, field.minX, u), z: THREE.MathUtils.lerp(field.minZ, field.maxZ, v) };
}

// Distance from a point to a button's footprint (0 when over it).
function distanceTo(b, point) {
  const dx = Math.max(Math.abs(point.x - b.x) - b.w / 2, 0);
  const dz = Math.max(Math.abs(point.z - b.z) - b.d / 2, 0);
  return Math.hypot(dx, dz);
}

// The button under (or nearest to) a point. Sticks with `current` unless
// another is clearly closer, so the thumb doesn't flicker on a boundary.
export function nearestButton(point, current = null, hysteresis = 0.002, buttons = REMOTE_BUTTONS) {
  let best = null;
  let bestDistance = Infinity;
  for (const b of buttons) {
    const d = distanceTo(b, point);
    if (d < bestDistance) {
      best = b;
      bestDistance = d;
    }
  }
  const held = current && buttons.find((b) => b.button === current);
  if (held && distanceTo(held, point) <= bestDistance + hysteresis) return held.button;
  return best.button;
}

const toTarget = new THREE.Vector3();
const bend = new THREE.Vector3();

// Two-bone IK: places the middle joint of a chain from `base` reaching for
// `target`, bending towards `pole`. Unreachable targets are clamped to the
// chain's reach. Writes into `joint` and `tip`.
export function solveTwoBone(base, target, lengthA, lengthB, pole, joint, tip) {
  toTarget.subVectors(target, base);
  const reach = lengthA + lengthB;
  const distance = THREE.MathUtils.clamp(toTarget.length(), Math.abs(lengthA - lengthB) + 1e-5, reach - 1e-5);
  toTarget.normalize();
  tip.copy(base).addScaledVector(toTarget, distance);

  // Law of cosines: how far along base→tip the joint sits, and how far out.
  const along = (lengthA * lengthA - lengthB * lengthB + distance * distance) / (2 * distance);
  const out = Math.sqrt(Math.max(0, lengthA * lengthA - along * along));

  // Bend direction: the pole, minus its component along the chain.
  bend.subVectors(pole, base);
  bend.addScaledVector(toTarget, -bend.dot(toTarget));
  if (bend.lengthSq() < 1e-12) bend.set(0, 1, 0).addScaledVector(toTarget, -toTarget.y);
  bend.normalize();
  joint.copy(base).addScaledVector(toTarget, along).addScaledVector(bend, out);
}

const restDir = new THREE.Vector3();
const lean = new THREE.Vector3();

// Swings a bone about its root (a saddle joint, like the thumb's CMC) by
// `angle` radians, its end heading off towards `towards` (taken square to the
// bone). Keeps the bone's length; writes its new end to `out`.
export function swingBone(root, restEnd, towards, angle, out) {
  restDir.subVectors(restEnd, root);
  const length = restDir.length();
  restDir.divideScalar(length);
  lean.copy(towards).addScaledVector(restDir, -towards.dot(restDir));
  if (lean.lengthSq() < 1e-12) return out.copy(restEnd);
  lean.normalize();
  return out
    .copy(root)
    .addScaledVector(restDir, Math.cos(angle) * length)
    .addScaledVector(lean, Math.sin(angle) * length);
}
