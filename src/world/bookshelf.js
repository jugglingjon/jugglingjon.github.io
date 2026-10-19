import * as THREE from 'three';
import { place } from './furniture.js';
import { LavaLamp } from './LavaLamp.js';
import { fitModel } from './props.js';
import { createWoodTexture, seededRandom } from './textures.js';

// A small three-shelf bookcase for the corner right of the TV: a lava lamp
// glowing on top, a stuffed panda, a few books, and a clock radio (its model
// goes in `radio` once it's loaded). Built at the origin, sitting on y = 0
// with its back to −z.

export const BOOKSHELF = { width: 0.62, height: 0.96, depth: 0.28, board: 0.022 };
const SHELVES = [0.06, 0.36, 0.66]; // top faces of the shelf boards

// The clock radio: 7 cm tall, its clock turned a little towards the couch
// (to your left), from the model's own front (+x, once its node is applied).
export const RADIO = { height: 0.07, turn: -Math.PI / 2 - 0.2 };

const BOOK_COLOURS = ['#b8322a', '#e0a43a', '#2f6f73', '#6b8e3a', '#3b4a7a', '#b45a2a', '#7a2f4f', '#d8c8a0'];
const PAGES = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.9 });
const GILT = new THREE.MeshStandardMaterial({ color: '#d9b45a', metalness: 0.6, roughness: 0.4 });

// One book, standing at its own origin (bottom-centre), spine facing +z.
function book(thickness, height, depth, colour) {
  const cover = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75 });
  const group = new THREE.Group();
  place(group, new THREE.BoxGeometry(thickness, height, depth), [cover, cover, PAGES, cover, cover, cover], 0, height / 2, 0);
  // Gilt bands across the spine.
  for (const y of [height * 0.12, height * 0.86]) place(group, new THREE.BoxGeometry(thickness * 0.8, 0.006, 0.002), GILT, 0, y, depth / 2 + 0.001);
  return group;
}

// A row of books standing on a shelf from x0, the last one leaning on its
// neighbour. Returns where the row ends.
function bookRow(parent, rand, { x0, y, count, lean = false, tall = 0.24 }) {
  let x = x0;
  for (let i = 0; i < count; i++) {
    const thickness = 0.024 + rand() * 0.022;
    const height = tall - 0.06 + rand() * 0.06;
    const b = book(thickness, height, 0.15 + rand() * 0.04, BOOK_COLOURS[Math.floor(rand() * BOOK_COLOURS.length)]);
    const last = lean && i === count - 1;
    b.position.set(x + thickness / 2 + (last ? 0.03 : 0), y, -0.01);
    if (last) b.rotation.z = 0.32; // leaning back on the row
    parent.add(b);
    x += thickness + 0.002;
  }
  return x + (lean ? 0.08 : 0); // a leaning book reaches further
}

// A book lying flat, centred at its own origin on y = 0: spine to +z, page
// edges showing at the ends and the front.
function lyingBook(length, thickness, depth, colour) {
  const cover = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75 });
  const group = new THREE.Group();
  place(group, new THREE.BoxGeometry(length, thickness, depth), [PAGES, PAGES, cover, cover, cover, PAGES], 0, thickness / 2, 0);
  for (const x of [-length * 0.38, length * 0.38]) place(group, new THREE.BoxGeometry(0.006, thickness * 0.8, 0.002), GILT, x, thickness / 2, depth / 2 + 0.001);
  return group;
}

// A stack of books lying flat, centred on x, from y up, each a little askew.
function bookStack(parent, rand, { x, y, count, width = 0.2 }) {
  for (let i = 0; i < count; i++) {
    const thickness = 0.026 + rand() * 0.016;
    const b = lyingBook(width - rand() * 0.04, thickness, 0.15 + rand() * 0.03, BOOK_COLOURS[Math.floor(rand() * BOOK_COLOURS.length)]);
    b.position.set(x, y, -0.01);
    b.rotation.y = (rand() - 0.5) * 0.25;
    parent.add(b);
    y += thickness;
  }
}

