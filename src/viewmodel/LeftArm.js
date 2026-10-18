import * as THREE from 'three';
import { Sleeve, FOREARM } from './Sleeve.js';
import { solveTwoBone } from './thumbing.js';

// Your left arm, which only comes into view to pick up the can. The hand
// (CanHand) goes wherever `hand.group` is put; the arm follows from your left
// shoulder, the elbow dropping out to the side. If the hand is further than
// the arm reaches, the upper arm (mostly out of view) stretches to make up
// the difference rather than leaving the hand behind.

const SHOULDER = new THREE.Vector3(-0.17, -0.22, 0.06); // camera space
const ELBOW_POLE = new THREE.Vector3(-0.55, -0.6, -0.1);
const UPPER_ARM = 0.3;

const across = new THREE.Vector3();
const upArm = new THREE.Vector3();
const out = new THREE.Vector3();
const basis = new THREE.Matrix4();
const handTurn = new THREE.Quaternion();

export class LeftArm {
  constructor(hand) {
    this.hand = hand;
    this.root = new THREE.Group();
    this.sleeve = new Sleeve(hand.skin);
    this.root.add(hand.group, this.sleeve.group);
    this.root.visible = false;
    this.frame = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), halfWidth: 0, halfThickness: 0, cuffAt: 0 };
    this.shoulder = new THREE.Vector3();
    this.pole = new THREE.Vector3();
    this.elbow = new THREE.Vector3();
    this.reached = new THREE.Vector3();
  }

  update(camera) {
    if (!this.root.visible) return;
    const { hand, frame } = this;
    hand.group.updateMatrixWorld(true);
    hand.forearm(frame);
    frame.position.applyMatrix4(hand.group.matrixWorld);
    frame.quaternion.premultiply(hand.group.getWorldQuaternion(handTurn));

    // The elbow, between the wrist and the shoulder.
    this.shoulder.copy(SHOULDER).applyMatrix4(camera.matrixWorld);
    this.pole.copy(ELBOW_POLE).applyMatrix4(camera.matrixWorld);
    const upper = Math.max(UPPER_ARM, frame.position.distanceTo(this.shoulder) - FOREARM * 0.92);
    solveTwoBone(this.shoulder, frame.position, upper, FOREARM, this.pole, this.elbow, this.reached);

    // The forearm runs from the wrist to it, turned about its length to match the wrist.
    upArm.subVectors(this.elbow, frame.position).normalize();
    across.set(1, 0, 0).applyQuaternion(frame.quaternion);
    across.addScaledVector(upArm, -across.dot(upArm)).normalize();
    out.crossVectors(across, upArm);
    frame.quaternion.setFromRotationMatrix(basis.makeBasis(across, upArm, out));
    this.sleeve.pose(frame, this.shoulder);
  }
}
