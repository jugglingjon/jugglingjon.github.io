import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createBadgeTexture, createDialTexture, createGrilleTexture, createWoodTexture } from './textures.js';

// Procedural stand-in for a ~20" early-80s tabletop colour set: woodgrain vinyl
// wrap, dark plastic fascia, tuner dials and rabbit ears. Units are metres;
// the origin is the floor point under the cabinet's centre.

const FEET = 0.012;
const SCREEN_CENTER = new THREE.Vector3(-0.075, FEET + 0.29, 0.226);

function roundedRectPath(path, cx, cy, w, h, r) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

export class TV {
  constructor({ screenGeometry, screenMaterial }) {
    this.group = new THREE.Group();
    this.group.name = 'TV';

    const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture(), roughness: 0.55 });
    const fascia = new THREE.MeshStandardMaterial({ color: '#231c17', roughness: 0.42 });
    const black = new THREE.MeshStandardMaterial({ color: '#050404', roughness: 0.9 });
    const silver = new THREE.MeshStandardMaterial({ color: '#bdb8b0', metalness: 0.8, roughness: 0.35 });
    const chrome = new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 1, roughness: 0.18 });
    this.ledMaterial = new THREE.MeshStandardMaterial({ color: '#3a0503', emissive: '#ff2a12', emissiveIntensity: 0 });

    const add = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      return mesh;
    };

    // Woodgrain wrap: top, bottom and sides, open at the front for the fascia.
    const depth = 0.465;
    const zMid = 0.0125;
    add(new RoundedBoxGeometry(0.74, 0.035, depth, 3, 0.012), wood, 0, FEET + 0.5225, zMid);
    add(new RoundedBoxGeometry(0.74, 0.045, depth, 3, 0.012), wood, 0, FEET + 0.0225, zMid);
    add(new RoundedBoxGeometry(0.035, 0.54, depth, 3, 0.012), wood, -0.3525, FEET + 0.27, zMid);
    add(new RoundedBoxGeometry(0.035, 0.54, depth, 3, 0.012), wood, 0.3525, FEET + 0.27, zMid);

    // Fascia with a rounded opening for the tube.
    const shape = roundedRectPath(new THREE.Shape(), 0, 0, 0.67, 0.46, 0.015);
    shape.holes.push(roundedRectPath(new THREE.Path(), SCREEN_CENTER.x, 0.015, 0.47, 0.3525, 0.03));
    const fasciaGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 3,
      curveSegments: 12,
    });
    add(fasciaGeometry, fascia, 0, FEET + 0.275, 0.215);

    // Dark interior so gaps around the glass read as shadow, and the back hump.
    add(new THREE.BoxGeometry(0.66, 0.45, 0.36), black, 0, FEET + 0.275, -0.03);
    add(new THREE.BoxGeometry(0.66, 0.45, 0.02), fascia, 0, FEET + 0.275, -0.21);
    const hump = new THREE.CylinderGeometry(0.1, 0.27, 0.26, 4, 1);
    hump.rotateY(Math.PI / 4);
    hump.rotateX(-Math.PI / 2);
    add(hump, fascia, -0.03, FEET + 0.29, -0.35);

    for (const [x, z] of [[-0.3, -0.17], [0.3, -0.17], [-0.3, 0.17], [0.3, 0.17]]) {
      add(new THREE.CylinderGeometry(0.018, 0.022, FEET, 12), black, x, FEET / 2, z);
    }

    // The glass. Its material is the Stage B screen shader.
    this.screen = add(screenGeometry, screenMaterial, SCREEN_CENTER.x, SCREEN_CENTER.y, SCREEN_CENTER.z);
    this.screen.name = 'Screen';

    // Control panel: VHF dial, UHF knob, power button + LED, speaker grille.
    const px = 0.255;
    const front = 0.2325;
    const dial = add(new THREE.CircleGeometry(0.045, 40), new THREE.MeshStandardMaterial({ map: createDialTexture(), metalness: 0.4, roughness: 0.4 }), px, FEET + 0.43, front);
    dial.rotation.z = -0.3;
    const knob = new THREE.CylinderGeometry(0.026, 0.028, 0.022, 24);
    knob.rotateX(Math.PI / 2);
    add(knob, fascia, px, FEET + 0.43, front + 0.011);
    add(new THREE.BoxGeometry(0.004, 0.026, 0.002), silver, px, FEET + 0.43, front + 0.023).rotation.z = -0.3;
    const fineTune = new THREE.CylinderGeometry(0.018, 0.019, 0.018, 20);
    fineTune.rotateX(Math.PI / 2);
    add(fineTune, fascia, px, FEET + 0.335, front + 0.009);
    add(new RoundedBoxGeometry(0.04, 0.018, 0.012, 2, 0.003), silver, px, FEET + 0.255, front + 0.004);
    this.led = add(new THREE.SphereGeometry(0.004, 12, 8), this.ledMaterial, px + 0.04, FEET + 0.255, front + 0.002);
    add(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshStandardMaterial({ map: createGrilleTexture(), roughness: 0.8 }), px, FEET + 0.12, front + 0.0005);

    const badge = new THREE.MeshStandardMaterial({ map: createBadgeTexture(), transparent: true, metalness: 0.6, roughness: 0.3 });
    add(new THREE.PlaneGeometry(0.15, 0.028), badge, SCREEN_CENTER.x, FEET + 0.08, front + 0.0005);

    // Rabbit ears.
    const earBase = new THREE.Vector3(0.12, FEET + 0.54, -0.04);
    add(new THREE.SphereGeometry(0.045, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), fascia, earBase.x, earBase.y, earBase.z);
    const rod = new THREE.CylinderGeometry(0.0022, 0.0035, 0.6, 8);
    rod.translate(0, 0.3, 0);
    for (const side of [-1, 1]) {
      const ear = add(rod, chrome, earBase.x, earBase.y + 0.035, earBase.z);
      ear.rotation.set(-0.18, 0, side * 0.5);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), chrome);
      tip.position.y = 0.6;
      ear.add(tip);
    }
  }

  // Centre of the glass in TV-local space; the glow light hangs off this.
  get screenCenter() {
    return SCREEN_CENTER.clone();
  }

  setPower(on) {
    this.ledMaterial.emissiveIntensity = on ? 3 : 0;
  }
}
