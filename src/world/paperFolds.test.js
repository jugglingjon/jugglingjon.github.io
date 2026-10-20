import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { centroid, dartFolds, foldSheet, layersAt, poseSheet, stageCount } from './paperFolds.js';

const W = 0.2159; // US letter, in metres
const H = 0.2794;
const folded = foldSheet({ width: W, height: H, steps: dartFolds(W, H) });
const END = stageCount(folded);
const STAGES = [0.3, 0.7, 1, 1.5, 2, 2.4, 2.8, 3, 3.5, END];

const area = (poly) => Math.abs(poly.reduce((sum, [x, y], i) => sum + x * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * y, 0)) / 2;
const at = ([x, y], m) => new THREE.Vector3(x, y, 0).applyMatrix4(m);
const edges = (poly) => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
function onSegment([x, y], [[ax, ay], [bx, by]]) {
  const len = Math.hypot(bx - ax, by - ay);
  const t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len ** 2;
  return t > -1e-9 && t < 1 + 1e-9 && Math.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / len < 1e-7;
}

// Every stretch of crease two facets share on the flat sheet, as [i, j, point].
const joins = [];
folded.facets.forEach((f, i) =>
  edges(f.poly).forEach(([p, q]) => {
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    folded.facets.forEach((g, j) => {
      if (j > i && edges(g.poly).some((e) => onSegment(mid, e))) joins.push([i, j, mid]);
    });
  }),
);

describe('foldSheet', () => {
  it('cuts the sheet along its creases without losing any paper', () => {
    expect(folded.facets.length).toBeGreaterThan(8);
    const total = folded.facets.reduce((sum, f) => sum + area(f.poly), 0);
    expect(total).toBeCloseTo(W * H, 8);
    expect(folded.creases.length).toBeGreaterThanOrEqual(7);
    expect(joins.length).toBeGreaterThanOrEqual(folded.facets.length - 1); // one connected sheet
  });

  it('turns each fold about a crease of its own', () => {
    expect(folded.hinges).toHaveLength(7);
    for (const hinge of folded.hinges) expect(hinge.length).toBeGreaterThan(0.02);
  });
});

describe('poseSheet', () => {
  it('starts as the flat sheet', () => {
    for (const m of poseSheet(folded, 0)) expect(m.equals(new THREE.Matrix4())).toBe(true);
    expect(layersAt(folded, 0).every((layer) => layer === 0)).toBe(true);
  });

  it('only ever turns paper, never stretches it', () => {
    for (const progress of STAGES) {
      for (const m of poseSheet(folded, progress)) {
        expect(m.determinant()).toBeCloseTo(1, 9);
        const [x, y, z] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
        m.extractBasis(x, y, z);
        expect([x.length(), y.length(), z.length(), Math.abs(x.dot(y))].map((v) => +v.toFixed(9))).toEqual([1, 1, 1, 0]);
      }
    }
  });

  it('keeps every crease joined, all the way through', () => {
    for (const progress of STAGES) {
      const m = poseSheet(folded, progress);
      for (const [i, j, point] of joins) expect(at(point, m[i]).distanceTo(at(point, m[j]))).toBeLessThan(1e-9);
    }
  });

  it('folds in four stages, mirrored pairs together', () => {
    expect(END).toBe(4);
  });

  it('ends up a dart: nose to tail the length of the page, wings out either side of a keel', () => {
    const m = poseSheet(folded, END);
    const box = new THREE.Box3();
    folded.facets.forEach((f, i) => f.poly.forEach((p) => box.expandByPoint(at(p, m[i]))));
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(H - 0.005); // nose to tail
    expect(size.y).toBeLessThan(H + 0.015);
    expect(size.z).toBeGreaterThan(0.12); // wingspan
    expect(size.z).toBeLessThan(0.18);
    expect(size.x).toBeLessThan(0.06); // keel to wing root, and a little dihedral
  });

  it('folds the two halves together down the middle, wings apart', () => {
    const m = poseSheet(folded, END);
    const side = (f) => Math.sign(centroid(f.poly)[0]);
    const zs = (s) => folded.facets.flatMap((f, i) => (side(f) === s ? f.poly.map((p) => at(p, m[i]).z) : []));
    expect(Math.max(...zs(-1))).toBeGreaterThan(0.05); // the left wing out one side
    expect(Math.min(...zs(1))).toBeLessThan(-0.05); // the right wing out the other
  });

  it('keeps the print inside: the outermost layers show their blank backs', () => {
    const done = 5; // the corners, the edges and the middle folded
    const levels = folded.facets.map((f) => f.layers[done]);
    const [bottom, top] = [Math.min(...levels), Math.max(...levels)];
    for (const f of folded.facets) {
      const turned = f.moves.slice(0, done).filter(Boolean).length % 2 === 1;
      if (f.layers[done] === bottom) expect(turned).toBe(false); // printed side up, into the plane
      if (f.layers[done] === top) expect(turned).toBe(true); // printed side down, into the plane
    }
  });

  it('stacks folded layers apart, so they never sit in the same plane', () => {
    const layers = layersAt(folded, 2); // corners and edges folded in, flat
    expect(new Set(layers).size).toBeGreaterThan(2);
  });
});
