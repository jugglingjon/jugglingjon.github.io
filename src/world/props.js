import * as THREE from 'three';
import { place } from './furniture.js';
import { createCanTexture, createMagazineTexture, createPrintTexture, seededRandom } from './textures.js';

// Small set dressing. Each builder returns a group at the origin (sitting on
// y = 0), plus any anchor points other systems need.

// Glass ashtray with a cigarette left burning on the rim.
export function createAshtray() {
  const group = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: '#7d9c8c', roughness: 0.08, transparent: true, opacity: 0.55 });
  const profile = [[0, 0], [0.065, 0], [0.07, 0.006], [0.072, 0.026], [0.062, 0.028], [0.05, 0.012], [0, 0.012]].map(([x, y]) => new THREE.Vector2(x, y));
  place(group, new THREE.LatheGeometry(profile, 32), glass, 0, 0, 0, { cast: false });

  const paper = new THREE.MeshStandardMaterial({ color: '#ece6d8', roughness: 0.8 });
  const filter = new THREE.MeshStandardMaterial({ color: '#c8843a', roughness: 0.8 });
  const butt = new THREE.CylinderGeometry(0.004, 0.004, 0.025, 8);
  [[0.015, 0.02, 1.2], [-0.02, -0.01, 2.4]].forEach(([x, z, rot]) => {
    const b = place(group, butt, filter, x, 0.016, z);
    b.rotation.set(Math.PI / 2, 0, rot);
  });

  // The lit one rests across the rim, ember outwards.
  const cigarette = new THREE.Group();
  cigarette.position.set(0.06, 0.03, 0.01);
  cigarette.rotation.set(0, 0.3, -0.08);
  group.add(cigarette);
  const stick = place(cigarette, new THREE.CylinderGeometry(0.004, 0.004, 0.07, 8), paper, 0.02, 0, 0);
  stick.rotation.z = Math.PI / 2;
  const tip = place(cigarette, new THREE.CylinderGeometry(0.004, 0.004, 0.022, 8), filter, -0.026, 0, 0);
  tip.rotation.z = Math.PI / 2;
  const glow = new THREE.MeshStandardMaterial({ color: '#3a1205', emissive: '#ff4a10', emissiveIntensity: 2.5 });
  const ember = place(cigarette, new THREE.SphereGeometry(0.0045, 8, 6), glow, 0.056, 0, 0, { cast: false });

  // The smoke rises from the ember; read its world position once placed.
  return { group, ember };
}

export function createBeerCan() {
  const group = new THREE.Group();
  const label = new THREE.MeshStandardMaterial({ map: createCanTexture(), metalness: 0.7, roughness: 0.35 });
  const lid = new THREE.MeshStandardMaterial({ color: '#c9c9c9', metalness: 0.9, roughness: 0.3 });
  place(group, new THREE.CylinderGeometry(0.033, 0.033, 0.122, 28), [label, lid, lid], 0, 0.061, 0);
  return { group };
}

// A couple of listings magazines. In Phase 6 this becomes the hotspot that
// opens the current project's case study.
export function createMagazines() {
  const group = new THREE.Group();
  const cover = createMagazineTexture();
  const pages = new THREE.MeshStandardMaterial({ color: '#e8e0cc', roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6 });
  const back = new THREE.MeshStandardMaterial({ color: '#d4cbb5', roughness: 0.6 });
  const mats = [pages, pages, front, back, pages, pages];
  const top = place(group, new THREE.BoxGeometry(0.135, 0.004, 0.19), mats, 0, 0.006, 0);
  const under = place(group, new THREE.BoxGeometry(0.135, 0.004, 0.19), mats, 0.02, 0.002, 0.015);
  under.rotation.y = -0.35;
  return { group, cover: top };
}

// Snake plant in a terracotta pot.
export function createPlant() {
  const group = new THREE.Group();
  const pot = new THREE.MeshStandardMaterial({ color: '#9a4f2a', roughness: 0.85 });
  const soil = new THREE.MeshStandardMaterial({ color: '#1f140c', roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#2f5a2c', roughness: 0.6 });
  place(group, new THREE.CylinderGeometry(0.17, 0.13, 0.32, 24), pot, 0, 0.16, 0);
  place(group, new THREE.CylinderGeometry(0.155, 0.155, 0.01, 24), soil, 0, 0.31, 0);
  const rand = seededRandom(61);
  const blade = new THREE.SphereGeometry(1, 12, 10);
  for (let i = 0; i < 9; i++) {
    const height = 0.35 + rand() * 0.35;
    const mesh = place(group, blade, leaf, (rand() - 0.5) * 0.12, 0.31 + height, (rand() - 0.5) * 0.12);
    mesh.scale.set(0.045, height, 0.012);
    mesh.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI, (rand() - 0.5) * 0.4);
  }
  return { group };
}

export function createPrint({ width, height }) {
  const group = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#b08a3e', metalness: 0.8, roughness: 0.35 });
  const art = new THREE.MeshStandardMaterial({ map: createPrintTexture(), roughness: 0.4 });
  place(group, new THREE.BoxGeometry(width + 0.04, height + 0.04, 0.02), frame, 0, 0, 0);
  place(group, new THREE.PlaneGeometry(width, height), art, 0, 0, 0.0105, { cast: false });
  return { group };
}
