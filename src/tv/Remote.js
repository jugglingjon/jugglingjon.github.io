import { gsap } from 'gsap';

export const BUTTONS = ['power', 'ch+', 'ch-', 'vol+', 'vol-', 'mute', 'recall', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// The handset. press() fires 'press' immediately, which is what the IR LED,
// the button click and (in Phase 4) the thumb animation listen for. The TV
// only hears the button after the infrared latency, like the real thing.
export class Remote extends EventTarget {
  constructor(television, { latency = 0.06 } = {}) {
    super();
    this.television = television;
    this.latency = latency;
  }

  press(button) {
    if (!BUTTONS.includes(button)) return;
    this.dispatchEvent(new CustomEvent('press', { detail: { button } }));
    gsap.delayedCall(this.latency, () => this.television.receive(button));
  }
}
