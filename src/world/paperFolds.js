import * as THREE from 'three';

// A sheet of paper folded, crease by crease, into a paper plane, and unfolded
// again. Rigid origami: the sheet is cut along its creases into flat facets,
// and each fold turns some of them about a crease, carrying along whatever's
// already folded onto them. Played forwards it folds the plane; backwards it
// opens it out into a flat page.
//
// Sheet space: x across the page, y up it (the top edge becomes the nose), z
// out of the printed side; the flat sheet is centred on the origin.
//
// Each fold is given the way you'd make it by hand, on the paper as it lies
// once the folds before it are done (flat):
//   from, to   two points on the crease
//   moving     a point on the side that folds over
//   dir        +1 to fold it over the top (towards +z), −1 under
//   only       optional: which facets may move, by their middle on the flat
//              sheet ([x, y] → bool), for folding one layer of a stack (a wing)
//   angle      how far it's folded in the finished plane (π, flat, unless set)
//   stage      when it's made, if not one after another: folds that share a
//              stage (a mirrored pair) fold and unfold together

const EPS = 1e-9;
const SLIVER = 1e-9; // m²: a facet any smaller is a rounding error, not paper

// 2D affine maps as [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f.
const IDENTITY = [1, 0, 0, 1, 0, 0];
const apply = ([a, b, c, d, e, f], [x, y]) => [a * x + c * y + e, b * x + d * y + f];
const compose = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]; // n, then m
const invert = ([a, b, c, d, e, f]) => {
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
};
// Mirror in the line through p along unit u.
function reflection([px, py], [ux, uy]) {
  const a = 2 * ux * ux - 1;
  const b = 2 * ux * uy;
  const d = 2 * uy * uy - 1;
  return [a, b, b, d, px - (a * px + b * py), py - (b * px + d * py)];
}

const area = (poly) => Math.abs(poly.reduce((sum, [x, y], i) => {
  const [nx, ny] = poly[(i + 1) % poly.length];
  return sum + x * ny - nx * y;
}, 0)) / 2;
export const centroid = (poly) => poly.reduce(([sx, sy], [x, y]) => [sx + x / poly.length, sy + y / poly.length], [0, 0]);

