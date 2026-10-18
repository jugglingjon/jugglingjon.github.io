import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createPlant, PLANT_HEIGHT, replaceLeaves } from './props.js';

describe('createPlant', () => {
  it('stands built-in leaves on the soil until a model replaces them', () => {
    const plant = createPlant();
    expect(plant.leaves.children.length).toBe(9);

    // A stand-in model, like the GLB: a tall leaf rooted at its origin, scaled up in a node, a bit metallic.
    const model = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.026, 0.004).translate(0, 0.013, 0), new THREE.MeshStandardMaterial({ metalness: 0.4 }));
    leaf.scale.setScalar(100);
    model.add(leaf);
    replaceLeaves(plant, model);

    expect(plant.leaves.children).toEqual([model]);
    plant.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(plant.leaves);
    expect(box.max.y - box.min.y).toBeCloseTo(PLANT_HEIGHT, 5);
    expect(box.min.y).toBeCloseTo(plant.leaves.position.y, 5); // rooted in the soil
    expect(leaf.material.metalness).toBe(0);
    expect(leaf.castShadow && leaf.receiveShadow).toBe(true);
  });
});
