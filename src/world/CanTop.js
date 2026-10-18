import * as THREE from 'three';

// The top of the soda can, redone so it can open. The model's own tab is only
// painted into its normal map, so a plain lid covers it, with a real pull tab
// on a rivet and the mouth it opens. Built on the can's axis at the lid's
// height (just under the rim); the tab's ring points along +x, its nose (and
// the mouth) along −x.

export const LID = { height: 0.1196, radius: 0.0252 };
// The point on the ring a fingertip lifts, in the tab's own space.
const RING = new THREE.Vector3(0.0138, 0.0006, 0);

const metal = () => new THREE.MeshStandardMaterial({ color: '#c3c5cb', metalness: 0.85, roughness: 0.32 });

function tabShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.0035, 0.0042);
  shape.absarc(-0.0035, 0, 0.0042, Math.PI / 2, (Math.PI * 3) / 2, false); // round the nose
  shape.lineTo(0.0095, -0.0055);
  shape.absarc(0.0095, 0, 0.0055, -Math.PI / 2, Math.PI / 2, false); // round the ring end
  shape.lineTo(-0.0035, 0.0042);
  const ring = new THREE.Path();
  ring.absellipse(0.0094, 0, 0.0037, 0.0029, 0, Math.PI * 2, true);
  shape.holes.push(ring);
  return shape;
}

export class CanTop {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.y = LID.height;

    const lid = new THREE.Mesh(new THREE.CircleGeometry(LID.radius, 48), metal());
    lid.rotation.x = -Math.PI / 2;
    lid.receiveShadow = true;

    // The tab levers up about the rivet: rotating about z lifts the ring end.
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.0003;
    const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape(), { depth: 0.0005, bevelEnabled: false, curveSegments: 12 }), metal());
    tab.rotation.x = -Math.PI / 2;
    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0018, 0.0009, 16), metal());
    rivet.position.y = 0.0004;
    this.pivot.add(tab, rivet);

    // The mouth, dark inside, once the tab has pushed it in.
    this.mouth = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: '#120d0a', roughness: 0.5 }));
    this.mouth.rotation.x = -Math.PI / 2;
    this.mouth.position.set(-0.0128, 0.0001, 0);
    this.mouth.scale.set(0.0062, 0.0047, 1);
    this.mouth.visible = false;

    this.group.add(lid, this.pivot, this.mouth);
    this.opened = false;
  }

  // How far the tab is levered up (radians).
  setTab(angle) {
    this.pivot.rotation.z = angle;
  }

  setOpen(open) {
    this.opened = open;
    this.mouth.visible = open;
  }

  // Where a fingertip lifts the ring, in world space: as the tab is now, or
  // (`lying`) where it is when the tab lies flat.
  ring(out, lying = false) {
    if (lying) return this.group.localToWorld(out.copy(RING).add(this.pivot.position));
    return this.pivot.localToWorld(out.copy(RING));
  }
}
