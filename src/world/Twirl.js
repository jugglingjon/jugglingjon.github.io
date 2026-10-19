import * as THREE from 'three';

// A little show for something standing on the floor, like the snake plant:
// it hops, spins a full turn on the spot, lands with a wobble that dies away,
// and is back exactly as it was. The object should stand on its origin.

export const TWIRL = {
  turn: 1.1, // seconds for the spin, easing out
  hop: 0.025, // metres up…
  air: 0.32, // …and seconds off the floor
  wobble: 0.085, // radians of tilt as it lands…
  rate: 15, // …rocking this fast (radians a second)…
  decay: 0.32, // …and dying away like this (seconds)
};
const SETTLED = 0.0008; // wobble this small has stopped
export const TWIRL_LENGTH = Math.max(TWIRL.turn, TWIRL.air + TWIRL.decay * Math.log(TWIRL.wobble / SETTLED));

const easeOut = (u) => 1 - (1 - u) ** 3;

// The pose `t` seconds in: the spin about its axis, the hop, and the tilt
// about the floor's x and z axes. `wobbly: false` spins it and nothing else.
export function twirlPose(t, { wobbly = true } = {}) {
  const spin = Math.PI * 2 * easeOut(Math.min(1, t / TWIRL.turn));
  if (!wobbly) return { spin, hop: 0, tiltX: 0, tiltZ: 0 };
  const hop = t < TWIRL.air ? TWIRL.hop * Math.sin((Math.PI * t) / TWIRL.air) : 0;
  const since = t - TWIRL.air;
  const sway = since > 0 ? TWIRL.wobble * Math.exp(-since / TWIRL.decay) : 0;
  // The tilt circles round as it dies away, like a settling coin.
  return { spin, hop, tiltX: sway * Math.sin(since * TWIRL.rate), tiltZ: sway * 0.6 * Math.cos(since * TWIRL.rate) };
}

const spun = new THREE.Quaternion();
const tilted = new THREE.Quaternion();
const euler = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

export class Twirl {
  constructor(object) {
    this.object = object;
    this.rest = { position: object.position.clone(), quaternion: object.quaternion.clone() };
    this.time = 0;
    this.active = false;
    this.landed = false;
    this.reducedMotion = false; // a spin, without the hop and the wobble
    this.onLand = () => {}; // as it comes down from the hop (for a sound)
  }

  // Start a twirl (one at a time).
  spin() {
    if (this.active) return false;
    this.rest.position.copy(this.object.position);
    this.rest.quaternion.copy(this.object.quaternion);
    this.active = true;
    this.time = 0;
    this.landed = this.reducedMotion; // no hop, no landing
    return true;
  }

  update(dt) {
    if (!this.active) return;
    this.time += dt;
    if (!this.landed && this.time >= TWIRL.air) {
      this.landed = true;
      this.onLand();
    }
    const { position, quaternion } = this.object;
    if (this.time >= TWIRL_LENGTH) {
      this.active = false;
      position.copy(this.rest.position);
      quaternion.copy(this.rest.quaternion);
      return;
    }
    const pose = twirlPose(this.time, { wobbly: !this.reducedMotion });
    position.copy(this.rest.position).y += pose.hop;
    // Tilt in the room's frame, spin about its own axis.
    tilted.setFromEuler(euler.set(pose.tiltX, 0, pose.tiltZ));
    quaternion.copy(tilted).multiply(spun.setFromAxisAngle(UP, pose.spin)).multiply(this.rest.quaternion);
  }
}
