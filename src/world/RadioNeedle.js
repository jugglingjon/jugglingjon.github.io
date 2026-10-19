import * as THREE from 'three';

// The red needle on the clock radio's tuning dial (painted out of the model's
// texture, so this one can move). Switched off, it stands at full height, as
// the needle. While the radio plays it bounces like one bar of a graphic
// equalizer: it kicks up at random, every tenth of a second or so, and drops
// back between kicks. It doesn't follow the music (the station is compressed
// so hard its level hardly moves); it just shows the radio's on. With reduced
// motion it drops to half height and stays there while it plays.

export const NEEDLE = {
  floor: 0.12, // the lowest it drops, as a share of its full height
  kick: [0.45, 1], // how high each kick sends it
  gap: [0.08, 0.24], // seconds between kicks
  rise: 0.015, // how fast it jumps to a kick (time constant, seconds)
  fall: 2.2, // how fast it drops between kicks (full heights a second)
  settle: 0.2, // how fast it goes back to full height when switched off (time constant)
};

export class RadioNeedle {
  // A bar `width` × `height`, standing up from its own origin, facing +z.
  constructor({ width, height, colour = '#901408' }, rand = Math.random) {
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0), new THREE.MeshBasicMaterial({ color: colour }));
    this.rand = rand;
    this.reducedMotion = false;
    this.level = 1; // its height, as a share of its full height
    this.kick = 0; // where the last kick is sending it (0 once it's got there)
    this.wait = 0; // until the next kick
  }

  update(dt, playing) {
    const n = NEEDLE;
    if (!playing || this.reducedMotion) {
      this.level += ((playing ? 0.5 : 1) - this.level) * (1 - Math.exp(-dt / n.settle));
      this.kick = this.wait = 0;
    } else {
      this.wait -= dt;
      if (this.wait <= 0) {
        this.kick = n.kick[0] + (n.kick[1] - n.kick[0]) * this.rand();
        this.wait = n.gap[0] + (n.gap[1] - n.gap[0]) * this.rand();
      }
      if (this.kick > this.level) {
        this.level += (this.kick - this.level) * (1 - Math.exp(-dt / n.rise));
        if (this.kick - this.level < 0.01) this.kick = 0;
      } else {
        this.kick = 0;
        this.level = Math.max(n.floor, this.level - n.fall * dt);
      }
    }
    this.mesh.scale.y = Math.max(this.level, 1e-3);
  }
}
