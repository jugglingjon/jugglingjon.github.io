import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LavaLamp, lavaColours } from './LavaLamp.js';

// How far apart two hues are, round the colour wheel (0 … 0.5).
const hueGap = (a, b) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};
const hueOf = (colour) => colour.getHSL({}, THREE.SRGBColorSpace).h;
const close = (a, b) => ['r', 'g', 'b'].every((k) => Math.abs(a[k] - b[k]) < 1e-3);

describe('lavaColours', () => {
  it('picks a new hue well away from the last one, every time', () => {
    let hue = 0.04;
    for (let i = 0; i < 200; i++) {
      const next = lavaColours(Math.random, hue);
      expect(hueGap(next.hue, hue)).toBeGreaterThanOrEqual(0.15 - 1e-9);
      expect(hueGap(hueOf(next.wax), next.hue)).toBeLessThan(0.01);
      hue = next.hue;
    }
  });

  it('sets the wax in a contrasting, darker liquid', () => {
    for (let i = 0; i < 100; i++) {
      const { wax, liquid } = lavaColours();
      const gap = hueGap(hueOf(wax), hueOf(liquid));
      expect(gap).toBeGreaterThan(0.11);
      expect(gap).toBeLessThan(0.38);
      expect(liquid.getHSL({}, THREE.SRGBColorSpace).l).toBeLessThan(wax.getHSL({}, THREE.SRGBColorSpace).l);
    }
  });

  it('casts light at full strength, mostly in the wax’s colour', () => {
    const { wax, light } = lavaColours(() => 0.3);
    expect(Math.max(light.r, light.g, light.b)).toBeCloseTo(1, 6);
    expect(hueGap(hueOf(light), hueOf(wax))).toBeLessThan(0.1);
  });
});

describe('LavaLamp', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 1, 2);
  const run = (lamp, seconds, visible = true) => {
    for (let t = 0; t < seconds; t += 1 / 30) lamp.update(1 / 30, camera, visible);
  };

  it('glows and flows', () => {
    const lamp = new LavaLamp();
    const flow = lamp.flow;
    run(lamp, 2);
    expect(lamp.flow).toBeGreaterThan(flow + 1.9);
    expect(lamp.light.intensity).toBeGreaterThan(0);
  });

  it('starts in its own colours, its light matching them', () => {
    const lamp = new LavaLamp();
    const wax = lamp.material.uniforms.uWax.value.clone();
    run(lamp, 1);
    expect(close(lamp.material.uniforms.uWax.value, wax)).toBe(true);
    expect(hueGap(hueOf(lamp.light.color), hueOf(wax))).toBeLessThan(0.1);
  });

  it('fades the wax, the liquid and its light to a new colour when clicked', () => {
    const lamp = new LavaLamp();
    const u = lamp.material.uniforms;
    const before = { wax: u.uWax.value.clone(), liquid: u.uLiquid.value.clone(), light: lamp.light.color.clone() };
    const target = lamp.recolor();
    expect(hueGap(hueOf(target.wax), hueOf(before.wax))).toBeGreaterThan(0.14);

    run(lamp, 0.1); // on its way
    for (const [now, from, to] of [
      [u.uWax.value, before.wax, target.wax],
      [u.uLiquid.value, before.liquid, target.liquid],
      [lamp.light.color, before.light, target.light],
    ]) {
      expect(close(now, from)).toBe(false);
      expect(close(now, to)).toBe(false);
    }

    run(lamp, 3); // there
    expect(close(u.uWax.value, target.wax)).toBe(true);
    expect(close(u.uLiquid.value, target.liquid)).toBe(true);
    expect(close(lamp.light.color, target.light)).toBe(true);
    expect(lamp.light.intensity).toBeGreaterThan(0);
  });

  it('heads straight for the newest colour when clicked again mid-fade', () => {
    const lamp = new LavaLamp();
    lamp.recolor();
    run(lamp, 0.1);
    const second = lamp.recolor();
    run(lamp, 3);
    expect(close(lamp.material.uniforms.uWax.value, second.wax)).toBe(true);
  });

  it('casts no light while hidden', () => {
    const lamp = new LavaLamp();
    run(lamp, 1, false);
    expect(lamp.light.intensity).toBe(0);
  });

  it('knows where the camera is, in the bulb’s own space', () => {
    const lamp = new LavaLamp();
    lamp.group.position.set(1, 0, 0);
    lamp.group.updateMatrixWorld(true);
    lamp.update(1 / 30, camera);
    expect(lamp.material.uniforms.uCamera.value.toArray()).toEqual([-1, 1, 2]);
  });
});
