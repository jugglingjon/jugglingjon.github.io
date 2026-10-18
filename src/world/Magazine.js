import * as THREE from 'three';
import { createMagazineTexture } from './textures.js';
import { PAGE, drawListings, drawWelcome, rowAt } from './listings.js';

// The listings magazine on top of the coffee-table stack. Click it and it lifts
// off the table into your hands, the cover swings open, and tonight's listings
// face you; pick a show to tune the set to it. Built in its own space: x
// across the cover, y up out of it, z down the page (−z is the top edge).

export const MAGAZINE_SIZE = { width: 0.135, length: 0.19, block: 0.0032, cover: 0.0008 };

// Seconds for the whole open (or close), and how it splits: lifting to you
// takes the first `fly` of it, the cover swings over from `flipStart`.
const TIMING = { duration: 1, fly: 0.65, flipStart: 0.45, flip: 0.5 };
const READ = { fill: 0.72, drop: 0.012, tilt: 0.12 }; // share of the view's height, a touch low, top tipped back

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Magazine space → camera space when held up to read: page facing you (+y to
// +z), top edge up (−z to +y), x still across.
const HOLD = new THREE.Quaternion()
  .setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -READ.tilt));

const pageCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE.width;
  canvas.height = PAGE.height;
  return canvas;
};

