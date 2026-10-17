import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SeatedCamera, ZOOM } from './SeatedCamera.js';

describe('SeatedCamera zoom', () => {
  const make = () => {
    const seated = new SeatedCamera({ eye: new THREE.Vector3(0, 1.1, 2.5), target: new THREE.Vector3(0, 0.8, 0) });
    seated.setAspect(16 / 10);
    return seated;
  };
  const run = (seated, seconds) => {
    for (let t = 0; t < seconds; t += 1 / 60) seated.update(0, 1 / 60);
  };

  it('eases in to the zoomed view and back out to the framed one', () => {
    const seated = make();
    const framed = seated.camera.fov;
    seated.setZoomed(true);
    run(seated, ZOOM.duration / 2);
    expect(seated.camera.fov).toBeLessThan(framed);
    expect(seated.camera.fov).toBeGreaterThan(ZOOM.fov);
    run(seated, ZOOM.duration);
    expect(seated.camera.fov).toBeCloseTo(ZOOM.fov, 6);
    seated.setZoomed(false);
    run(seated, ZOOM.duration + 0.1);
    expect(seated.camera.fov).toBeCloseTo(framed, 6);
  });

  it('turns round mid-zoom without jumping', () => {
    const seated = make();
    seated.setZoomed(true);
    run(seated, ZOOM.duration / 2);
    const midway = seated.camera.fov;
    seated.setZoomed(false);
    seated.update(0, 1 / 60);
    expect(Math.abs(seated.camera.fov - midway)).toBeLessThan(0.5);
  });

  it('ignores repeat requests while already heading that way', () => {
    const seated = make();
    seated.setZoomed(true);
    run(seated, ZOOM.duration / 2);
    const progress = seated.zoomProgress;
    seated.setZoomed(true);
    expect(seated.zoomProgress).toBe(progress);
  });
});

describe('SeatedCamera look around', () => {
  const make = () => {
    const seated = new SeatedCamera({ eye: new THREE.Vector3(0, 1.1, 2.5), target: new THREE.Vector3(0, 0.8, 0) });
    seated.setAspect(16 / 10);
    return seated;
  };
  const facing = (seated) => new THREE.Vector3(0, 0, -1).applyQuaternion(seated.camera.quaternion);

  it('turns a little towards the pointer, and back to the set', () => {
    const seated = make();
    seated.settings.breathing = 0;
    seated.update(0, 1 / 60);
    const ahead = facing(seated);
    seated.setLook(1, 1);
    for (let i = 0; i < 240; i++) seated.update(0, 1 / 60);
    const turned = facing(seated);
    expect(turned.x).toBeGreaterThan(ahead.x); // the set is along −z, so right is +x
    expect(turned.y).toBeGreaterThan(ahead.y);
    expect(turned.angleTo(ahead)).toBeLessThan(0.3); // only a little
    seated.setLook(0, 0);
    for (let i = 0; i < 240; i++) seated.update(0, 1 / 60);
    expect(facing(seated).angleTo(ahead)).toBeLessThan(1e-3);
  });
});
