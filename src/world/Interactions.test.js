import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Interactions } from './Interactions.js';

describe('Interactions', () => {
  // A lamp-like group straight ahead of the camera, and a wall you can slide in front of it.
  const setup = () => {
    const scene = new THREE.Scene();
    const lamp = new THREE.Group();
    const shade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4));
    lamp.add(shade);
    lamp.position.set(0, 0, -3);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.1));
    wall.position.set(0, 0, -1.5);
    wall.visible = false;
    scene.add(lamp, wall);
    scene.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    camera.updateMatrixWorld(true);
    const interactions = new Interactions();
    let clicks = 0;
    let enabled = true;
    interactions.add(lamp, { name: 'lamp', onClick: () => clicks++, enabled: () => enabled });
    return { scene, lamp, wall, camera, interactions, clicks: () => clicks, disable: () => (enabled = false) };
  };

  it('finds what the pointer is over, through its parts', () => {
    const { scene, lamp, camera, interactions, clicks } = setup();
    interactions.setOccluders(scene, []);
    interactions.setPointer(0, 0);
    const item = interactions.update(camera);
    expect(item?.object).toBe(lamp);
    item.onClick();
    expect(clicks()).toBe(1);
  });

  it('finds nothing off to the side, or with no pointer', () => {
    const { scene, camera, interactions } = setup();
    interactions.setOccluders(scene, []);
    interactions.setPointer(0.9, 0.9);
    expect(interactions.update(camera)).toBeNull();
    interactions.setPointer(0, 0);
    interactions.clearPointer();
    expect(interactions.update(camera)).toBeNull();
  });

  it("can't be clicked through something in front", () => {
    const { scene, wall, camera, interactions } = setup();
    wall.visible = true;
    interactions.setOccluders(scene, []);
    interactions.setPointer(0, 0);
    expect(interactions.update(camera)).toBeNull();
  });

  it('ignores skipped parts of the scene and disabled things', () => {
    const { scene, wall, camera, interactions, disable } = setup();
    interactions.setOccluders(scene, [wall]); // the wall no longer blocks
    interactions.setPointer(0, 0);
    expect(interactions.update(camera)).not.toBeNull();
    disable();
    expect(interactions.update(camera)).toBeNull();
  });
});
