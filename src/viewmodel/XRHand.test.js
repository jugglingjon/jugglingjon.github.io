import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { XRHand } from './XRHand.js';
import { FACE_Y, REMOTE_SIZE } from './RemoteModel.js';
import { REMOTE_BUTTONS } from './thumbing.js';

// Signed distance to the remote's rounded body, in metres (negative inside).
const { width, height, rear, front } = REMOTE_SIZE;
const centre = new THREE.Vector3(0, 0, (front + rear) / 2);
const half = new THREE.Vector3(width / 2, height / 2, (front - rear) / 2);
const ROUND = 0.009;
function toRemote(p) {
  const q = new THREE.Vector3(Math.abs(p.x - centre.x), Math.abs(p.y - centre.y), Math.abs(p.z - centre.z)).sub(half).addScalar(ROUND);
  const outside = new THREE.Vector3(Math.max(q.x, 0), Math.max(q.y, 0), Math.max(q.z, 0)).length();
  return outside + Math.min(Math.max(q.x, q.y, q.z), 0) - ROUND;
}

describe('XRHand', () => {
  let hand;
  const target = new THREE.Vector3();
  const world = (bone) => bone.getWorldPosition(new THREE.Vector3());

  beforeAll(async () => {
    const file = readFileSync('public/models/hand/right.glb');
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));
    hand = new XRHand(gltf.scene);
  });

  // Thumb resting on a button, as ArmRig would place it.
  const rest = (b) => {
    target.set(b.x, FACE_Y + 0.0053 + hand.thumbRadius, b.z);
    hand.setSlide(hand.slideFor(target));
    hand.setThumbTip(target);
    hand.group.updateMatrixWorld(true);
  };

  it.each(REMOTE_BUTTONS.map((b) => [b.button, b]))('reaches %s with the thumb arched over the face', (_, b) => {
    rest(b);
    const [cmc, mcp, ip, tip] = hand.thumb.map(world);
    expect(tip.distanceTo(target)).toBeLessThan(0.006); // the hover gap covers the rest
    expect(ip.y).toBeGreaterThan(FACE_Y + 0.005);
    // Bones keep their (stretched) lengths, in remote space.
    const scale = hand.settings.scale;
    expect(mcp.distanceTo(ip)).toBeCloseTo(hand.lengths[0] * scale, 5);
    expect(ip.distanceTo(tip)).toBeLessThanOrEqual(hand.lengths[1] * scale + 1e-6);
    expect(cmc.distanceTo(mcp)).toBeCloseTo(hand.cmc.distanceTo(hand.mcpRest) * scale, 5);
  });

  it('keeps the skin out of the remote, give or take a firm grip', () => {
    rest(REMOTE_BUTTONS.find((b) => b.button === '5'));
    const v = new THREE.Vector3();
    let deepest = 0;
    for (let i = 0; i < hand.mesh.geometry.attributes.position.count; i++) {
      hand.mesh.getVertexPosition(i, v).applyMatrix4(hand.mesh.matrixWorld);
      deepest = Math.min(deepest, toRemote(v));
    }
    expect(deepest).toBeGreaterThan(-0.004);
  });

  it('wraps the fingers round to the left edge', () => {
    rest(REMOTE_BUTTONS.find((b) => b.button === '5'));
    for (const chain of hand.fingers) {
      const tip = world(chain[4]);
      expect(tip.x).toBeGreaterThan(0.015);
      expect(toRemote(tip)).toBeLessThan(0.02);
    }
  });

  it('lies along the remote, the wrist behind its tail so the forearm carries on back', () => {
    rest(REMOTE_BUTTONS.find((b) => b.button === 'ch+'));
    expect(hand.wrist.z).toBeLessThan(REMOTE_SIZE.rear + 0.02);
    expect(hand.wrist.y).toBeLessThan(-0.02);
    // Knuckles → wrist points back down the remote, not out to the side.
    const back = hand.wrist.clone().sub(world(hand.fingers[1][1])).normalize();
    expect(back.angleTo(new THREE.Vector3(0, 0, -1))).toBeLessThan(THREE.MathUtils.degToRad(45));
  });

  it('shifts the grip only part of the way up the remote for the far buttons', () => {
    const top = REMOTE_BUTTONS.find((b) => b.button === '1');
    const home = REMOTE_BUTTONS.find((b) => b.button === 'ch+');
    rest(home);
    const homeSlide = hand.group.position.z;
    rest(top);
    expect(hand.group.position.z - homeSlide).toBeLessThan((top.z - home.z) * 0.5);
  });

  it('hands the forearm off along the wrist, from inside the end of the mesh', () => {
    rest(REMOTE_BUTTONS.find((b) => b.button === 'ch+'));
    const frame = hand.forearm({ position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
    const upArm = new THREE.Vector3(0, 1, 0).applyQuaternion(frame.quaternion);
    const wristJoint = world(hand.bones.wrist);
    // Up the arm is the way the wrist joint points back (its +Z)…
    const wristBack = new THREE.Vector3(0, 0, 1).applyQuaternion(hand.bones.wrist.getWorldQuaternion(new THREE.Quaternion()));
    expect(upArm.dot(wristBack)).toBeGreaterThan(0.999);
    // …and away from the knuckles.
    expect(upArm.dot(wristJoint.clone().sub(world(hand.fingers[1][1])).normalize())).toBeGreaterThan(0.95);
    // It starts just behind the joint, and the cuff begins before the mesh ends (2.2 cm × scale).
    const along = frame.position.clone().sub(wristJoint).dot(upArm);
    expect(along).toBeGreaterThan(0);
    expect(along + frame.cuffAt).toBeLessThan(0.0224 * hand.settings.scale);
    expect(frame.halfWidth).toBeGreaterThan(frame.halfThickness);
  });

  it('re-fits when the grip settings change', () => {
    const before = hand.wrist.clone();
    hand.settings.wristX += 0.01;
    hand.applyGrip();
    expect(hand.wrist.x - before.x).toBeCloseTo(0.01, 6);
    hand.settings.wristX -= 0.01;
    hand.applyGrip();
  });
});
