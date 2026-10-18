import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CanTop, LID } from './CanTop.js';

describe('CanTop', () => {
  it('sits on the lid, shut, with the tab lying flat', () => {
    const top = new CanTop();
    expect(top.group.position.y).toBe(LID.height);
    expect(top.opened).toBe(false);
    expect(top.mouth.visible).toBe(false);
  });

  it('lifts the ring as the tab levers up, and opens the mouth', () => {
    const top = new CanTop();
    top.group.updateMatrixWorld(true);
    const flat = top.ring(new THREE.Vector3());
    top.setTab(1.2);
    top.group.updateMatrixWorld(true);
    const lifted = top.ring(new THREE.Vector3());
    expect(lifted.y - flat.y).toBeGreaterThan(0.01);
    expect(top.ring(new THREE.Vector3(), true).toArray()).toEqual(flat.toArray()); // where it lies when flat
    top.setOpen(true);
    expect(top.mouth.visible).toBe(true);
  });
});
