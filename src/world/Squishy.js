// Something soft you can squeeze, like the stuffed panda: squeeze() presses
// it down, and it springs back up with a wobble. Squashing keeps its volume,
// so it bulges out as it goes down and slims as it overshoots up. It scales
// about its own origin, so build it sitting on y = 0.

export const SQUISH = { depth: 0.24, hold: 0.12, stiffness: 420, damping: 13 };

export class Squishy {
  constructor(object, settings = {}) {
    this.object = object;
    this.settings = { ...SQUISH, ...settings };
    this.squash = 0; // 0 at rest, + pressed down, − stretched up
    this.speed = 0;
    this.target = 0;
    this.holding = 0; // seconds left pressed in
    this.reducedMotion = false; // springs back without the wobble
  }

  squeeze() {
    this.target = this.settings.depth;
    this.holding = this.settings.hold;
  }

  get still() {
    return this.target === 0 && Math.abs(this.squash) < 1e-4 && Math.abs(this.speed) < 1e-3;
  }

  update(dt) {
    if (this.still) return;
    const { stiffness, damping } = this.settings;
    // Critically damped with reduced motion: straight back, no bounce.
    const drag = this.reducedMotion ? 2 * Math.sqrt(stiffness) : damping;
    this.holding -= dt;
    if (this.holding <= 0) this.target = 0;
    // Small steps keep the spring steady at any frame rate.
    const steps = Math.ceil(dt / (1 / 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.speed += (-stiffness * (this.squash - this.target) - drag * this.speed) * h;
      this.squash += this.speed * h;
    }
    if (this.still) this.squash = this.speed = 0;
    const tall = 1 - this.squash;
    const wide = 1 / Math.sqrt(tall);
    this.object.scale.set(wide, tall, wide);
  }
}
