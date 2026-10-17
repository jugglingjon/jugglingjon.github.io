import { toPixels } from '../camera/framing.js';

// Debug overlay: where the TV screen sits on the page, and the remote area,
// the centred square where the pointer works the remote (outside it, you look
// around).
export function createScreenRectOverlay() {
  const el = document.createElement('div');
  el.className = 'screen-rect';
  el.setAttribute('aria-hidden', 'true');
  el.hidden = true;
  el.innerHTML = `
    <div class="screen-rect__zone"><span>remote area</span></div>
    <div class="screen-rect__screen"><span>screen</span></div>
  `;
  const [zoneEl, screenEl] = el.children;
  const place = (node, left, top, width, height) => {
    Object.assign(node.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  };

  return {
    el,
    update(rect, width, height, area) {
      el.hidden = !rect;
      if (!rect) return;
      const px = toPixels(rect, width, height);
      const w = px.right - px.left;
      const h = px.bottom - px.top;
      place(screenEl, px.left, px.top, w, h);
      place(zoneEl, area.left, area.top, area.side, area.side);
    },
    hide() {
      el.hidden = true;
    },
  };
}
