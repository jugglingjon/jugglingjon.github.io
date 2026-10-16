import * as THREE from 'three';

const DEG = 180 / Math.PI;

// Vertical field of view (degrees) that keeps a `width` × `height` box at
// `distance` fully in frame at this aspect ratio, and never tighter than
// `preferred`. Wide screens get the preferred framing with more room either
// side; tall phone screens zoom out until the TV fits across.
export function fitVerticalFov({ aspect, distance, width, height, preferred = 42, max = 75 }) {
  const forHeight = 2 * Math.atan(height / 2 / distance) * DEG;
  const forWidth = 2 * Math.atan(width / 2 / distance / aspect) * DEG;
  return Math.min(max, Math.max(preferred, forHeight, forWidth));
}

const corner = new THREE.Vector3();
const view = new THREE.Vector3();

// Screen-space bounds of an object's local bounding box in normalised device
// coordinates (−1…1, y up). Corners behind the camera are skipped; returns
// null if none are in front. The camera's matrices must be current.
export function projectBounds(object, camera) {
  const { geometry } = object;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  object.updateWorldMatrix(true, false);
  const rect = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
  let seen = 0;
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        corner.set(x, y, z).applyMatrix4(object.matrixWorld);
        view.copy(corner).applyMatrix4(camera.matrixWorldInverse);
        if (view.z >= 0) continue;
        corner.project(camera);
        rect.left = Math.min(rect.left, corner.x);
        rect.right = Math.max(rect.right, corner.x);
        rect.bottom = Math.min(rect.bottom, corner.y);
        rect.top = Math.max(rect.top, corner.y);
        seen++;
      }
    }
  }
  return seen ? rect : null;
}

// NDC rect → CSS pixels (y down).
export function toPixels(rect, width, height) {
  return {
    left: ((rect.left + 1) / 2) * width,
    right: ((rect.right + 1) / 2) * width,
    top: ((1 - rect.top) / 2) * height,
    bottom: ((1 - rect.bottom) / 2) * height,
  };
}
