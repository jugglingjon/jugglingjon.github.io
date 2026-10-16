// A clickable stand-in for the remote until the 3D arm and remote arrive in
// Phase 4. It drives the same Remote object the 3D one will.

const REPEATING = /^(ch|vol)[+-]$/;

function key(button, label, { modifier = '', aria = label } = {}) {
  const cls = modifier ? `remote__btn remote__btn--${modifier}` : 'remote__btn';
  return `<button type="button" class="${cls}" data-button="${button}" aria-label="${aria}">${label}</button>`;
}

export function createRemotePad(remote) {
  const el = document.createElement('div');
  el.className = 'remote';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'TV remote');
  el.innerHTML = `
    <div class="remote__head">
      <span class="remote__led" aria-hidden="true"></span>
      ${key('power', 'POWER', { modifier: 'power', aria: 'Power' })}
    </div>
    <div class="remote__pad">
      ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => key(n, n)).join('')}
      ${key('recall', 'RCL', { modifier: 'small', aria: 'Recall previous channel' })}
      ${key('0', '0')}
      ${key('mute', 'MUTE', { modifier: 'small', aria: 'Mute' })}
    </div>
    <div class="remote__rockers">
      <div class="remote__rocker">
        ${key('vol+', '+', { aria: 'Volume up' })}<span aria-hidden="true">VOL</span>${key('vol-', '−', { aria: 'Volume down' })}
      </div>
      <div class="remote__rocker">
        ${key('ch+', '▲', { aria: 'Channel up' })}<span aria-hidden="true">CH</span>${key('ch-', '▼', { aria: 'Channel down' })}
      </div>
    </div>
    <p class="remote__brand" aria-hidden="true">LUMATRON</p>
  `;

  // Channel and volume repeat while held, like a real IR remote.
  let repeat = null;
  let held = null;
  const release = () => {
    clearTimeout(repeat);
    clearInterval(repeat);
    held?.classList.remove('is-held');
    repeat = held = null;
  };

  el.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('[data-button]');
    if (!btn || e.button > 0) return;
    e.preventDefault();
    release();
    held = btn;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('is-held');
    const { button } = btn.dataset;
    remote.press(button);
    if (REPEATING.test(button)) {
      repeat = setTimeout(() => {
        repeat = setInterval(() => remote.press(button), 150);
      }, 450);
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, release);

  // Keyboard activation (Enter/Space on a focused button) arrives as a click with no pointer.
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-button]');
    if (btn && e.detail === 0) remote.press(btn.dataset.button);
  });

  let blink = null;
  remote.addEventListener('press', () => {
    el.classList.add('is-sending');
    clearTimeout(blink);
    blink = setTimeout(() => el.classList.remove('is-sending'), 90);
  });

  return el;
}
