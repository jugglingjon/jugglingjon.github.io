// Where the pointer is on the page decides what it does. In the remote area,
// a centred square `size` of the viewport height (no wider than the viewport),
// it works your thumb; outside it, the arm drops away and you look around.

export function remoteArea(width, height, size) {
  const side = Math.min(height * size, width);
  return { left: (width - side) / 2, top: (height - side) / 2, side };
}

// Past an edge of the square: how far towards that screen edge, 0 at the
// square, 1 at the edge of the screen, signed; 0 between the square's edges.
function beyond(p, start, end, extent) {
  if (p < start) return start > 0 ? -(start - p) / start : 0;
  if (p > end) return extent > end ? (p - end) / (extent - end) : 0;
  return 0;
}

const clamp = (n) => Math.max(-1, Math.min(1, n)) || 0; // || 0: no −0

// A pointer in page pixels → whether it's in the remote area, where in it
// (u, v: −1…1 across the square, y up), and how far it reaches towards each
// screen edge outside it (lookX, lookY: −1…1, y up; 0 inside).
export function locatePointer(x, y, width, height, size) {
  const { left, top, side } = remoteArea(width, height, size);
  const right = left + side;
  const bottom = top + side;
  return {
    inside: x >= left && x <= right && y >= top && y <= bottom,
    u: clamp(((x - left) / side) * 2 - 1),
    v: clamp(1 - ((y - top) / side) * 2),
    lookX: clamp(beyond(x, left, right, width)),
    lookY: clamp(-beyond(y, top, bottom, height)),
  };
}
