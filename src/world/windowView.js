import * as THREE from 'three';
import { place } from './furniture.js';
import { createRainMaterial } from './atmosphere.js';
import { createNeonSignTexture, createNightTexture, createRainTexture } from './textures.js';

// The window in the right wall, built in wall-local space: +x runs along the
// wall (world +z), +y is up and +z points into the room. The blinds are real
// slats, so the neon sign across the street casts real striped shadows into
// the room.
export function createWindow({ width, height }) {
  const group = new THREE.Group();
  const trim = new THREE.MeshStandardMaterial({ color: '#cfc6b2', roughness: 0.6 });
  const plastic = new THREE.MeshStandardMaterial({ color: '#d8d0bf', roughness: 0.55 });

  // Frame and sill on the room side of the opening.
  const t = 0.06;
  place(group, new THREE.BoxGeometry(width + t * 2, t, 0.05), trim, 0, height / 2 + t / 2, 0.02);
  place(group, new THREE.BoxGeometry(width + t * 2 + 0.08, 0.035, 0.16), trim, 0, -height / 2 - 0.0175, 0.06);
  place(group, new THREE.BoxGeometry(t, height, 0.05), trim, -width / 2 - t / 2, 0, 0.02);
  place(group, new THREE.BoxGeometry(t, height, 0.05), trim, width / 2 + t / 2, 0, 0.02);
  place(group, new THREE.BoxGeometry(0.03, height, 0.03), trim, 0, 0, -0.05); // sash bar

  // Glass with rain running down it, set back in the wall.
  const rain = createRainMaterial(createRainTexture());
  place(group, new THREE.PlaneGeometry(width, height), rain, 0, 0, -0.06, { cast: false, receive: false });

  // Venetian blinds: headrail, tilted slats, ladder cords.
  const slatCount = Math.floor((height - 0.06) / 0.042);
  place(group, new THREE.BoxGeometry(width - 0.02, 0.035, 0.05), plastic, 0, height / 2 - 0.02, 0.06);
  const slat = new THREE.BoxGeometry(width - 0.04, 0.05, 0.003);
  const slats = [];
  for (let i = 0; i < slatCount; i++) {
    const mesh = place(group, slat, plastic, 0, height / 2 - 0.06 - i * 0.042, 0.06);
    slats.push(mesh);
  }
  for (const x of [-width / 3, width / 3]) {
    place(group, new THREE.CylinderGeometry(0.0015, 0.0015, height - 0.04, 4), plastic, x, 0, 0.085, { cast: false });
  }

  // Across the street: buildings, and the sign that lights the room.
  const night = new THREE.MeshBasicMaterial({ map: createNightTexture(), color: '#8a8aa0' });
  place(group, new THREE.PlaneGeometry(9, 5), night, 0, 0.6, -3.3, { cast: false, receive: false });
  const signMaterial = new THREE.MeshBasicMaterial({ map: createNeonSignTexture(), transparent: true, toneMapped: false });
  const sign = place(group, new THREE.PlaneGeometry(1.8, 0.9), signMaterial, 0.2, 0.95, -3.0, { cast: false, receive: false });
  sign.renderOrder = 1;

  const blinds = {
    group,
    slats,
    rain,
    signMaterial,
    // Tilt in radians: 0 is shut (slats flat against the glass), ±π/2 wide open.
    // Negative tips the slats down into the room, the way the street light falls.
    setTilt(angle) {
      slats.forEach((s) => (s.rotation.x = angle));
    },
  };
  blinds.setTilt(-0.9);
  return blinds;
}

// Deterministic neon buzz: mostly steady, with the odd stutter and dropout.
export function neonFlicker(time) {
  const slot = Math.floor(time * 14);
  const r = Math.abs(Math.sin(slot * 12.9898) * 43758.5453) % 1;
  if (r > 0.985) return 0.08;
  if (r > 0.965) return 0.55;
  return 0.97 + 0.03 * Math.sin(time * 90);
}
