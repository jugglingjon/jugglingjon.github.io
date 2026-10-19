import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Twirl, TWIRL, TWIRL_LENGTH, twirlPose } from './Twirl.js';

describe('twirlPose', () => {
  it('starts and ends at rest, a full turn round', () => {
    expect(twirlPose(0)).toEqual({ spin: 0, hop: 0, tiltX: 0, tiltZ: 0 });
    const end = twirlPose(TWIRL_LENGTH);
    expect(end.spin).toBeCloseTo(Math.PI * 2, 9);
    expect(end.hop).toBe(0);
    expect(Math.hypot(end.tiltX, end.tiltZ)).toBeLessThan(0.001);
  });

  it('hops up and lands, then wobbles less and less', () => {
    expect(twirlPose(TWIRL.air / 2).hop).toBeCloseTo(TWIRL.hop, 9);
    expect(twirlPose(TWIRL.air + 0.01).hop).toBe(0);
    const sway = (t) => Math.hypot(twirlPose(t).tiltX, twirlPose(t).tiltZ / 0.6);
    expect(sway(TWIRL.air + 0.1)).toBeGreaterThan(sway(TWIRL.air + 0.5));
    expect(sway(TWIRL.air + 0.5)).toBeGreaterThan(sway(TWIRL.air + 1));
  });

  it('spins fast, then slows into the end of the turn', () => {
    const quarter = TWIRL.turn / 4;
    expect(twirlPose(quarter).spin).toBeGreaterThan(Math.PI * 2 * 0.5);
    let last = 0;
    for (let t = 0; t <= TWIRL.turn; t += 0.05) {
      const { spin } = twirlPose(t);
      expect(spin).toBeGreaterThanOrEqual(last);
      last = spin;
    }
  });

  it('only spins with reduced motion', () => {
    for (const t of [0.1, 0.3, 0.6, 1]) expect(twirlPose(t, { wobbly: false })).toMatchObject({ hop: 0, tiltX: 0, tiltZ: 0 });
  });
});

describe('Twirl', () => {
  const run = (twirl, seconds, each = () => {}) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      twirl.update(1 / 60);
      each();
    }
  };

  it('twirls once and is back exactly where it stood', () => {
    const plant = new THREE.Object3D();
    plant.position.set(-1.72, 0, -0.52);
    plant.rotation.y = 0.4;
    const before = { p: plant.position.toArray(), q: plant.quaternion.toArray() };
    const twirl = new Twirl(plant);
    expect(twirl.spin()).toBe(true);
    expect(twirl.spin()).toBe(false); // one at a time
    let highest = 0;
    let tipped = 0;
    run(twirl, TWIRL_LENGTH + 0.1, () => {
      highest = Math.max(highest, plant.position.y);
      tipped = Math.max(tipped, new THREE.Vector3(0, 1, 0).applyQuaternion(plant.quaternion).angleTo(new THREE.Vector3(0, 1, 0)));
    });
    expect(highest).toBeGreaterThan(0.02);
    expect(tipped).toBeGreaterThan(0.05);
    expect(twirl.active).toBe(false);
    expect(plant.position.toArray()).toEqual(before.p);
    expect(plant.quaternion.toArray()).toEqual(before.q);
  });

  it('stays upright with reduced motion', () => {
    const plant = new THREE.Object3D();
    const twirl = new Twirl(plant);
    twirl.reducedMotion = true;
    twirl.spin();
    run(twirl, 0.5, () => {
      expect(plant.position.y).toBe(0);
      expect(new THREE.Vector3(0, 1, 0).applyQuaternion(plant.quaternion).y).toBeCloseTo(1, 9);
    });
  });
});
