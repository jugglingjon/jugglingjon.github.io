import { toPixels } from '../camera/framing.js';

// Debug overlay: where the TV screen sits on the page, and the wider "engage
// zone" around it where Phase 4 will raise the arm and remote.
export function createScreenRectOverlay({ zone = 0.25 } = {}) {
  const el = document.createElement('div');
  el.className = 'screen-rect';
  el.setAttribute('aria-hidden', 'true');
  el.hidden = true;
  el.innerHTML = `
    <div class="screen-rect__zone"><span>engage zone · Phase 4</span></div>
    <div class="screen-rect__screen"><span>screen</span></div>
  `;
  const [zoneEl, screenEl] = el.children;
  const place = (node, left, top, width, height) => {
    Object.assign(node.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  };

  return {
    el,
    update(rect, width, height) {
      el.hidden = !rect;
      if (!rect) return;
      const px = toPixels(rect, width, height);
      const w = px.right - px.left;
      const h = px.bottom - px.top;
      place(screenEl, px.left, px.top, w, h);
      place(zoneEl, px.left - w * zone, px.top - h * zone, w * (1 + zone * 2), h * (1 + zone * 2));
    },
    hide() {
      el.hidden = true;
    },
  };
}
