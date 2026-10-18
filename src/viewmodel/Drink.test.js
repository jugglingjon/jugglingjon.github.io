import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Drink, drinkTimeline, trackValue } from './Drink.js';
import { CanTop } from '../world/CanTop.js';

// Everything the drink drives, without the models: a camera, the camera's
// lean and tilt, the right arm's override, and a hand that can hold the can.
function setup() {
  const scene = new THREE.Scene();
  const can = { group: new THREE.Group(), top: new CanTop() };
  can.group.position.set(-0.33, 0.42, 1.17);
  can.group.add(can.top.group);
  scene.add(can.group);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0.05, 1.1, 2.55);
  camera.lookAt(0, 0.8, 0);
  camera.updateMatrixWorld();
  const seated = { lean: new THREE.Vector3(), focus: new THREE.Vector3(), focusWeight: 0, tilt: 0 };
  const rig = { settings: { size: 1 }, override: { weight: 0, position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), thumb: new THREE.Vector3(), bend: new THREE.Vector3() } };
  const hand = { group: new THREE.Group(), closed: 0, setClosed(c) { this.closed = c; } };
  const arm = { root: new THREE.Group(), hand };
  arm.root.add(hand.group);
  scene.add(arm.root);
  const drink = new Drink({ can, seated, rig, scene, eye: camera.position.clone() });
  drink.arm = arm;
  const heard = [];
  drink.onEvent = (name) => heard.push(name);
  const run = (seconds, check = () => {}) => {
    for (let t = 0; t < seconds && drink.active; t += 1 / 30) {
      drink.update(1 / 30, camera);
      check();
    }
  };
  return { scene, can, camera, seated, rig, hand, arm, drink, heard, run };
}

describe('drinkTimeline', () => {
  it.each([false, true])('keeps every track and event in order, inside the drink (opened: %s)', (opened) => {
    const tl = drinkTimeline(opened);
    for (const keys of [tl.grip, tl.closed, tl.lean, tl.sip, tl.remote, tl.thumb, tl.tab, tl.events]) {
      keys.forEach(([t], i) => {
        expect(t).toBeGreaterThanOrEqual(i ? keys[i - 1][0] : 0);
        expect(t).toBeLessThanOrEqual(tl.duration);
      });
    }
    expect(tl.grab).toBeLessThan(tl.set);
    expect(tl.grip[0][1]).toBe('rest');
    expect(tl.grip.at(-1)[1]).toBe('rest');
  });

  it('skips the tab once the can is open, and is that much shorter', () => {
    const shut = drinkTimeline(false);
    const open = drinkTimeline(true);
    expect(shut.events.map(([, e]) => e)).toEqual(['pick', 'open', 'gulp', 'gulp', 'gulp', 'ahh', 'set']);
    expect(open.events.map(([, e]) => e)).toEqual(['pick', 'gulp', 'gulp', 'gulp', 'ahh', 'set']);
    expect(shut.duration - open.duration).toBeCloseTo(1.8, 6);
    expect(trackValue(open.remote, 3.5)).toBe(0);
  });

  it('eases between keys and holds the ends', () => {
    const keys = [[1, 0], [2, 10]];
    expect(trackValue(keys, 0)).toBe(0);
    expect(trackValue(keys, 1.5)).toBeCloseTo(5, 6);
    expect(trackValue(keys, 1.1)).toBeLessThan(1); // eases out of the first key
    expect(trackValue(keys, 3)).toBe(10);
  });
});

describe('Drink', () => {
  it('waits for the hand and the can that opens', () => {
    const { drink } = setup();
    drink.arm = null;
    expect(drink.ready).toBe(false);
    expect(drink.start()).toBe(false);
  });

  it('picks the can up, opens it, drinks, and puts it back exactly where it was', () => {
    const { can, drink, heard, hand, arm, run, seated, rig } = setup();
    const home = { position: can.group.position.clone(), quaternion: can.group.quaternion.clone() };
    expect(drink.start()).toBe(true);
    expect(drink.start()).toBe(false); // one at a time
    expect(arm.root.visible).toBe(true);
    let held = false;
    let borrowed = 0;
    let leaned = 0;
    run(20, () => {
      if (can.group.parent === hand.group) held = true;
      borrowed = Math.max(borrowed, rig.override.weight);
      leaned = Math.max(leaned, seated.lean.length());
    });
    expect(drink.active).toBe(false);
    expect(held).toBe(true);
    expect(borrowed).toBe(1);
    expect(leaned).toBeGreaterThan(0.5);
    expect(heard).toEqual(['pick', 'open', 'gulp', 'gulp', 'gulp', 'ahh', 'set']);
    expect(can.top.opened).toBe(true);
    expect(can.group.parent).toBe(drink.scene);
    expect(can.group.position.toArray()).toEqual(home.position.toArray());
    expect(can.group.quaternion.toArray()).toEqual(home.quaternion.toArray());
    expect(arm.root.visible).toBe(false);
    expect(seated.lean.length()).toBe(0);
    expect(seated.tilt).toBe(0);
    expect(rig.override.weight).toBe(0);
    expect(hand.closed).toBe(0);
  });

  it('holds the can where the hand closed round it, however it got there', () => {
    const { can, drink, hand, camera } = setup();
    drink.seek(3); // straight into holding it in front of you
    drink.update(0, camera);
    expect(can.group.parent).toBe(hand.group);
    can.group.updateMatrixWorld(true);
    const inHand = can.group.getWorldPosition(new THREE.Vector3());
    const grip = hand.group.getWorldPosition(new THREE.Vector3());
    // The can's base is GRIP_HEIGHT below the hand's grip, along the can.
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(hand.group.quaternion);
    expect(inHand.clone().sub(grip).normalize().dot(down)).toBeCloseTo(1, 5);
    expect(inHand.distanceTo(grip)).toBeCloseTo(0.058, 5);
  });

  it('skips the tab the second time', () => {
    const { drink, heard, run } = setup();
    drink.start();
    run(20);
    heard.length = 0;
    drink.start();
    run(20);
    expect(heard).toEqual(['pick', 'gulp', 'gulp', 'gulp', 'ahh', 'set']);
  });

  it('only borrows your right thumb while the tab is opening', () => {
    const { drink, rig, run } = setup();
    drink.start();
    const borrowedAt = [];
    run(20, () => {
      if (rig.override.weight > 0) borrowedAt.push(drink.time);
    });
    expect(Math.min(...borrowedAt)).toBeGreaterThan(2.6);
    expect(Math.max(...borrowedAt)).toBeLessThan(4.75);
  });
});
