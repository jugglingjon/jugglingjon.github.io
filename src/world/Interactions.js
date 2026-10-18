import * as THREE from 'three';

// Hidden things (and things inside hidden groups) don't block the ray.
function shown(object) {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

// Things in the room you can click: the lamp, the listings magazine, and so
// on. A ray from the pointer finds the first visible surface it hits (so you
// can't click through the furniture); if that belongs to something registered
// here, it's what you're pointing at.
export class Interactions {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.items = [];
    this.occluders = [];
    this.pointer = new THREE.Vector2();
    this.active = false;
    this.hovered = null;
  }

  // Register `object` (and everything in it) as clickable. `enabled` can turn
  // it off for a while (the magazine, say, while it's in your hands).
  add(object, { name, onClick, enabled = () => true }) {
    const item = { object, name, onClick, enabled };
    object.userData.interactive = item;
    this.items.push(item);
    return item;
  }

  // Every mesh under `root` can block the ray, apart from the `skip` subtrees
  // (your arm, which is out of view whenever you're pointing at the room).
  setOccluders(root, skip = []) {
    this.occluders = [];
    const visit = (object) => {
      if (skip.includes(object)) return;
      if (object.isMesh) this.occluders.push(object);
      object.children.forEach(visit);
    };
    visit(root);
  }

  // Pointer in NDC (−1…1, y up), or none (it's over the remote, or gone).
  setPointer(x, y) {
    this.pointer.set(x, y);
    this.active = true;
  }

  clearPointer() {
    this.active = false;
    this.hovered = null;
  }

  // What's under the pointer, seen from `camera`, or null.
  pick(camera) {
    if (!this.active) return null;
    this.raycaster.setFromCamera(this.pointer, camera);
    const hit = this.raycaster.intersectObjects(this.occluders, false).find((h) => shown(h.object));
    for (let object = hit?.object; object; object = object.parent) {
      const item = object.userData.interactive;
      if (item) return item.enabled() ? item : null;
    }
    return null;
  }

  update(camera) {
    this.hovered = this.pick(camera);
    return this.hovered;
  }
}
