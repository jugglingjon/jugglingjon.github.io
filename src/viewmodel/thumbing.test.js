import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FIELD, REMOTE_BUTTONS, nearestButton, pointerToField, solveTwoBone } from './thumbing.js';
import { BUTTONS } from '../tv/Remote.js';

describe('remote layout', () => {
  it('has every remote button exactly once', () => {
    expect(REMOTE_BUTTONS.map((b) => b.button).sort()).toEqual([...BUTTONS].sort());
  });

  it('keeps buttons from overlapping', () => {
    for (const a of REMOTE_BUTTONS) {
      for (const b of REMOTE_BUTTONS) {
        if (a === b) continue;
        const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.z - b.z) >= (a.d + b.d) / 2;
        expect(apart, `${a.button} overlaps ${b.button}`).toBe(true);
      }
    }
  });
});

describe('pointer → button', () => {
  const at = (x, y) => nearestButton(pointerToField(x, y));

  it('maps screen corners to the buttons you see in those corners', () => {
    expect(at(-1, 1)).toBe('1');
    expect(at(1, 1)).toBe('power');
    expect(at(-1, -1)).toBe('vol-');
    expect(at(1, -1)).toBe('ch-');
  });

  it('moves right across the pad as the pointer moves right', () => {
    expect([at(-0.3, 0.27), at(0, 0.27), at(0.3, 0.27)]).toEqual(['4', '5', '6']);
  });

  it('puts the middle of the screen on the middle of the pad', () => {
    expect(at(0, 0)).toBe('8');
  });

  it('clamps beyond the reach area to the field edge', () => {
    expect(pointerToField(5, -5)).toEqual({ x: FIELD.minX, z: FIELD.minZ });
  });

  it('sticks with the current button near a boundary', () => {
    const five = REMOTE_BUTTONS.find((b) => b.button === '5');
    const six = REMOTE_BUTTONS.find((b) => b.button === '6');
    // Halfway between them, nudged towards 6.
    const between = { x: (five.x + six.x) / 2 + Math.sign(six.x - five.x) * 0.0005, z: five.z };
    expect(nearestButton(between)).toBe('6');
    expect(nearestButton(between, '5')).toBe('5');
  });
});

describe('solveTwoBone', () => {
  const base = new THREE.Vector3();
  const joint = new THREE.Vector3();
  const tip = new THREE.Vector3();

  it('keeps both bone lengths and bends towards the pole', () => {
    solveTwoBone(base, new THREE.Vector3(1.5, 0, 0), 1, 1, new THREE.Vector3(0, 1, 0), joint, tip);
    expect(tip.x).toBeCloseTo(1.5);
    expect(joint.distanceTo(base)).toBeCloseTo(1);
    expect(tip.distanceTo(joint)).toBeCloseTo(1);
    expect(joint.y).toBeGreaterThan(0);
  });

  it('clamps an unreachable target to full extension', () => {
    solveTwoBone(base, new THREE.Vector3(5, 0, 0), 1, 1, new THREE.Vector3(0, 1, 0), joint, tip);
    expect(tip.length()).toBeCloseTo(2, 3);
    expect(joint.distanceTo(base)).toBeCloseTo(1);
  });
});
