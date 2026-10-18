// Where the pointer is on the page decides what it does. In the remote area,
// a centred box `size` of the viewport height tall and `aspect` times that
// wide (no bigger than the viewport), it works your thumb; outside it, the arm
// drops away and you look around.

export function remoteArea(width, height, size, aspect = 1) {
  const tall = Math.min(height * size, width / aspect);
  const wide = tall * aspect;
  return { left: (width - wide) / 2, top: (height - tall) / 2, width: wide, height: tall };
}

// Past an edge of the box: how far towards that screen edge, 0 at the box,
// 1 at the edge of the screen, signed; 0 between the box's edges.
function beyond(p, start, end, extent) {
  if (p < start) return start > 0 ? -(start - p) / start : 0;
  if (p > end) return extent > end ? (p - end) / (extent - end) : 0;
  return 0;
}

const clamp = (n) => Math.max(-1, Math.min(1, n)) || 0; // || 0: no −0

// A pointer in page pixels → whether it's in the remote area, where in it
// (u, v: −1…1 across the box, y up), and how far it reaches towards each
// screen edge outside it (lookX, lookY: −1…1, y up; 0 inside).
export function locatePointer(x, y, width, height, size, aspect = 1) {
  const area = remoteArea(width, height, size, aspect);
  const right = area.left + area.width;
  const bottom = area.top + area.height;
  return {
    inside: x >= area.left && x <= right && y >= area.top && y <= bottom,
    u: clamp(((x - area.left) / area.width) * 2 - 1),
    v: clamp(1 - ((y - area.top) / area.height) * 2),
    lookX: clamp(beyond(x, area.left, right, width)),
    lookY: clamp(-beyond(y, area.top, bottom, height)),
  };
}
