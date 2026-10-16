import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  createCarpetTexture,
  createPanelingTexture,
  createTapeLabelTexture,
  createVcrDisplayTexture,
  createWoodTexture,
} from './textures.js';

const STAND_HEIGHT = 0.5;

// Greybox corner of the apartment: carpet, paneled wall, a wood TV stand with
// a VCR and tapes, dim lamp and window light. Placeholder for the Phase 3 room.
export class Stage {
  constructor({ env }) {
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#050403');
    scene.fog = new THREE.FogExp2('#050403', 0.16);
    scene.environment = env;
    scene.environmentIntensity = 0.35;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ map: createCarpetTexture(), roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const paneling = new THREE.MeshStandardMaterial({ map: createPanelingTexture(), roughness: 0.7 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.2), paneling);
    backWall.position.set(0, 1.6, -0.8);
    scene.add(backWall);
    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), paneling);
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(-2.4, 1.6, 2.2);
    scene.add(sideWall);

    this.buildStand();
    this.buildLights();
  }

  buildStand() {
    const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture({ base: '#4a2c17', seed: 19 }), roughness: 0.5 });
    const shadow = new THREE.MeshStandardMaterial({ color: '#0b0705', roughness: 0.9 });
    const stand = new THREE.Group();
    const add = (geometry, material, x, y, z, parent = stand) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    add(new RoundedBoxGeometry(0.95, 0.035, 0.5, 2, 0.008), wood, 0, STAND_HEIGHT - 0.0175, 0);
    add(new RoundedBoxGeometry(0.95, 0.03, 0.5, 2, 0.008), wood, 0, 0.055, 0);
    add(new RoundedBoxGeometry(0.03, STAND_HEIGHT, 0.5, 2, 0.008), wood, -0.46, STAND_HEIGHT / 2, 0);
    add(new RoundedBoxGeometry(0.03, STAND_HEIGHT, 0.5, 2, 0.008), wood, 0.46, STAND_HEIGHT / 2, 0);
    add(new THREE.BoxGeometry(0.92, 0.02, 0.48), wood, 0, 0.27, 0);
    add(new THREE.BoxGeometry(0.92, 0.46, 0.01), shadow, 0, 0.27, -0.245);
    add(new THREE.BoxGeometry(0.9, 0.04, 0.46), shadow, 0, 0.02, 0);

    // VCR on the middle shelf, clock blinking 12:00 forever.
    const vcrBody = new THREE.MeshStandardMaterial({ color: '#2a2a2d', metalness: 0.5, roughness: 0.45 });
    const vcr = add(new RoundedBoxGeometry(0.43, 0.085, 0.32, 2, 0.006), vcrBody, -0.17, 0.28 + 0.0425, 0.03);
    add(new THREE.BoxGeometry(0.2, 0.032, 0.002), shadow, -0.06, 0.008, 0.161, vcr);
    this.vcrDisplay = add(
      new THREE.PlaneGeometry(0.07, 0.018),
      new THREE.MeshBasicMaterial({ map: createVcrDisplayTexture(), toneMapped: false }),
      0.12, 0.012, 0.1612, vcr,
    );
    for (let i = 0; i < 5; i++) {
      add(new THREE.BoxGeometry(0.018, 0.007, 0.004), shadow, 0.08 + i * 0.024, -0.018, 0.161, vcr);
    }

    // A few tapes standing on the bottom shelf.
    const tapeBody = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.6 });
    ['SHOWREEL 86', 'PORTFOLIO', 'DEMOS - DO NOT TAPE'].forEach((title, i) => {
      const label = createTapeLabelTexture(title, i + 3);
      label.center.set(0.5, 0.5);
      label.rotation = Math.PI / 2;
      const spine = new THREE.MeshStandardMaterial({ map: label, roughness: 0.7 });
      const tape = add(
        new THREE.BoxGeometry(0.027, 0.19, 0.105),
        [tapeBody, tapeBody, tapeBody, tapeBody, spine, tapeBody],
        0.18 + i * 0.03, 0.07 + 0.095, 0.12,
      );
      tape.rotation.y = (i - 1) * 0.03;
    });

    this.scene.add(stand);
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight('#3a4560', '#1a0f08', 0.25));

    // Table lamp behind the couch, off to the viewer's left.
    const lamp = new THREE.PointLight('#ffae66', 1.5, 9, 2);
    lamp.position.set(-1.6, 1.3, 1.6);
    this.scene.add(lamp);

    // Cool window light and a pink neon sign outside, to the viewer's right.
    const moon = new THREE.DirectionalLight('#5a74a8', 0.15);
    moon.position.set(2.5, 2.2, 1.5);
    this.scene.add(moon);
    const neon = new THREE.PointLight('#ff3c9a', 0.8, 6, 2);
    neon.position.set(2.4, 1.4, 1.2);
    this.scene.add(neon);
  }

  placeTV(tv) {
    tv.group.position.set(0, STAND_HEIGHT, 0);
    this.scene.add(tv.group);
  }

  update(time) {
    this.vcrDisplay.visible = time % 1 < 0.5;
  }
}
