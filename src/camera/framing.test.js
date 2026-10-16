import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fitVerticalFov, projectBounds, toPixels } from './framing.js';

const visibleWidth = (vfov, aspect, distance) => {
  const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(vfov / 2)) * aspect);
  return 2 * distance * Math.tan(half);
};
const visibleHeight = (vfov, distance) => 2 * distance * Math.tan(THREE.MathUtils.degToRad(vfov / 2));

describe('fitVerticalFov', () => {
  const box = { distance: 2.3, width: 0.95, height: 0.85 };

  it('uses the preferred FOV when the box already fits', () => {
    expect(fitVerticalFov({ ...box, aspect: 16 / 9, preferred: 42 })).toBe(42);
  });

  it('always keeps the box in frame, zooming out on tall screens', () => {
    for (const aspect of [21 / 9, 16 / 9, 4 / 3, 1, 9 / 16, 9 / 19.5, 0.4]) {
      const fov = fitVerticalFov({ ...box, aspect, preferred: 42 });
      expect(fov).toBeGreaterThanOrEqual(42);
      expect(visibleWidth(fov, aspect, box.distance)).toBeGreaterThanOrEqual(box.width - 1e-9);
      expect(visibleHeight(fov, box.distance)).toBeGreaterThanOrEqual(box.height - 1e-9);
    }
    expect(fitVerticalFov({ ...box, aspect: 0.4, preferred: 42 })).toBeGreaterThan(42);
  });

  it('never goes past the maximum', () => {
    expect(fitVerticalFov({ ...box, aspect: 0.1, max: 75 })).toBe(75);
  });
});

describe('projectBounds', () => {
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
  camera.position.set(0, 0, 2);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  it('projects a plane at a known distance to known NDC', () => {
    // 2 m wide at 2 m with a 90° FOV: the view is 4 m across, so ±0.5.
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    const rect = projectBounds(plane, camera);
    expect(rect.left).toBeCloseTo(-0.5);
    expect(rect.right).toBeCloseTo(0.5);
    expect(rect.top).toBeCloseTo(0.5);
    expect(rect.bottom).toBeCloseTo(-0.5);
    const px = toPixels(rect, 800, 600);
    expect(px.left).toBeCloseTo(200);
    expect(px.right).toBeCloseTo(600);
    expect(px.top).toBeCloseTo(150);
    expect(px.bottom).toBeCloseTo(450);
  });

  it('returns null for something behind the camera', () => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    plane.position.z = 5;
    expect(projectBounds(plane, camera)).toBeNull();
  });
});