// A small sitting panda, about 17 cm tall, facing +z.
function panda() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.95 });
  const black = new THREE.MeshStandardMaterial({ color: '#1e1b1a', roughness: 0.9 });
  const ball = new THREE.SphereGeometry(1, 20, 14);
  const blob = (material, [x, y, z], [sx, sy, sz], rotation = [0, 0, 0]) => {
    const mesh = place(group, ball, material, x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(...rotation);
    return mesh;
  };

  blob(white, [0, 0.058, 0], [0.056, 0.06, 0.05]); // body
  blob(black, [-0.034, 0.024, 0.036], [0.022, 0.02, 0.032], [0.3, 0.3, 0]); // legs, sticking out front
  blob(black, [0.034, 0.024, 0.036], [0.022, 0.02, 0.032], [0.3, -0.3, 0]);
  blob(black, [-0.05, 0.072, 0.018], [0.019, 0.034, 0.02], [0.4, 0, 0.5]); // arms
  blob(black, [0.05, 0.072, 0.018], [0.019, 0.034, 0.02], [0.4, 0, -0.5]);
  blob(black, [0, 0.1, -0.004], [0.05, 0.016, 0.044]); // the black band over the shoulders

  const head = new THREE.Group();
  head.position.set(0, 0.135, 0.004);
  head.rotation.z = 0.14; // a curious tilt
  group.add(head);
  const headBlob = (material, [x, y, z], [sx, sy, sz], rotation = [0, 0, 0]) => {
    const mesh = place(head, ball, material, x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(...rotation);
  };
  headBlob(white, [0, 0, 0], [0.047, 0.043, 0.042]);
  headBlob(black, [-0.031, 0.034, -0.006], [0.015, 0.015, 0.009]); // ears
  headBlob(black, [0.031, 0.034, -0.006], [0.015, 0.015, 0.009]);
  headBlob(black, [-0.017, 0.006, 0.036], [0.012, 0.016, 0.006], [0, 0, -0.45]); // eye patches
  headBlob(black, [0.017, 0.006, 0.036], [0.012, 0.016, 0.006], [0, 0, 0.45]);
  headBlob(white, [-0.016, 0.009, 0.041], [0.0035, 0.0035, 0.002]); // a glint in each eye
  headBlob(white, [0.016, 0.009, 0.041], [0.0035, 0.0035, 0.002]);
  headBlob(white, [0, -0.014, 0.036], [0.017, 0.012, 0.012]); // muzzle
  headBlob(black, [0, -0.008, 0.047], [0.007, 0.005, 0.004]); // nose
  return group;
}

export function createBookshelf() {
  const { width, height, depth, board } = BOOKSHELF;
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture({ base: '#6b4426', seed: 29 }), roughness: 0.6 });
  const backing = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.9 });

  // Sides, top, shelves, a kick board, and a dark back panel.
  for (const side of [-1, 1]) place(group, new THREE.BoxGeometry(board, height, depth), wood, side * (width / 2 - board / 2), height / 2, 0);
  place(group, new THREE.BoxGeometry(width + 0.02, board, depth + 0.02), wood, 0, height - board / 2, 0.005);
  for (const y of SHELVES) place(group, new THREE.BoxGeometry(width - board * 2, board, depth - 0.01), wood, 0, y - board / 2, 0.005);
  place(group, new THREE.BoxGeometry(width - board * 2, SHELVES[0] - board, board), wood, 0, (SHELVES[0] - board) / 2, depth / 2 - board / 2);
  place(group, new THREE.BoxGeometry(width - board * 2, height - board, 0.008), backing, 0, height / 2, -depth / 2 + 0.004);

  const rand = seededRandom(83);
  const inside = width / 2 - board;

  // Bottom shelf: a stack of big atlases. Middle: a row of novels, the last one leaning.
  bookStack(group, rand, { x: 0, y: SHELVES[0], count: 3, width: 0.26 });
  const novelsEnd = bookRow(group, rand, { x0: -inside + 0.01, y: SHELVES[1], count: 7, lean: true });
  // The clock radio, right of the novels, in the middle of the space left.
  const radio = new THREE.Group();
  radio.position.set((novelsEnd + inside) / 2, SHELVES[1], 0.01);
  group.add(radio);
  // Upper shelf: the panda, with a few books beside it.
  const bear = panda();
  bear.position.set(-0.12, SHELVES[2], 0.03);
  bear.rotation.y = 0.25;
  group.add(bear);
  bookRow(group, rand, { x0: 0.07, y: SHELVES[2], count: 4, tall: 0.22 });

  // On top: the lava lamp, and a couple of paperbacks lying by it.
  const lava = new LavaLamp();
  lava.group.position.set(-0.1, height, 0.01);
  group.add(lava.group);
  bookStack(group, rand, { x: 0.14, y: height, count: 2, width: 0.16 });

  return { group, lava, panda: bear, radio };
}

// Put the clock radio model (main.js loads it) in its place on the shelf.
export function placeRadio(shelf, model) {
  fitModel(model, RADIO.height);
  model.traverse((o) => {
    if (o.isMesh) o.material.metalness = 0; // the model leaves it at glTF's default, fully metallic
  });
  shelf.radio.rotation.y = RADIO.turn;
  shelf.radio.clear();
  shelf.radio.add(model);
}
