import * as THREE from 'three';
import { place } from './furniture.js';
import { createCanTexture, createMagazineTexture, createPrintTexture, seededRandom } from './textures.js';

// Small set dressing. Each builder returns a group at the origin (sitting on
// y = 0), plus any anchor points other systems need.

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
