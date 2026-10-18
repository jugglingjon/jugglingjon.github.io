import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { REMOTE_BUTTONS } from './thumbing.js';
import { createWoodTexture } from '../world/textures.js';

// Body in remote-local space: x across, y up (the button face), z along the
// remote with +z pointing at the TV.
export const REMOTE_SIZE = { width: 0.058, height: 0.026, rear: -0.12, front: 0.095 };
export const FACE_Y = REMOTE_SIZE.height / 2;
const BUTTON_HEIGHT = 0.0045;
export const TRAVEL = 0.0022; // how far a button sinks when pressed
const HIGHLIGHT = new THREE.Color('#5dff6a');

function labelTexture(text, { color = '#efe8da', width = 128, height = 96, weight = 800 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  let size = height * 0.62;
  ctx.font = `${weight} ${size}px "Arial Black", Arial, sans-serif`;
  while (ctx.measureText(text).width > width * 0.86 && size > 8) {
    size -= 2;
    ctx.font = `${weight} ${size}px "Arial Black", Arial, sans-serif`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + size * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function printed(text, w, d, options) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ map: labelTexture(text, options), transparent: true, roughness: 0.6 }),
  );
  // Lie flat on the face, reading upright from behind the remote (you hold
  // it pointing away, so the text's top faces the tip).
  plane.rotation.set(-Math.PI / 2, 0, Math.PI);
  return plane;
}

// The chunky 80s remote in your hand. Buttons can be highlighted (the one your
// thumb is over) and sunk (being pressed); the IR LED blinks on every press.
export class RemoteModel {
  constructor() {
    this.group = new THREE.Group();
    const { width, height, rear, front } = REMOTE_SIZE;
    const length = front - rear;

    const plastic = new THREE.MeshStandardMaterial({ color: '#2b221c', roughness: 0.55 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(width, height, length, 3, 0.009), plastic);
    body.position.z = (front + rear) / 2;
    this.group.add(body);

    // Brushed face panel the buttons sit on.
    const panel = new THREE.Mesh(
      new RoundedBoxGeometry(width - 0.008, 0.0016, 0.152, 2, 0.0007),
      new THREE.MeshStandardMaterial({ color: '#4a4540', metalness: 0.6, roughness: 0.35 }),
    );
    panel.position.set(0, FACE_Y, 0.013);
    this.group.add(panel);

    // Woodgrain brand plate where the palm meets the face.
    const plate = new THREE.Mesh(
      new RoundedBoxGeometry(width - 0.01, 0.0016, 0.03, 2, 0.0007),
      new THREE.MeshStandardMaterial({ map: createWoodTexture({ base: '#6b4426', seed: 71 }), roughness: 0.45 }),
    );
    plate.position.set(0, FACE_Y, -0.078);
    this.group.add(plate);
    const brand = printed('LUMATRON', 0.044, 0.011, { color: '#d9d2c4', width: 256, height: 64, weight: 900 });
    brand.position.set(0, FACE_Y + 0.0009, -0.078);
    this.group.add(brand);

    // Silkscreen between the rocker pairs.
    for (const [text, x] of [['VOL', 0.0135], ['CH', -0.0135]]) {
      const silk = printed(text, 0.014, 0.0055, { color: '#bdb5a6', width: 128, height: 48 });
      silk.position.set(x, FACE_Y + 0.0009, -0.0335);
      this.group.add(silk);
    }

    // IR window and LED at the tip.
    const irWindow = new THREE.Mesh(
      new RoundedBoxGeometry(0.034, 0.012, 0.006, 2, 0.002),
      new THREE.MeshStandardMaterial({ color: '#2a0505', roughness: 0.15, transparent: true, opacity: 0.85 }),
    );
    irWindow.position.set(0, 0, front - 0.002);
    this.group.add(irWindow);
    this.ledMaterial = new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff3018', emissiveIntensity: 0 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 12, 8), this.ledMaterial);
    led.position.set(0, 0, front - 0.004);
    this.group.add(led);
    this.blinkTime = 0;

    // Buttons, each with its own material so it can light up on its own.
    const colors = { key: '#3a312b', rocker: '#564b43', power: '#b8301f', info: '#c99a2e' };
    const ink = { power: '#ffe6dc', info: '#2b1d10' };
    this.buttons = new Map();
    for (const def of REMOTE_BUTTONS) {
      const material = new THREE.MeshStandardMaterial({ color: colors[def.kind], roughness: 0.75, emissive: HIGHLIGHT, emissiveIntensity: 0 });
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(def.w, BUTTON_HEIGHT, def.d, 2, 0.0016), material);
      const restY = FACE_Y + 0.0008 + BUTTON_HEIGHT / 2;
      mesh.position.set(def.x, restY, def.z);
      const small = def.label.length > 2;
      const label = printed(def.label, def.w * 0.9, def.d * 0.8, { color: ink[def.kind] ?? '#efe8da', weight: small ? 800 : 900 });
      label.position.y = BUTTON_HEIGHT / 2 + 0.0002;
      mesh.add(label);
      this.group.add(mesh);
      this.buttons.set(def.button, { def, mesh, material, restY, top: new THREE.Vector3(def.x, restY + BUTTON_HEIGHT / 2, def.z) });
    }
    this.group.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true;
    });
  }

  setHighlight(name, strength = 0.9) {
    for (const [button, b] of this.buttons) b.material.emissiveIntensity = button === name ? strength : 0;
  }

  // amount 0 (up) … 1 (fully sunk) for one button; everything else springs back.
  setPress(name, amount) {
    for (const [button, b] of this.buttons) b.mesh.position.y = b.restY - (button === name ? amount * TRAVEL : 0);
  }

  blink() {
    this.blinkTime = 0.09;
  }

  update(dt) {
    this.blinkTime = Math.max(0, this.blinkTime - dt);
    this.ledMaterial.emissiveIntensity = this.blinkTime > 0 ? 6 : 0;
  }
}
