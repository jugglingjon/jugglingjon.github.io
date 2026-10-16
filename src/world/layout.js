import * as THREE from 'three';

// Where everything is, in metres. The TV wall is at the back (−z), the couch
// faces it from +z, the window is on the right wall (+x). The room, the
// seated camera and the painted reflection map all read from here, so they
// can't disagree.

const v = (x, y, z) => new THREE.Vector3(x, y, z);

export const ROOM = { minX: -2.4, maxX: 2.2, minZ: -0.8, maxZ: 3.6, height: 2.45 };

export const STAND = { position: v(0, 0, 0), height: 0.5 };

// Seated eye height, a little forward of the couch back.
export const EYE = v(0.05, 1.1, 2.55);

export const COFFEE_TABLE = { position: v(0, 0, 1.3), width: 1.1, depth: 0.55, height: 0.42 };
export const COUCH = { position: v(0.05, 0, 2.95), width: 2.1, depth: 0.9 };
export const RUG = { position: v(0, 0, 1.45), width: 2.2, depth: 1.5 };

export const END_TABLE = { position: v(-1.02, 0, -0.38), height: 0.55 };
export const TABLE_LAMP = v(-1.02, 0.98, -0.38); // centre of the shade
export const FLOOR_LAMP = { position: v(-1.9, 0, 3.2), shade: v(-1.9, 1.5, 3.2) };

export const PRINT = { position: v(-1.02, 1.62, ROOM.minZ + 0.02), width: 0.6, height: 0.8 };
export const PLANT = v(1.45, 0, -0.42);

// Window in the right wall; a neon sign across the street shines in through the blinds.
export const WINDOW = { x: ROOM.maxX, z: 1.4, y: 1.35, width: 1.3, height: 1.1 };
export const NEON = { light: v(4.4, 2.5, 1.95), target: v(-1.2, 0.45, -0.3), sign: v(5.6, 2.4, 1.2) };

// Door in the left wall, left ajar onto a lit hallway.
export const DOOR = { x: ROOM.minX, z: 0.55, width: 0.82, height: 2.03 };
