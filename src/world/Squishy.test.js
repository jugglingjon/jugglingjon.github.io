import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Squishy } from './Squishy.js';

describe('Squishy', () => {
  const run = (squishy, seconds, each = () => {}) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      squishy.update(1 / 60);
      each();
    }
  };

  it('presses down and bulges out when squeezed, keeping its volume', () => {
    const toy = new Squishy(new THREE.Object3D());
    toy.squeeze();
    run(toy, 0.1);
    const { x, y, z } = toy.object.scale;
    expect(y).toBeLessThan(0.85);
    expect(x).toBeGreaterThan(1.05);
    expect(x * y * z).toBeCloseTo(1, 6);
  });

  it('springs back up with a wobble, then settles exactly at rest', () => {
    const toy = new Squishy(new THREE.Object3D());
    toy.squeeze();
    let tallest = 0;
    run(toy, 2, () => (tallest = Math.max(tallest, toy.object.scale.y)));
    expect(tallest).toBeGreaterThan(1.02); // overshoots, like something soft
    expect(toy.object.scale.toArray()).toEqual([1, 1, 1]);
    expect(toy.still).toBe(true);
  });

  it('comes straight back without the wobble for reduced motion', () => {
    const toy = new Squishy(new THREE.Object3D());
    toy.reducedMotion = true;
    toy.squeeze();
    let tallest = 0;
    run(toy, 2, () => (tallest = Math.max(tallest, toy.object.scale.y)));
    expect(tallest).toBeLessThanOrEqual(1);
    expect(toy.still).toBe(true);
  });

  it('leaves the object alone when nobody squeezes it', () => {
    const object = new THREE.Object3D();
    object.scale.set(2, 2, 2);
    run(new Squishy(object), 1);
    expect(object.scale.toArray()).toEqual([2, 2, 2]);
  });
});
