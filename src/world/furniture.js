import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  createCorduroyTexture,
  createFringeTexture,
  createTapeLabelTexture,
  createVcrDisplayTexture,
  createWoodTexture,
} from './textures.js';

// Procedural stand-ins for the furniture, built at the origin; Room places them.
// Each returns a group, plus any parts that animate or light up.

export function place(parent, geometry, material, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

const box = (w, h, d, r = 0.008) => new RoundedBoxGeometry(w, h, d, 2, r);

// Open-fronted wood TV stand with a VCR blinking 12:00 and a few tapes.
export function createTVStand(height) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture({ base: '#4a2c17', seed: 19 }), roughness: 0.5 });
  const shadow = new THREE.MeshStandardMaterial({ color: '#0b0705', roughness: 0.9 });

  place(group, box(0.95, 0.035, 0.5), wood, 0, height - 0.0175, 0);
  place(group, box(0.95, 0.03, 0.5), wood, 0, 0.055, 0);
  place(group, box(0.03, height, 0.5), wood, -0.46, height / 2, 0);
  place(group, box(0.03, height, 0.5), wood, 0.46, height / 2, 0);
  place(group, new THREE.BoxGeometry(0.92, 0.02, 0.48), wood, 0, 0.27, 0);
  place(group, new THREE.BoxGeometry(0.92, 0.46, 0.01), shadow, 0, 0.27, -0.245);
  place(group, new THREE.BoxGeometry(0.9, 0.04, 0.46), shadow, 0, 0.02, 0);

  const vcrBody = new THREE.MeshStandardMaterial({ color: '#2a2a2d', metalness: 0.5, roughness: 0.45 });
  const vcr = place(group, box(0.43, 0.085, 0.32, 0.006), vcrBody, -0.17, 0.28 + 0.0425, 0.03);
  place(vcr, new THREE.BoxGeometry(0.2, 0.032, 0.002), shadow, -0.06, 0.008, 0.161);
  const vcrDisplay = place(
    vcr,
    new THREE.PlaneGeometry(0.07, 0.018),
    new THREE.MeshBasicMaterial({ map: createVcrDisplayTexture(), toneMapped: false }),
    0.12, 0.012, 0.1612,
  );
  for (let i = 0; i < 5; i++) place(vcr, new THREE.BoxGeometry(0.018, 0.007, 0.004), shadow, 0.08 + i * 0.024, -0.018, 0.161);

  const tapeBody = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.6 });
  ['SHOWREEL 86', 'PORTFOLIO', 'DEMOS - DO NOT TAPE'].forEach((title, i) => {
    const label = createTapeLabelTexture(title, i + 3);
    label.center.set(0.5, 0.5);
    label.rotation = Math.PI / 2;
    const spine = new THREE.MeshStandardMaterial({ map: label, roughness: 0.7 });
    const tape = place(group, new THREE.BoxGeometry(0.027, 0.19, 0.105), [tapeBody, tapeBody, tapeBody, tapeBody, spine, tapeBody], 0.18 + i * 0.03, 0.165, 0.12);
    tape.rotation.y = (i - 1) * 0.03;
  });

  return { group, vcrDisplay };
}

// The top is varnished: a clear coat over the wood, so it can pick up the TV's
// glow and the lamps. Returns `surface` so its reflectivity can be tuned.
export function createCoffeeTable({ width, depth, height }) {
  const group = new THREE.Group();
  const grain = createWoodTexture({ base: '#5a3519', seed: 41 });
  const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.45 });
  const surface = new THREE.MeshPhysicalMaterial({ map: grain, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  place(group, box(width, 0.04, depth, 0.012), surface, 0, height - 0.02, 0);
  place(group, box(width - 0.12, 0.02, depth - 0.12), wood, 0, 0.12, 0);
  const leg = new THREE.CylinderGeometry(0.022, 0.014, height - 0.04, 10);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) place(group, leg, wood, sx * (width / 2 - 0.07), (height - 0.04) / 2, sz * (depth / 2 - 0.07));
  }
  return { group, top: height, surface };
}

