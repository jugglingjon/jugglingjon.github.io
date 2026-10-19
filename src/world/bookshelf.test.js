import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createBookshelf, placeRadio, RADIO } from './bookshelf.js';

// The wood grain is painted on a canvas, which needs a browser.
vi.mock('./textures.js', async (original) => ({ ...(await original()), createWoodTexture: () => null, createDirtTexture: () => null }));

// A stand-in for the clock radio GLB: a box the model's shape (once its
// Sketchfab node is applied), off-centre, its clock face on +x, and fully
// metallic like the model's material.
function standIn() {
  const model = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ metalness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.93, 0.74, 2.11).translate(0.09, 0.0, -0.05), material);
  const face = new THREE.Object3D();
  face.position.set(1.055, 0, -0.05);
  body.add(face);
  model.add(body);
  model.scale.setScalar(3);
  return { model, body, face };
}

const boxOf = (object) => new THREE.Box3().setFromObject(object);

describe('placeRadio', () => {
  it('stands the radio on the middle shelf, right of the novels, its clock towards the couch', () => {
    const shelf = createBookshelf();
    const { model, body, face } = standIn();
    placeRadio(shelf, model);
    shelf.group.updateMatrixWorld(true);

    const radio = boxOf(model);
    expect(radio.max.y - radio.min.y).toBeCloseTo(RADIO.height, 6);
    expect(radio.min.y).toBeCloseTo(shelf.radio.position.y, 6); // standing on the shelf
    expect(body.material.metalness).toBe(0);

    // Clear of the books, the panda and the bookcase itself (the shelf it stands on aside).
    const inside = radio.clone().expandByScalar(-0.001);
    for (const child of shelf.group.children) {
      if (child === shelf.radio) continue;
      expect(boxOf(child).intersectsBox(inside)).toBe(false);
    }

    // The clock faces out of the bookcase (+z), turned a little to your left (−x).
    const centre = radio.getCenter(new THREE.Vector3());
    const facing = face.getWorldPosition(new THREE.Vector3()).sub(centre).setY(0).normalize();
    expect(facing.z).toBeGreaterThan(0.95);
    expect(facing.x).toBeLessThan(-0.1);
  });

  it('swaps one model for another', () => {
    const shelf = createBookshelf();
    placeRadio(shelf, standIn().model);
    const { model } = standIn();
    placeRadio(shelf, model);
    expect(shelf.radio.children).toEqual([model]);
  });
});
