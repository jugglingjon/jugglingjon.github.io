import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SeatedCamera, ZOOM } from './SeatedCamera.js';

describe('SeatedCamera zoom', () => {
  const make = () => {
    const seated = new SeatedCamera({ eye: new THREE.Vector3(0, 1.1, 2.5), target: new THREE.Vector3(0, 0.8, 0) });
    seated.setAspect(16 / 10);
    return seated;
  };

  it('narrows the room camera but never the arm camera', () => {
    const seated = make();
    const base = seated.camera.fov;
    seated.zoomBy(0.5);
    for (let i = 0; i < 120; i++) seated.update(0, 1 / 60);
    expect(seated.camera.fov).toBeCloseTo(base * 0.5, 3);
    expect(seated.viewmodel.fov).toBeCloseTo(base, 6);
  });

  it('keeps the zoom within its range', () => {
    const seated = make();
    seated.zoomBy(0.01);
    expect(seated.zoomTarget).toBe(ZOOM.min);
    seated.zoomBy(1000);
    expect(seated.zoomTarget).toBe(ZOOM.max);
  });

  it('keeps the arm camera in step with the room camera', () => {
    const seated = make();
    seated.update(1.3, 1 / 60);
    expect(seated.viewmodel.position.distanceTo(seated.camera.position)).toBeLessThan(1e-9);
    expect(seated.viewmodel.quaternion.angleTo(seated.camera.quaternion)).toBeLessThan(1e-9);
  });
});
