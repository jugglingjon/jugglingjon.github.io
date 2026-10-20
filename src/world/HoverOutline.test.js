import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HoverOutline, OUTLINE_LAYER } from './HoverOutline.js';

const outlined = (o) => o.layers.isEnabled(OUTLINE_LAYER);

describe('HoverOutline', () => {
  it('outlines the target and everything in it, and only that', () => {
    const outline = new HoverOutline(null);
    const [a, b] = [new THREE.Group(), new THREE.Group()];
    const part = new THREE.Mesh();
    a.add(part);
    outline.setTarget(a);
    expect([outlined(a), outlined(part), outlined(b)]).toEqual([true, true, false]);
    outline.setTarget(b);
    expect([outlined(a), outlined(part), outlined(b)]).toEqual([false, false, true]);
  });

  it('lets go of a part that left the target while it was outlined', () => {
    // The paper plane: hovered on the table, clicked, and its sheet flies off
    // into the room before the outline moves on.
    const outline = new HoverOutline(null);
    const [scene, plane, sheet, lamp] = [new THREE.Scene(), new THREE.Group(), new THREE.Mesh(), new THREE.Group()];
    plane.add(sheet);
    scene.add(plane, lamp);
    outline.setTarget(plane);
    scene.attach(sheet);
    outline.setTarget(null);
    plane.add(sheet); // back on the table
    outline.setTarget(lamp);
    expect(outlined(sheet)).toBe(false);
    expect(outlined(lamp)).toBe(true);
  });
});
