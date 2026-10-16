import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Hand } from './Hand.js';
import { FACE_Y } from './RemoteModel.js';
import { REMOTE_BUTTONS } from './thumbing.js';

describe('Hand', () => {
  const hand = new Hand();
  const target = new THREE.Vector3();
  const pad = FACE_Y + 0.006 + hand.thumbRadius; // resting on a button top

  it.each(REMOTE_BUTTONS.map((b) => [b.button, b]))('reaches %s without stretching or clipping the face', (_, b) => {
    target.set(b.x, pad, b.z);
    hand.setSlide(Hand.slideFor(target));
    hand.setThumbTip(target);
    const tip = hand.tip.clone().setZ(hand.tip.z + hand.group.position.z);
    expect(tip.distanceTo(target)).toBeLessThan(1e-4);
    expect(hand.joint.y).toBeGreaterThan(FACE_Y + hand.thumbRadius);
  });

  it('moves the wrist with the grip', () => {
    hand.setSlide(0);
    const rest = hand.wrist.z;
    hand.setSlide(0.04);
    expect(hand.wrist.z).toBeCloseTo(rest + 0.04);
  });
});
