import * as THREE from 'three';

// Visible glass of a ~20" set. 4:3, slightly larger than the bezel opening so
// the tube's edges hide behind the cabinet.
export const SCREEN_WIDTH = 0.5;
export const SCREEN_HEIGHT = 0.375;

// A spherical cap: CRT faces of the era bulge towards the viewer. The centre
// sits at z = 0 and the edges fall away, which gives the glass real normals
// for fresnel and reflections.
export function createScreenGeometry({ width = SCREEN_WIDTH, height = SCREEN_HEIGHT, radius = 1.1, segments = 48 } = {}) {
  const geometry = new THREE.PlaneGeometry(width, height, segments, Math.round((segments * height) / width));
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, Math.sqrt(radius * radius - x * x - y * y) - radius);
  }
  geometry.computeVertexNormals();
  return geometry;
}