// Boxy three-seater in rust corduroy. Faces −z (towards the TV).
export function createCouch({ width, depth }) {
  const group = new THREE.Group();
  const fabric = new THREE.MeshStandardMaterial({ map: createCorduroyTexture(), roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a170c', roughness: 0.9 });
  const arm = 0.18;
  const inner = width - arm * 2;

  place(group, box(width, 0.28, depth, 0.03), dark, 0, 0.18, 0);
  place(group, box(arm, 0.62, depth, 0.05), fabric, -(width - arm) / 2, 0.31, 0);
  place(group, box(arm, 0.62, depth, 0.05), fabric, (width - arm) / 2, 0.31, 0);
  place(group, box(inner, 0.46, 0.22, 0.06), fabric, 0, 0.62, depth / 2 - 0.13);
  for (let i = 0; i < 3; i++) {
    const x = -inner / 3 + (i * inner) / 3;
    place(group, box(inner / 3 - 0.01, 0.15, depth - 0.22, 0.05), fabric, x, 0.39, -0.1);
    const back = place(group, box(inner / 3 - 0.02, 0.42, 0.16, 0.06), fabric, x, 0.72, depth / 2 - 0.3);
    back.rotation.x = 0.12; // lean back, away from the TV
  }
  return { group };
}

export function createEndTable(height) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture({ base: '#4d2d16', seed: 53 }), roughness: 0.45 });
  place(group, box(0.5, 0.035, 0.45), wood, 0, height - 0.0175, 0);
  place(group, box(0.46, 0.02, 0.41), wood, 0, 0.15, 0);
  const leg = new THREE.BoxGeometry(0.035, height - 0.035, 0.035);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) place(group, leg, wood, sx * 0.21, (height - 0.035) / 2, sz * 0.18);
  }
  return { group };
}

// Fringed shade on a ceramic body. The shade glows when the lamp is on.
function lampShade(radiusTop, radiusBottom, height) {
  const group = new THREE.Group();
  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: '#e9d6b0',
    emissive: '#ffb066',
    emissiveIntensity: 1.6,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  place(group, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 28, 1, true), shadeMaterial, 0, 0, 0, { cast: false });
  const fringe = new THREE.MeshStandardMaterial({
    map: createFringeTexture(),
    alphaTest: 0.5,
    emissive: '#ffb066',
    emissiveIntensity: 0.6,
    side: THREE.DoubleSide,
  });
  place(group, new THREE.CylinderGeometry(radiusBottom + 0.003, radiusBottom + 0.006, 0.05, 28, 1, true), fringe, 0, -height / 2 - 0.022, 0, { cast: false });
  return { group, shadeMaterial, fringeMaterial: fringe };
}

export function createTableLamp() {
  const group = new THREE.Group();
  const ceramic = new THREE.MeshStandardMaterial({ color: '#2f5a4a', roughness: 0.25 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b08a3e', metalness: 0.9, roughness: 0.35 });
  const points = [[0, 0], [0.07, 0], [0.085, 0.04], [0.1, 0.12], [0.08, 0.22], [0.03, 0.27], [0.02, 0.3]].map(([x, y]) => new THREE.Vector2(x, y));
  place(group, new THREE.LatheGeometry(points, 24), ceramic);
  place(group, new THREE.CylinderGeometry(0.006, 0.006, 0.18, 8), brass, 0, 0.39, 0);
  const shade = lampShade(0.11, 0.17, 0.2);
  shade.group.position.y = 0.43;
  group.add(shade.group);
  return { group, shade: shade.group, shadeMaterial: shade.shadeMaterial, fringeMaterial: shade.fringeMaterial, shadeHeight: 0.43 };
}

export function createFloorLamp() {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: '#8a6a30', metalness: 0.9, roughness: 0.4 });
  place(group, new THREE.CylinderGeometry(0.16, 0.18, 0.03, 24), brass, 0, 0.015, 0);
  place(group, new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), brass, 0, 0.72, 0);
  const shade = lampShade(0.16, 0.24, 0.28);
  shade.group.position.y = 1.5;
  group.add(shade.group);
  return { group, shade: shade.group, shadeMaterial: shade.shadeMaterial, fringeMaterial: shade.fringeMaterial };
}
