import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CAN, createPlant, fitModel, PLANT_HEIGHT, replaceCan, replaceLeaves } from './props.js';

// The soil's texture is painted on a canvas, which needs a browser.
vi.mock('./textures.js', async (original) => ({ ...(await original()), createDirtTexture: () => null }));

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

describe('fitModel', () => {
  // Like the soda can GLB: off-centre, below its origin, and scaled in a node.
  const tallBox = () => {
    const model = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2).translate(0.5, -0.2, -0.4), new THREE.MeshStandardMaterial());
    mesh.scale.set(2.3, 2.9, 2.3);
    model.add(mesh);
    return { model, mesh };
  };

  it('stands a model on the origin at the height asked for', () => {
    const { model, mesh } = tallBox();
    fitModel(model, CAN.height);
    const box = new THREE.Box3().setFromObject(model);
    expect(box.max.y - box.min.y).toBeCloseTo(CAN.height, 6);
    expect(box.min.y).toBeCloseTo(0, 6);
    const centre = box.getCenter(new THREE.Vector3());
    expect(centre.x).toBeCloseTo(0, 6);
    expect(centre.z).toBeCloseTo(0, 6);
    expect(mesh.castShadow && mesh.receiveShadow).toBe(true);
  });

  it('swaps the can for a model the same size, keeping its place', () => {
    const can = { group: new THREE.Group() }; // the built-in can paints its label on a canvas, which needs a browser
    can.group.add(new THREE.Mesh(new THREE.CylinderGeometry(CAN.radius, CAN.radius, CAN.height)));
    can.group.position.set(1, 0.4, 2);
    const { model } = tallBox();
    replaceCan(can, model, 0.5);
    can.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(can.group);
    expect(box.min.y).toBeCloseTo(0.4, 6);
    expect(box.max.y - box.min.y).toBeCloseTo(CAN.height, 6);
    expect(can.group.children[0].rotation.y).toBe(0.5);
  });
});