// The part of a convex polygon where `value` ≥ 0 (a half-plane).
function clip(poly, value) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const vp = value(p);
    const vq = value(q);
    if (vp >= -EPS) out.push(p);
    if ((vp > EPS && vq < -EPS) || (vp < -EPS && vq > EPS)) {
      const t = vp / (vp - vq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out.filter((p, i) => Math.hypot(p[0] - out[(i + 1) % out.length][0], p[1] - out[(i + 1) % out.length][1]) > 1e-12);
}

// Cut the sheet along every crease the folds make. Returns the facets (each
// a convex polygon on the flat sheet, with which folds move it and how high
// it sits in the stack after each fold), the creases, and for each fold the
// crease it turns about.
export function foldSheet({ width, height, steps }) {
  let facets = [
    {
      poly: [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]],
      xf: IDENTITY, // flat sheet → where it lies once the folds so far are done
      moves: [],
      heights: [0],
    },
  ];
  const creases = [];
  const hinges = [];

  steps.forEach((step, k) => {
    const len = Math.hypot(step.to[0] - step.from[0], step.to[1] - step.from[1]);
    const u = [(step.to[0] - step.from[0]) / len, (step.to[1] - step.from[1]) / len];
    const side = ([x, y]) => u[0] * (y - step.from[1]) - u[1] * (x - step.from[0]);
    const sign = Math.sign(side(step.moving));
    const beyond = (p) => sign * side(p); // > 0 on the side that folds over
    const mirror = reflection(step.from, u);
    let hinge = null;

    const next = [];
    for (const facet of facets) {
      const candidate = !step.only || step.only(centroid(facet.poly));
      const laid = facet.poly.map((p) => apply(facet.xf, p));
      const values = laid.map(beyond);
      const child = (poly, moves) => ({ ...facet, poly, moves: [...facet.moves, moves], heights: [...facet.heights] });
      if (!candidate || values.every((v) => v <= EPS)) next.push(child(facet.poly, false));
      else if (values.every((v) => v >= -EPS)) next.push(child(facet.poly, true));
      else {
        const back = invert(facet.xf);
        const over = clip(laid, beyond).map((p) => apply(back, p));
        const stays = clip(laid, (p) => -beyond(p)).map((p) => apply(back, p));
        if (area(over) < SLIVER) next.push(child(facet.poly, false));
        else if (area(stays) < SLIVER) next.push(child(facet.poly, true));
        else {
          next.push(child(stays, false), child(over, true));
          // The cut: the stretch of the stationary half that lies on the crease.
          const cut = stays.filter((p) => Math.abs(beyond(apply(facet.xf, p))) < 1e-7);
          if (cut.length >= 2) {
            const [a, b] = [cut[0], cut[cut.length - 1]];
            creases.push({ from: a, to: b, step: k });
            const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (!hinge || length > hinge.length) hinge = { a, b, length, moves: facet.moves.slice() };
          }
        }
      }
    }

    // Nothing was cut (the crease runs along edges already there): turn about
    // the longest stationary edge on the crease instead.
    if (!hinge) {
      for (const facet of next) {
        if (facet.moves[k] || (step.only && !step.only(centroid(facet.poly)))) continue;
        facet.poly.forEach((p, i) => {
          const q = facet.poly[(i + 1) % facet.poly.length];
          if (Math.abs(side(apply(facet.xf, p))) > 1e-7 || Math.abs(side(apply(facet.xf, q))) > 1e-7) return;
          const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (!hinge || length > hinge.length) hinge = { a: p, b: q, length, moves: facet.moves.slice(0, k) };
        });
      }
    }
    if (!hinge) throw new Error(`Fold ${k + 1} has no crease to turn about`);
    hinges.push(hinge);

    // Fold over: what moves is mirrored in the crease, and lands on top of
    // everything (or under it, folding under), in reverse order.
    const levels = next.map((f) => f.heights[k]);
    const pivot = step.dir > 0 ? Math.max(...levels) + 0.5 : Math.min(...levels) - 0.5;
    for (const facet of next) {
      const h = facet.heights[k];
      if (facet.moves[k]) {
        facet.xf = compose(mirror, facet.xf);
        facet.heights.push(2 * pivot - h);
      } else facet.heights.push(h);
    }
    facets = next;
  });

  // Each facet's place in the stack after each fold, counted in layers.
  for (let s = 0; s <= steps.length; s++) {
    const levels = [...new Set(facets.map((f) => f.heights[s]))].sort((a, b) => a - b);
    for (const facet of facets) {
      facet.layers ??= [];
      facet.layers[s] = levels.indexOf(facet.heights[s]);
    }
  }
  return { width, height, steps, facets, creases, hinges };
}

const ease = (t) => t * t * (3 - 2 * t);
const UP = new THREE.Vector3(0, 0, 1);

const stageOf = (step, k) => step.stage ?? k;

// How many stages folding it takes, one after another: progress runs from 0
// (the flat sheet) to this (the finished plane).
export const stageCount = (folded) => Math.max(...folded.steps.map(stageOf)) + 1;

