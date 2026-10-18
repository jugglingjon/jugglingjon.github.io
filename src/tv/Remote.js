import { gsap } from 'gsap';

// INFO isn't for the set: the app listens for it (the story behind the show).
export const BUTTONS = ['power', 'info', 'ch+', 'ch-', 'vol+', 'vol-', 'mute', 'recall', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Channel and volume repeat while held, like a real IR remote.
const REPEATING = /^(ch|vol)[+-]$/;

// The handset. press() fires 'press' immediately, which is what the IR LED,
// the button click and the 3D thumb listen for. The TV only hears the button
// after the infrared latency, like the real thing.
export class Remote extends EventTarget {
  constructor(television, { latency = 0.06 } = {}) {
    super();
    this.television = television;
    this.latency = latency;
    this.repeat = null;
  }

  press(button) {
    if (!BUTTONS.includes(button)) return;
    this.dispatchEvent(new CustomEvent('press', { detail: { button } }));
    gsap.delayedCall(this.latency, () => this.television.receive(button));
  }

  // Press and keep holding: channel and volume start repeating after a beat.
  hold(button) {
    this.release();
    this.press(button);
    if (!REPEATING.test(button)) return;
    this.repeat = setTimeout(() => {
      this.repeat = setInterval(() => this.press(button), 150);
    }, 450);
  }

  release() {
    clearTimeout(this.repeat);
    clearInterval(this.repeat);
    this.repeat = null;
  }
}
