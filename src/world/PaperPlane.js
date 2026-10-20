import * as THREE from 'three';
import { dartFolds, foldSheet, layersAt, poseSheet, stageCount } from './paperFolds.js';
import { PAGE, drawResume, layoutResume, linkAt } from './resumePage.js';

// A paper plane on the coffee table, folded from your résumé, printed side in.
// Click it and it comes up to you, still folded and lying the way it did on
// the table, then unfolds as it turns to face you, showing the page; click a
// link on it to follow it. Click off it and it folds itself back up and lands
// where it was.

export const SHEET = { width: 0.2159, height: 0.2794 }; // US letter, in metres

// Seconds: up to you, still folded; a moment held there; then unfolding as it
// turns to face you. Putting it back runs it all backwards, without the moment.
const TIMING = { lift: 0.75, hold: 0.35, unfold: 1.6 };
const TOTAL = TIMING.lift + TIMING.hold + TIMING.unfold;
// The share of the view the page fills; how much farther off the folded plane
// is held; how high it arcs on its way up; its reading light.
const READ = { fill: 0.9, hold: 1.35, arc: 0.07, glow: 0.5 };
export const READ_ZOOM = 3; // how much closer a pinch can bring the page (on a phone, its type's tiny)
const LAYER = 0.00004; // metres between stacked layers of paper

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

export class PaperPlane {
  // `lean`: the wingtip it rests on, 'right' or 'left' as you'd see it from
  // behind, looking along its nose. Lean it towards the viewer, so its wings
  // face them and it reads as a plane.
  constructor({ lean = 'right' } = {}) {
    this.folded = foldSheet({ ...SHEET, steps: dartFolds(SHEET.width, SHEET.height) });
    this.stages = stageCount(this.folded); // folds made one after another (mirrored pairs together)

    this.canvas = document.createElement('canvas');
    this.canvas.width = PAGE.width;
    this.canvas.height = PAGE.height;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;

    // One triangle fan per facet, its corners where they lie on the flat
    // sheet: first everything the last stage (the wings) leaves alone, then
    // the wings.
    this.wingStage = this.stages - 1;
    const isWing = (facet) => this.folded.steps.some((step, k) => (step.stage ?? k) === this.wingStage && facet.moves[k]);
    const corners = [];
    for (const facet of [...this.folded.facets.filter((f) => !isWing(f)), ...this.folded.facets.filter(isWing)]) {
      for (let i = 1; i < facet.poly.length - 1; i++) corners.push([facet, facet.poly[0]], [facet, facet.poly[i]], [facet, facet.poly[i + 1]]);
    }
    this.corners = corners.map(([facet, point]) => [this.folded.facets.indexOf(facet), point]);
    const wingsFrom = corners.findIndex(([facet]) => isWing(facet));
    const uv = new Float32Array(corners.length * 2);
    this.corners.forEach(([, [x, y]], i) => uv.set([x / SHEET.width + 0.5, y / SHEET.height + 0.5], i * 2));
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(corners.length * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geometry.addGroup(0, wingsFrom, 0);
    this.geometry.addGroup(wingsFrom, corners.length - wingsFrom, 1);

    // Printed on the front, plain on the back. While it's held up to read, the
    // page lights up a little, so the type reads whatever the room's lighting.
    // Folded print side in, the page is all inside the plane but for the tops
    // of the wings (as in a real dart): they show plain paper while they're
    // folded out, and the print once they're back against the closed halves,
    // where it can't be seen changing.
    this.printed = new THREE.MeshStandardMaterial({ map: this.texture, emissiveMap: this.texture, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.9 });
    this.plain = new THREE.MeshStandardMaterial({ color: '#ebe6d8', roughness: 0.95 });
    this.front = new THREE.Mesh(this.geometry, [this.printed, this.plain]);
    this.back = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({ color: '#ebe6d8', roughness: 0.95, side: THREE.BackSide }));
    this.front.castShadow = true;
    this.front.receiveShadow = true;
    this.back.receiveShadow = true;

    // A highlighter swipe over the link you're pointing at: it tints the
    // paper and leaves the ink as dark as it was.
    this.highlight = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#ffe55a', blending: THREE.MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false }),
    );
    this.highlight.visible = false;

    this.sheet = new THREE.Group();
    this.sheet.add(this.front, this.back, this.highlight);
    this.group = new THREE.Group(); // where it lies on the table (set by the room)
    this.group.add(this.sheet);

    this.progress = -1; // how far folded: 0 flat … `stages` a plane
    this.setFold(this.stages);
    this.rest = this.restingPose(lean);
    this.sheet.position.copy(this.rest.position);
    this.sheet.quaternion.copy(this.rest.quaternion);

