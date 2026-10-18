import * as THREE from 'three';
import { place } from './furniture.js';
import { ListingsMagazine } from './Magazine.js';
import { createCanTexture, createMagazineTexture, createPrintTexture, seededRandom } from './textures.js';

// Small set dressing. Each builder returns a group at the origin (sitting on
// y = 0), plus any anchor points other systems need. Some have a model that
// replaces their procedural stand-in once it loads.

// Scale a model to `height` and stand it on y = 0 at the origin: centred on
// its bounding box, or, `rooted`, on its own origin (a plant's base). It casts
// and catches shadows like the rest of the room.
export function fitModel(model, height, { rooted = false } = {}) {
  const box = new THREE.Box3().setFromObject(model);
  const scale = height / (box.max.y - box.min.y);
  model.scale.multiplyScalar(scale);
  if (!rooted) {
    const centre = box.getCenter(new THREE.Vector3());
    model.position.set(-centre.x, -box.min.y, -centre.z).multiplyScalar(scale);
  }
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return model;
}

// A 12 oz can, 12.2 cm tall.
export const CAN = { radius: 0.033, height: 0.122 };

export function createBeerCan() {
  const group = new THREE.Group();
  const label = new THREE.MeshStandardMaterial({ map: createCanTexture(), metalness: 0.7, roughness: 0.35 });
  const lid = new THREE.MeshStandardMaterial({ color: '#c9c9c9', metalness: 0.9, roughness: 0.3 });
  place(group, new THREE.CylinderGeometry(CAN.radius, CAN.radius, CAN.height, 28), [label, lid, lid], 0, CAN.height / 2, 0);
  return { group };
}

// Swap the can for a model (the soda can GLB), the same size, turned `turn`
// radians about its axis to show its label.
export function replaceCan(can, model, turn = 0) {
  const holder = new THREE.Group();
  holder.rotation.y = turn;
  holder.add(fitModel(model, CAN.height));
  can.group.clear();
  can.group.add(holder);
}

// A couple of listings magazines. The top one opens (see ListingsMagazine);
// the one under it is just last week's.
export function createMagazines() {
  const group = new THREE.Group();
  const pages = new THREE.MeshStandardMaterial({ color: '#e8e0cc', roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: createMagazineTexture(), roughness: 0.6 });
  const back = new THREE.MeshStandardMaterial({ color: '#d4cbb5', roughness: 0.6 });
  const under = place(group, new THREE.BoxGeometry(0.135, 0.004, 0.19), [pages, pages, front, back, pages, pages], 0.02, 0.002, 0.015);
  under.rotation.y = -0.35;
  const listings = new ListingsMagazine();
  listings.group.position.y = 0.004;
  group.add(listings.group);
  return { group, listings };
}

// Snake plant in a terracotta pot. Its leaves are a group of their own
// standing on the soil, so a model can replace them (replaceLeaves).
const SOIL = 0.31;
export const PLANT_HEIGHT = 0.72; // a leaf model's height above the soil, in metres

export function createPlant() {
  const group = new THREE.Group();
  const pot = new THREE.MeshStandardMaterial({ color: '#9a4f2a', roughness: 0.85 });
  const soil = new THREE.MeshStandardMaterial({ color: '#1f140c', roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#2f5a2c', roughness: 0.6 });
  place(group, new THREE.CylinderGeometry(0.17, 0.13, 0.32, 24), pot, 0, 0.16, 0);
  place(group, new THREE.CylinderGeometry(0.155, 0.155, 0.01, 24), soil, 0, SOIL, 0);
  const leaves = new THREE.Group();
  leaves.position.y = SOIL;
  group.add(leaves);
  const rand = seededRandom(61);
  const blade = new THREE.SphereGeometry(1, 12, 10);
  for (let i = 0; i < 9; i++) {
    const height = 0.35 + rand() * 0.35;
    const mesh = place(leaves, blade, leaf, (rand() - 0.5) * 0.12, height, (rand() - 0.5) * 0.12);
    mesh.scale.set(0.045, height, 0.012);
    mesh.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI, (rand() - 0.5) * 0.4);
  }
  return { group, leaves };
}

// Swap the plant's leaves for a model, rooted at its origin (as the
// Sansevieria GLB is): scaled to `height` above the soil, and matte.
export function replaceLeaves(plant, model, height = PLANT_HEIGHT) {
  fitModel(model, height, { rooted: true });
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.material.metalness = 0;
    o.material.roughness = 0.7;
  });
  plant.leaves.clear();
  plant.leaves.add(model);
}

export function createPrint({ width, height }) {
  const group = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#b08a3e', metalness: 0.8, roughness: 0.35 });
  const art = new THREE.MeshStandardMaterial({ map: createPrintTexture(), roughness: 0.4 });
  place(group, new THREE.BoxGeometry(width + 0.04, height + 0.04, 0.02), frame, 0, 0, 0);
  place(group, new THREE.PlaneGeometry(width, height), art, 0, 0, 0.0105, { cast: false });
  return { group };
}