export class ListingsMagazine {
  constructor() {
    const { width, length, block, cover } = MAGAZINE_SIZE;
    this.group = new THREE.Group();

    const paper = new THREE.MeshStandardMaterial({ color: '#e8e0cc', roughness: 0.9 });
    const backCover = new THREE.MeshStandardMaterial({ color: '#d4cbb5', roughness: 0.6 });
    const front = new THREE.MeshStandardMaterial({ map: createMagazineTexture(), roughness: 0.6 });

    this.rightCanvas = pageCanvas();
    this.rightTexture = new THREE.CanvasTexture(this.rightCanvas);
    this.leftCanvas = pageCanvas();
    this.leftTexture = new THREE.CanvasTexture(this.leftCanvas);
    // The inside of the cover faces down when closed; after the 180° swing it
    // reads upside down unless the texture is turned round.
    this.leftTexture.center.set(0.5, 0.5);
    this.leftTexture.rotation = Math.PI;
    for (const texture of [this.rightTexture, this.leftTexture]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    }
    const rightPage = new THREE.MeshStandardMaterial({ map: this.rightTexture, roughness: 0.85 });
    const leftPage = new THREE.MeshStandardMaterial({ map: this.leftTexture, roughness: 0.85 });

    // The pages (top face: tonight's listings) and the cover, hinged at the spine.
    this.block = new THREE.Mesh(new THREE.BoxGeometry(width, block, length), [paper, paper, rightPage, backCover, paper, paper]);
    this.block.position.y = block / 2;
    this.hinge = new THREE.Group();
    this.hinge.position.set(-width / 2, block, 0);
    this.leaf = new THREE.Mesh(new THREE.BoxGeometry(width, cover, length), [paper, paper, front, leftPage, paper, paper]);
    this.leaf.position.set(width / 2, cover / 2, 0);
    this.hinge.add(this.leaf);
    this.group.add(this.block, this.hinge);
    for (const mesh of [this.block, this.leaf]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    this.spine = new THREE.Vector3(-width / 2, block, 0); // the middle of the open spread

    // A soft light from your side while you read, so the pages aren't in shadow.
    this.light = new THREE.PointLight('#ffe6c4', 0, 0.8, 2);
    this.light.position.set(-width / 2, 0.25, 0);
    this.group.add(this.light);

    this.lineup = [];
    this.current = null;
    this.hover = -1;
    this.openness = 0; // 0 on the table … 1 open in your hands
    this.target = 0;
    this.home = null; // where it lies on the table, while it's away
    this.raycaster = new THREE.Raycaster();
    this.tablePosition = new THREE.Vector3();
    this.tableQuaternion = new THREE.Quaternion();
    this.readPosition = new THREE.Vector3();
    this.readQuaternion = new THREE.Quaternion();
    this.offset = new THREE.Vector3();
  }

  get isOpen() {
    return this.target === 1;
  }

  // Lying on the table, ready to be picked up.
  get atRest() {
    return this.target === 0 && this.openness === 0;
  }

  // What the listings show: [{ number, name, source }] and the channel on now.
  setListings(lineup, current) {
    this.lineup = lineup;
    this.current = current;
    this.redraw();
  }

  redraw() {
    drawWelcome(this.leftCanvas.getContext('2d'));
    drawListings(this.rightCanvas.getContext('2d'), { lineup: this.lineup, current: this.current, hover: this.hover });
    this.leftTexture.needsUpdate = true;
    this.rightTexture.needsUpdate = true;
  }

  // Pick it up off the table (it leaves the stack for `scene` while it's away).
  open(scene) {
    if (this.isOpen) return;
    if (!this.home) {
      this.home = { parent: this.group.parent, position: this.group.position.clone(), quaternion: this.group.quaternion.clone() };
      this.group.getWorldPosition(this.tablePosition);
      this.group.getWorldQuaternion(this.tableQuaternion);
      scene.attach(this.group);
    }
    this.target = 1;
  }

  // Put it back down.
  close() {
    this.target = 0;
    this.setHover(-1);
  }

  setHover(row) {
    if (row === this.hover) return;
    this.hover = row;
    this.redraw();
  }

  aimRay(pointer, camera) {
    this.raycaster.setFromCamera(pointer, camera);
    return this.raycaster;
  }

  // Which listing a pointer (NDC) is over once it's open, or −1.
  rowAtPointer(pointer, camera) {
    if (this.openness < 1) return -1;
    const hit = this.aimRay(pointer, camera).intersectObject(this.block, false)[0];
    if (!hit || !hit.uv || hit.face.normal.y < 0.5) return -1;
    return rowAt(hit.uv.y, this.lineup.length);
  }

  // Whether a pointer (NDC) is over the magazine at all.
  isUnder(pointer, camera) {
    return this.aimRay(pointer, camera).intersectObjects([this.block, this.leaf], false).length > 0;
  }

  // Ease towards open or shut; while it's away from the table, hold it up in
  // front of `camera`, sized to fill most of the view whatever the zoom.
  update(dt, camera) {
    if (this.openness === this.target && this.atRest) return;
    if (this.openness !== this.target) {
      const step = dt / TIMING.duration;
      this.openness = this.target > this.openness ? Math.min(1, this.openness + step) : Math.max(0, this.openness - step);
    }
    const fly = ease(clamp01(this.openness / TIMING.fly));
    this.hinge.rotation.z = ease(clamp01((this.openness - TIMING.flipStart) / TIMING.flip)) * Math.PI;
    this.light.intensity = fly * 0.03;

    const distance = MAGAZINE_SIZE.length / READ.fill / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    this.readQuaternion.copy(camera.quaternion).multiply(HOLD);
    this.offset.copy(this.spine).applyQuaternion(this.readQuaternion);
    this.readPosition.set(0, -READ.drop, -distance).applyQuaternion(camera.quaternion).add(camera.position).sub(this.offset);
    this.group.position.lerpVectors(this.tablePosition, this.readPosition, fly);
    this.group.quaternion.slerpQuaternions(this.tableQuaternion, this.readQuaternion, fly);
    this.group.updateMatrixWorld(true); // so picking a listing this frame sees where it is now

    if (this.atRest && this.home) {
      // Back on the table: rejoin the stack exactly where it was.
      this.home.parent.attach(this.group);
      this.group.position.copy(this.home.position);
      this.group.quaternion.copy(this.home.quaternion);
      this.home = null;
    }
  }
}
