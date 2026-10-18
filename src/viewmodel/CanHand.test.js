import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CanHand, wrapAngles } from './CanHand.js';
import { LeftArm } from './LeftArm.js';

vi.mock('../world/textures.js', () => ({ createFlannelTexture: () => null })); // the sleeve's flannel is painted on a canvas

const BELOW = -0.058; // the can's base, in grip space (Drink holds it 5.8 cm up)
const ABOVE = 0.064; // its top

describe('CanHand', () => {
  let hand;
  const at = (bone) => bone.getWorldPosition(new THREE.Vector3());
  const around = (p) => Math.hypot(p.x, p.z);

  beforeAll(async () => {
    const file = readFileSync('public/models/hand/left.glb');
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));
    hand = new CanHand(gltf.scene);
  });

  // Every skin vertex, posed, in grip space.
  const skin = () => {
    hand.group.updateMatrixWorld(true);
    const { mesh } = hand;
    const v = new THREE.Vector3();
    return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld).clone());
  };

  it('holds the can without the skin sinking into it, or below its base (the table)', () => {
    hand.setClosed(1);
    const { radius } = hand.settings;
    const verts = skin();
    const inside = verts.filter((p) => p.y > BELOW && p.y < ABOVE && around(p) < radius - 0.001);
    expect(inside).toEqual([]);
    expect(Math.min(...verts.map((p) => p.y))).toBeGreaterThan(BELOW);
  });

  it('wraps the fingers round the far side to rest on the can, and the thumb round the near side', () => {
    hand.setClosed(1);
    const { radius, thickness } = hand.settings;
    for (const chain of hand.fingers) {
      const tip = at(chain[4]);
      expect(around(tip) - (radius + thickness)).toBeLessThan(0.003);
      expect(tip.z).toBeLessThan(0); // the far side
    }
    const thumb = at(hand.thumb[3]);
    expect(around(thumb) - (radius + thickness)).toBeLessThan(0.004);
    expect(thumb.z).toBeGreaterThan(0); // the near side
  });

  it('opens to let go', () => {
    hand.setClosed(0);
    const { radius, thickness } = hand.settings;
    const gaps = hand.fingers.map((chain) => around(at(chain[4])) - (radius + thickness));
    expect(Math.min(...gaps)).toBeGreaterThan(0.01);
    hand.setClosed(1);
  });

  it('curls a joint just far enough to touch the cylinder', () => {
    // A straight three-joint chain down −z, hinged about +x (each joint's own
    // +X), beside a cylinder along x that it curls (towards −y) to meet.
    const chain = [0, 1, 2].map((i) => {
      const joint = new THREE.Object3D();
      joint.position.set(0, 0, -0.03 * i);
      return joint;
    });
    const centre = new THREE.Vector3(0, -0.04, -0.03);
    const along = new THREE.Vector3(1, 0, 0);
    const [first] = wrapAngles(chain, 0, centre, along, 0.02, 0);
    expect(first).toBeGreaterThan(0);
    const next = chain[1].position;
    expect(Math.hypot(next.y - centre.y, next.z - centre.z)).toBeCloseTo(Math.hypot(0.02, 0.015), 4);
  });

  it('gives the arm a forearm that carries on from the wrist', () => {
    const arm = new LeftArm(hand);
    const camera = new THREE.PerspectiveCamera();
    camera.updateMatrixWorld();
    hand.group.position.set(-0.03, -0.05, -0.42);
    arm.root.visible = true;
    arm.update(camera);
    const wrist = hand.forearm({ position: new THREE.Vector3(), quaternion: new THREE.Quaternion() }).position.applyMatrix4(hand.group.matrixWorld);
    expect(arm.frame.position.distanceTo(wrist)).toBeLessThan(1e-9);
    // The elbow is a forearm's length from the wrist, down and back towards your shoulder.
    expect(arm.elbow.distanceTo(wrist)).toBeCloseTo(0.27, 6);
    expect(arm.elbow.y).toBeLessThan(wrist.y);
    expect(arm.elbow.z).toBeGreaterThan(wrist.z);
    hand.group.position.set(0, 0, 0);
  });
});
