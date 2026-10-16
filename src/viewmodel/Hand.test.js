import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Hand } from './Hand.js';
import { FACE_Y, REMOTE_SIZE } from './RemoteModel.js';
import { REMOTE_BUTTONS } from './thumbing.js';

describe('Hand', () => {
  const hand = new Hand();
  const target = new THREE.Vector3();
  const pad = FACE_Y + 0.006 + hand.thumbRadius; // resting on a button top
  const restLength = Hand.cmc.distanceTo(hand.knuckle);

  // Thumb on a button; returns where the knuckle went, in hand space.
  const reach = (b) => {
    target.set(b.x, pad, b.z);
    hand.setSlide(Hand.slideFor(target));
    hand.setThumbTip(target);
    return hand.knuckle.clone();
  };

  it.each(REMOTE_BUTTONS.map((b) => [b.button, b]))('reaches %s without stretching or clipping the remote', (_, b) => {
    const knuckle = reach(b);
    const tip = hand.tip.clone().setZ(hand.tip.z + hand.group.position.z);
    expect(tip.distanceTo(target)).toBeLessThan(1e-4);
    expect(hand.joint.y).toBeGreaterThan(FACE_Y + hand.thumbRadius);
    expect(knuckle.distanceTo(Hand.cmc)).toBeCloseTo(restLength, 6);
    // The knuckle stays outside the remote's body.
    expect(knuckle.x < -REMOTE_SIZE.width / 2 || knuckle.y > FACE_Y).toBe(true);
  });

  it('swings the base of the thumb up and across to reach the far side', () => {
    const byName = (name) => REMOTE_BUTTONS.find((b) => b.button === name);
    const far = reach(byName('1'));
    const middle = reach(byName('2'));
    const near = reach(byName('3'));
    expect(far.x - near.x).toBeGreaterThan(0.007);
    expect(far.y - near.y).toBeGreaterThan(0.01);
    expect(middle.x).toBeGreaterThan(near.x);
    expect(middle.x).toBeLessThan(far.x);
  });

  it('moves the wrist with the grip', () => {
    hand.setSlide(0);
    const rest = hand.wrist.z;
    hand.setSlide(0.04);
    expect(hand.wrist.z).toBeCloseTo(rest + 0.04);
  });
});
