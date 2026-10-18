import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LavaLamp } from './LavaLamp.js';

describe('LavaLamp', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 1, 2);
  const run = (lamp, seconds, visible = true) => {
    for (let t = 0; t < seconds; t += 1 / 30) lamp.update(1 / 30, camera, visible);
  };

  it('glows and flows while on', () => {
    const lamp = new LavaLamp();
    const flow = lamp.flow;
    run(lamp, 2);
    expect(lamp.level).toBe(1);
    expect(lamp.flow).toBeGreaterThan(flow + 1.9);
    expect(lamp.light.intensity).toBeGreaterThan(0);
  });

  it('cools down, slows and goes dark when switched off, then warms up again', () => {
    const lamp = new LavaLamp();
    expect(lamp.toggle()).toBe(false);
    run(lamp, 0.5);
    expect(lamp.level).toBeGreaterThan(0); // still cooling
    run(lamp, 2);
    expect(lamp.level).toBe(0);
    const flow = lamp.flow;
    run(lamp, 2);
    expect(lamp.flow).toBe(flow); // the wax has stopped
    expect(lamp.light.intensity).toBe(0);
    expect(lamp.toggle()).toBe(true);
    run(lamp, 3);
    expect(lamp.level).toBe(1);
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