// Where each facet is, as a matrix from the flat sheet into sheet space, at
// `progress`: 0 is the flat sheet, 1 the first stage made, … stageCount the
// finished plane.
export function poseSheet(folded, progress, matrices = []) {
  const { steps, facets, hinges } = folded;
  const entities = [...facets, ...hinges];
  const m = entities.map((_, i) => (matrices[i] ?? new THREE.Matrix4()).identity());
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const up = new THREE.Vector3();
  const reach = new THREE.Vector3();
  const turn = new THREE.Matrix4();
  const shift = new THREE.Matrix4();

  steps.forEach((step, k) => {
    const amount = ease(THREE.MathUtils.clamp(progress - stageOf(step, k), 0, 1));
    if (amount === 0) return;
    // The crease, where it is now, carried there by the facet it belongs to.
    const hinge = hinges[k];
    const anchor = m[facets.length + k];
    a.set(hinge.a[0], hinge.a[1], 0).applyMatrix4(anchor);
    b.set(hinge.b[0], hinge.b[1], 0).applyMatrix4(anchor);
    axis.subVectors(b, a).normalize();
    // Which way is "over the top" there: the stack's up, as that facet sees it.
    const flips = hinge.moves.filter(Boolean).length;
    up.copy(UP).multiplyScalar(flips % 2 ? -1 : 1).transformDirection(anchor);
    // Turn so the folding side swings towards dir·up.
    const mover = facets.findIndex((f) => f.moves[k]);
    const [cx, cy] = centroid(facets[mover].poly);
    reach.set(cx, cy, 0).applyMatrix4(m[mover]).sub(a);
    reach.addScaledVector(axis, -reach.dot(axis));
    const way = Math.sign(new THREE.Vector3().crossVectors(axis, reach).dot(up)) * step.dir || 1;
    const angle = way * (step.angle ?? Math.PI) * amount;
    turn.makeTranslation(a.x, a.y, a.z).multiply(shift.makeRotationAxis(axis, angle)).multiply(shift.makeTranslation(-a.x, -a.y, -a.z));
    entities.forEach((e, i) => {
      if (e.moves[k]) m[i].premultiply(turn);
    });
  });
  return m.slice(0, facets.length);
}

// How far to lift each facet off the flat sheet, in layers, at `progress`, so
// stacked layers don't flicker through each other: its place in the stack the
// folds already made leave (those in progress are still turning), along its
// own z, which faces down the stack once it's been turned over.
export function layersAt(folded, progress) {
  const done = folded.steps.filter((step, k) => stageOf(step, k) < Math.floor(progress)).length;
  return folded.facets.map((f) => {
    const flips = f.moves.slice(0, done).filter(Boolean).length;
    return (flips % 2 ? -1 : 1) * f.layers[done];
  });
}

// A dart, the paper plane everyone learns first, from a sheet `width` ×
// `height`, printed side in (so unfolding it shows the page): the top corners
// in to the middle, the new edges in to the middle again, in half down the
// middle, then a wing down on each side, leaving a keel `keel` deep at the
// tail. Each mirrored pair folds together: four stages.
export function dartFolds(width, height, { keel = 0.035, nose = 0.006, open = 0.16, dihedral = 0.14 } = {}) {
  const top = height / 2;
  const slant = Math.tan(Math.PI / 8); // the second folds halve the 45° of the first
  const left = (p) => p[0] < 0;
  const right = (p) => p[0] > 0;
  const wing = { from: [nose, top], to: [keel, -top], moving: [width / 2 - 0.005, -top + 0.005] };
  return [
    { from: [0, top], to: [-width / 2, top - width / 2], moving: [-width / 2 + 0.001, top - 0.001], dir: 1, stage: 0 },
    { from: [0, top], to: [width / 2, top - width / 2], moving: [width / 2 - 0.001, top - 0.001], dir: 1, stage: 0 },
    { from: [0, top], to: [-width / 2, top - width / 2 / slant], moving: [-width / 2 + 0.001, 0], dir: 1, stage: 1 },
    { from: [0, top], to: [width / 2, top - width / 2 / slant], moving: [width / 2 - 0.001, 0], dir: 1, stage: 1 },
    { from: [0, top], to: [0, -top], moving: [-0.01, 0], dir: 1, angle: Math.PI - open, stage: 2 },
    // The left half is on top now: its wing folds up, the right one down.
    { ...wing, dir: 1, only: left, angle: Math.PI / 2 - dihedral, stage: 3 },
    { ...wing, dir: -1, only: right, angle: Math.PI / 2 - dihedral, stage: 3 },
  ];
}