    this.laid = null;
    this.hover = null; // the link you're pointing at
    this.openness = 0; // 0 a plane on the table … 1 a page in front of you
    this.target = 0;
    this.away = false; // off the table, in the room's own space
    this.reducedMotion = false;
    this.onCrease = null; // called each time a fold is made or undone
    this.raycaster = new THREE.Raycaster();
    this.tablePosition = new THREE.Vector3();
    this.tableQuaternion = new THREE.Quaternion();
    this.readPosition = new THREE.Vector3();
    this.holdPosition = new THREE.Vector3();
    this.holdQuaternion = new THREE.Quaternion();
    this.held = new THREE.Quaternion(); // how it lay on the table, as you saw it
    this.zoom = 1; // brought this much closer to read (pinched, on a touch screen)
    this.pan = new THREE.Vector2(); // the point on the page (sheet space) in the middle of the view, zoomed in
    this.view = { halfWidth: 1, halfHeight: 1 }; // how much of the page's plane the view takes in, held up
  }

  get isOpen() {
    return this.target === 1;
  }

  // Lying on the table, ready to be picked up.
  get atRest() {
    return this.target === 0 && this.openness === 0;
  }

  // The résumé to type on it (content/resume.js), with content/projects.js for its selected work.
  setResume(resume, projects) {
    this.resume = resume;
    this.projects = projects;
    this.redraw();
  }

  // Type it again (once its typewriter font has arrived, say).
  redraw() {
    if (!this.resume) return;
    const ctx = this.canvas.getContext('2d');
    this.laid = layoutResume(this.resume, { projects: this.projects, measure: (text, size) => {
      ctx.font = `${size}px "Courier Prime", "Courier New", monospace`;
      return ctx.measureText(text).width;
    } });
    drawResume(ctx, this.laid, { creases: this.folded.creases, sheet: SHEET, draft: this.resume.placeholder });
    this.texture.needsUpdate = true;
  }

  // Fold it to `progress` (0 flat … stages), telling onCrease as each fold is made or undone.
  setFold(progress) {
    if (progress === this.progress) return;
    if (this.progress >= 0 && Math.floor(progress) !== Math.floor(this.progress)) this.onCrease?.();
    this.progress = progress;
    const matrices = poseSheet(this.folded, progress, this.matrices);
    this.matrices = matrices;
    const layers = layersAt(this.folded, progress);
    const position = this.geometry.attributes.position;
    const v = new THREE.Vector3();
    this.corners.forEach(([facet, [x, y]], i) => {
      v.set(x, y, layers[facet] * LAYER).applyMatrix4(matrices[facet]);
      position.setXYZ(i, v.x, v.y, v.z);
    });
    position.needsUpdate = true;
    this.front.material[1] = progress > this.wingStage ? this.plain : this.printed;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
  }

  // How the folded plane lies on the table, in the group's space: upright on
  // its keel, nose along −z, rolled over onto one wingtip, as a dart lands.
  restingPose(lean) {
    // Sheet → upright: x (keel to wings) up, y (the nose) along −z.
    const upright = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0)),
    );
    const points = [];
    const position = this.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(position, i));
    // Roll about the nose until the keel and a wingtip both touch the table.
    const nose = new THREE.Vector3(0, 0, -1);
    const side = lean === 'left' ? -1 : 1; // its right (+x, facing −z) down, or its left
    const lowest = (q, pick) => Math.min(...points.filter(pick).map((p) => p.clone().applyQuaternion(q).y));
    let best = { gap: Infinity, quaternion: upright };
    for (let roll = 0; roll <= 0.8; roll += 0.01) {
      const q = new THREE.Quaternion().setFromAxisAngle(nose, side * roll).multiply(upright);
      const gap = Math.abs(lowest(q, (p) => Math.abs(p.z) < 0.01) - lowest(q, (p) => side * p.z < -0.05)); // sheet z is −x, upright
      if (gap < best.gap) best = { gap, quaternion: q };
    }
    const box = new THREE.Box3().setFromPoints(points.map((p) => p.clone().applyQuaternion(best.quaternion)));
    const centre = box.getCenter(new THREE.Vector3());
    return { quaternion: best.quaternion, position: new THREE.Vector3(-centre.x, -box.min.y, -centre.z) };
  }

  // Pick it up off the table (it leaves the table for `scene` while it's
  // away), seen from `camera`.
  open(scene, camera) {
    if (this.isOpen) return;
    if (!this.away) {
      this.sheet.getWorldPosition(this.tablePosition);
      this.sheet.getWorldQuaternion(this.tableQuaternion);
      this.held.copy(camera.quaternion).invert().multiply(this.tableQuaternion);
      scene.attach(this.sheet);
      this.away = true;
    }
    this.target = 1;
  }

  // Fold it back up and put it down.
  close() {
    this.target = 0;
    this.setHover(null);
    this.setZoom(1);
  }

  // Bring the page closer (1, as held up, … READ_ZOOM), keeping the view on it.
  setZoom(zoom) {
    this.zoom = THREE.MathUtils.clamp(zoom, 1, READ_ZOOM);
    this.panBy(0, 0);
  }

  // Slide the page by a drag of (dx, dy) in NDC (the view's width or height is
  // 2), as far as its edges allow.
  panBy(dx, dy) {
    const { halfWidth, halfHeight } = this.view;
    const room = (half, page) => Math.max(0, page / 2 - half);
    this.pan.x = THREE.MathUtils.clamp(this.pan.x - dx * halfWidth, -room(halfWidth, SHEET.width), room(halfWidth, SHEET.width));
    this.pan.y = THREE.MathUtils.clamp(this.pan.y - dy * halfHeight, -room(halfHeight, SHEET.height), room(halfHeight, SHEET.height));
  }

  setHover(link) {
    if (link === this.hover) return;
    this.hover = link;
    this.highlight.visible = Boolean(link);
    if (!link) return;
    // Page pixels → sheet space, just above the paper.
    const sx = SHEET.width / PAGE.width;
    const sy = SHEET.height / PAGE.height;
    this.highlight.scale.set((link.w + 16) * sx, link.h * sy, 1);
    this.highlight.position.set((link.x + link.w / 2 - PAGE.width / 2) * sx, (PAGE.height / 2 - link.y - link.h / 2) * sy, 0.0008);
  }

  aimRay(pointer, camera) {
    this.raycaster.setFromCamera(pointer, camera);
    return this.raycaster;
  }

  // The link a pointer (NDC) is over once it's open, or null.
  linkAtPointer(pointer, camera) {
    if (this.openness < 1 || !this.laid) return null;
    const hit = this.aimRay(pointer, camera).intersectObject(this.front, false)[0];
    if (!hit?.uv) return null;
    return linkAt(this.laid, hit.uv.x * PAGE.width, (1 - hit.uv.y) * PAGE.height);
  }

  // Whether a pointer (NDC) is over the paper at all.
  isUnder(pointer, camera) {
    return this.aimRay(pointer, camera).intersectObjects([this.front, this.back], false).length > 0;
  }

  // Ease towards open or put away; while it's off the table, hold it up in
  // front of `camera`, the page filling most of the view whatever the zoom or
  // shape.
  update(dt, camera) {
    if (this.openness === this.target && !this.away) return;
    if (this.openness !== this.target) {
      const closing = this.target < this.openness;
      const step = dt * (this.reducedMotion ? 3 : 1);
      let t = this.openness * TOTAL;
      t = closing ? Math.max(0, t - step) : Math.min(TOTAL, t + step);
      if (closing && t > TIMING.lift && t < TIMING.lift + TIMING.hold) t = TIMING.lift; // no pause on the way back
      this.openness = t / TOTAL;
    }
    const t = this.openness * TOTAL;
    const lift = ease(clamp01(t / TIMING.lift));
    const unfold = clamp01((t - TIMING.lift - TIMING.hold) / TIMING.unfold);
    const turn = ease(unfold);
    this.setFold(this.stages * (1 - unfold));

    // Up from the table to be held, still lying as it did there, as you saw
    // it; then turned to face you as it opens out into the page.
    const tan = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = Math.max(SHEET.height / (READ.fill * tan), SHEET.width / (READ.fill * tan * camera.aspect));
    const near = distance / this.zoom;
    this.view.halfHeight = (near * tan) / 2;
    this.view.halfWidth = this.view.halfHeight * camera.aspect;
    this.panBy(0, 0); // still within the page's edges, as the view changes
    this.readPosition.set(-this.pan.x, -this.pan.y, -near).applyQuaternion(camera.quaternion).add(camera.position);
    this.holdPosition.set(0, 0, -distance * READ.hold).applyQuaternion(camera.quaternion).add(camera.position);
    this.holdQuaternion.copy(camera.quaternion).multiply(this.held);
    this.sheet.position.lerpVectors(this.tablePosition, this.holdPosition, lift).lerp(this.readPosition, turn);
    if (!this.reducedMotion) this.sheet.position.y += Math.sin(lift * Math.PI) * READ.arc;
    this.sheet.quaternion.slerpQuaternions(this.tableQuaternion, this.holdQuaternion, lift).slerp(camera.quaternion, turn);
    this.sheet.updateMatrixWorld(true); // so pointing at a link this frame sees where it is now
    this.printed.emissiveIntensity = turn * READ.glow;

    if (this.atRest) {
      // Back on the table, a plane again, exactly where it was.
      this.group.add(this.sheet);
      this.sheet.position.copy(this.rest.position);
      this.sheet.quaternion.copy(this.rest.quaternion);
      this.away = false;
    }
  }
}
