import * as THREE from 'three';
import { DustMotes } from './atmosphere.js';
import {
  createCoffeeTable,
  createCouch,
  createEndTable,
  createFloorLamp,
  createTableLamp,
  createTVStand,
  place,
} from './furniture.js';
import { createBeerCan, createMagazines, createPlant, createPrint, replaceCan, replaceLeaves } from './props.js';
import { PaperPlane } from './PaperPlane.js';
import { createBookshelf, placeRadio } from './bookshelf.js';
import { Squishy } from './Squishy.js';
import { Twirl } from './Twirl.js';
import { createCarpetTexture, createCeilingTexture, createPanelingTexture, createRugTexture, createWallpaperTexture } from './textures.js';
import { createWindow, neonFlicker } from './windowView.js';
import { BOOKSHELF_AT, COFFEE_TABLE, COUCH, DOOR, END_TABLE, EYE, FLOOR_LAMP, NEON, PLANT, PRINT, ROOM, RUG, STAND, TABLE_LAMP, WINDOW } from './layout.js';

// The table lamp's switch, 0 (off) … 1 (on), `t` seconds after it was flicked:
// coming on, the bulb catches with a quick stutter; going off, the filament
// fades in a moment.
export function lampLevel(on, t) {
  if (on) {
    if (t >= 0.2) return 1;
    const ramp = THREE.MathUtils.smoothstep(t, 0, 0.14);
    return t > 0.05 && t < 0.085 ? ramp * 0.35 : ramp;
  }
  return Math.max(0, 1 - t / 0.12) ** 2;
}

// How far the can model turns on the table, so its logo faces the couch, and
// where its tab points: the ring to your right and a little away (where your
// right thumb gets at it), so the mouth faces you and your left.
const CAN_TURN = 0.3;
const TAB_TURN = 0.5;

export const ROOM_DEFAULTS = {
  lamps: true,
  lampLevel: 1,
  neon: 1,
  flicker: false, // the sign's buzz and stutter (Room → Neon flicker)
  bookshelf: true, // the bookcase right of the TV, with the lava lamp (off leaves the corner empty)
  lavaLight: 0.45, // how much the lava lamp lights its corner
  radioLight: 0.03, // the clock radio's faint glow on its shelf
  blinds: -0.9, // slats tipped down into the room, letting the street light in
  dust: 1,
  dustSize: 1,
  tableReflectivity: 0, // 0 = dull oiled wood, 1 = glassy lacquer
  tableGloss: 1, // how sharp the reflections are
  rain: true,
};

// A wall panel in wall-local space (x along the wall, y up, facing +z) with
// UVs in metres ÷ tile, so patterns keep one size and line up across panels.
function panel(material, a0, a1, b0, b1, tile) {
  const geometry = new THREE.PlaneGeometry(a1 - a0, b1 - b0);
  geometry.translate((a0 + a1) / 2, (b0 + b1) / 2, 0);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, pos.getY(i) / tile);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// A wall from `from` to `to` along its length, with an optional opening
// {a0, a1, b0, b1}, plus a baseboard that stops at doorways.
function wall({ material, trim, from, to, height, tile, opening }) {
  const group = new THREE.Group();
  const skirting = (a0, a1) => place(group, new THREE.BoxGeometry(a1 - a0, 0.09, 0.015), trim, (a0 + a1) / 2, 0.045, 0.0075);
  if (!opening) {
    group.add(panel(material, from, to, 0, height, tile));
    skirting(from, to);
    return group;
  }
  const { a0, a1, b0, b1 } = opening;
  group.add(panel(material, from, a0, 0, height, tile));
  group.add(panel(material, a1, to, 0, height, tile));
  if (b0 > 0) group.add(panel(material, a0, a1, 0, b0, tile));
  group.add(panel(material, a0, a1, b1, height, tile));
  if (b0 > 0) {
    skirting(from, to);
  } else {
    skirting(from, a0);
    skirting(a1, to);
  }
  return group;
}

// The apartment: a greybox stand-in for the Phase 5 art pass, laid out from
// layout.js. Lit by the TV, two lamps, and a neon sign shining in through the
// blinds; dust, rain and neon flicker keep it alive.
export class Room {
  constructor({ env }) {
    this.settings = { ...ROOM_DEFAULTS };
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#050403');
    scene.fog = new THREE.FogExp2('#050403', 0.06);
    scene.environment = env;
    scene.environmentIntensity = 0.3;

    this.buildShell();
    this.buildFurniture();
    this.buildLights();

    this.dust = new DustMotes({
      bounds: new THREE.Box3(new THREE.Vector3(-1.3, 0.25, -0.1), new THREE.Vector3(1.3, 2.0, 2.3)),
      beamOrigin: new THREE.Vector3(0, 0.8, 0.25),
      beamDir: new THREE.Vector3(0, 0.1, 1),
    });
    scene.add(this.dust.points);
  }

  buildShell() {
    const { minX, maxX, minZ, maxZ, height } = ROOM;
    const trim = new THREE.MeshStandardMaterial({ color: '#2a1a0e', roughness: 0.6 });
    const paneling = new THREE.MeshStandardMaterial({ map: createPanelingTexture([1, 1]), roughness: 0.7 });
    const paper = new THREE.MeshStandardMaterial({ map: createWallpaperTexture([1, 1]), roughness: 0.9 });
    const walls = new THREE.Group();

    // TV wall (wood paneling), facing +z.
    const back = wall({ material: paneling, trim, from: minX, to: maxX, height, tile: 1.6 });
    back.position.z = minZ;
    // Wall behind the couch, facing −z.
    const front = wall({ material: paper, trim, from: -maxX, to: -minX, height, tile: 0.6 });
    front.position.z = maxZ;
    front.rotation.y = Math.PI;
    // Left wall with the door; wall-local x runs along world −z.
    const left = wall({
      material: paper,
      trim,
      from: -maxZ,
      to: -minZ,
      height,
      tile: 0.6,
      opening: { a0: -(DOOR.z + DOOR.width / 2), a1: -(DOOR.z - DOOR.width / 2), b0: 0, b1: DOOR.height },
    });
    left.position.x = minX;
    left.rotation.y = Math.PI / 2;
    // Right wall with the window; wall-local x runs along world +z.
    const right = wall({
      material: paper,
      trim,
      from: minZ,
      to: maxZ,
      height,
      tile: 0.6,
      opening: { a0: WINDOW.z - WINDOW.width / 2, a1: WINDOW.z + WINDOW.width / 2, b0: WINDOW.y - WINDOW.height / 2, b1: WINDOW.y + WINDOW.height / 2 },
    });
    right.position.x = maxX;
    right.rotation.y = -Math.PI / 2;
    walls.add(back, front, left, right);
    this.scene.add(walls);

    this.window = createWindow(WINDOW);
    this.window.group.position.set(WINDOW.z, WINDOW.y, 0);
    right.add(this.window.group);

    this.buildDoor(left, trim);

    const width = maxX - minX;
    const depth = maxZ - minZ;
    const center = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    const carpet = createCarpetTexture();
    carpet.repeat.set(width / 0.5, depth / 0.5);
    const floor = place(this.scene, new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }), center.x, 0, center.z, { cast: false });
    floor.rotation.x = -Math.PI / 2;
    const ceiling = place(this.scene, new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: createCeilingTexture([width, depth]), roughness: 1 }), center.x, height, center.z, { cast: false });
    ceiling.rotation.x = Math.PI / 2;
    const rug = place(this.scene, new THREE.PlaneGeometry(RUG.width, RUG.depth), new THREE.MeshStandardMaterial({ map: createRugTexture(), roughness: 1 }), RUG.position.x, 0.004, RUG.position.z, { cast: false });
    rug.rotation.x = -Math.PI / 2;
  }

  // Door left ajar onto a warmly lit hallway.
  buildDoor(leftWall, trim) {
    const a0 = -(DOOR.z + DOOR.width / 2);
    const a1 = -(DOOR.z - DOOR.width / 2);
    const mid = (a0 + a1) / 2;
    const casing = new THREE.MeshStandardMaterial({ color: '#cfc6b2', roughness: 0.6 });
    place(leftWall, new THREE.BoxGeometry(DOOR.width + 0.14, 0.07, 0.03), casing, mid, DOOR.height + 0.035, 0.015);
    place(leftWall, new THREE.BoxGeometry(0.07, DOOR.height, 0.03), casing, a0 - 0.035, DOOR.height / 2, 0.015);
    place(leftWall, new THREE.BoxGeometry(0.07, DOOR.height, 0.03), casing, a1 + 0.035, DOOR.height / 2, 0.015);

    const hinge = new THREE.Group();
    hinge.position.set(a1, 0, 0);
    hinge.rotation.y = -0.6; // swung out into the hallway
    leftWall.add(hinge);
    const door = new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.55 });
    place(hinge, new THREE.BoxGeometry(DOOR.width - 0.02, DOOR.height - 0.02, 0.04), door, -DOOR.width / 2, DOOR.height / 2, -0.03);
    place(hinge, new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshStandardMaterial({ color: '#b08a3e', metalness: 0.9, roughness: 0.3 }), -DOOR.width + 0.08, 1.0, 0.0);

    const hall = new THREE.MeshStandardMaterial({ color: '#4a3a28', emissive: '#2a1a0a', emissiveIntensity: 0.6, roughness: 0.9, side: THREE.BackSide });
    place(leftWall, new THREE.BoxGeometry(2.2, 2.4, 2.0), hall, mid, 1.2, -1.0, { cast: false });
    const bulb = new THREE.PointLight('#ffcf9a', 0.8, 3, 2);
    bulb.position.set(mid, 2.1, -0.9);
    leftWall.add(bulb);
  }

  buildFurniture() {
    const { scene } = this;
    const stand = createTVStand(STAND.height);
    stand.group.position.copy(STAND.position);
    scene.add(stand.group);
    this.vcrDisplay = stand.vcrDisplay;

    const table = createCoffeeTable(COFFEE_TABLE);
    table.group.position.copy(COFFEE_TABLE.position);
    scene.add(table.group);
    this.tableSurface = table.surface;

    // Set dressing on the far half of the table, where it's in shot.
    const onTable = (object, dx, dz, rotation = 0) => {
      object.position.set(COFFEE_TABLE.position.x + dx, table.top, COFFEE_TABLE.position.z + dz);
      object.rotation.y = rotation;
      scene.add(object);
    };
    this.can = createBeerCan();
    onTable(this.can.group, -0.33, -0.13); // left of the remote area, so you can point at it
    this.magazines = createMagazines();
    onTable(this.magazines.group, -0.03, -0.04, 0.3);
    this.paperPlane = new PaperPlane({ lean: 'left' }); // your résumé, folded into a plane, tipped towards you
    onTable(this.paperPlane.group, 0.36, -0.14, 0.45);

    const couch = createCouch(COUCH);
    couch.group.position.copy(COUCH.position);
    scene.add(couch.group);

    const endTable = createEndTable(END_TABLE.height);
    endTable.group.position.copy(END_TABLE.position);
    scene.add(endTable.group);
    const tableLamp = createTableLamp();
    tableLamp.group.position.set(END_TABLE.position.x, END_TABLE.height, END_TABLE.position.z);
    scene.add(tableLamp.group);

    const floorLamp = createFloorLamp();
    floorLamp.group.position.copy(FLOOR_LAMP.position);
    scene.add(floorLamp.group);
    this.tableLamp = tableLamp.group; // click it to switch it (see toggleTableLamp)
    // Things that give off light, for the bloom: the lamp shades, the VCR clock, the neon sign.
    this.glowing = [tableLamp.shade, floorLamp.shade, this.vcrDisplay, this.window.sign];
    this.lampGlow = [
      { shade: tableLamp.shadeMaterial, fringe: tableLamp.fringeMaterial },
      { shade: floorLamp.shadeMaterial, fringe: floorLamp.fringeMaterial },
    ];
    this.tableLampOn = true;
    this.tableLampFlicked = -Infinity;
    this.time = 0;

    const print = createPrint(PRINT);
    print.group.position.copy(PRINT.position);
    scene.add(print.group);

    // The snake plant, in the far left corner where the table lamp lights it
    // (click it and it does a twirl).
    this.plant = createPlant();
    this.plant.group.position.copy(PLANT);
    scene.add(this.plant.group);
    this.plantTwirl = new Twirl(this.plant.group);

    // Right of the TV, a bookshelf with a lava lamp (click it for a new
    // colour), a stuffed panda (click it to squeeze it) and a few books.
    this.bookshelf = createBookshelf();
    this.bookshelf.group.position.copy(BOOKSHELF_AT);
    scene.add(this.bookshelf.group);
    this.lava = this.bookshelf.lava;
    this.glowing.push(this.lava.bulb);
    this.panda = new Squishy(this.bookshelf.panda);
  }

  buildLights() {
    const { scene } = this;
    scene.add(new THREE.HemisphereLight('#3a4560', '#1a0f08', 0.18));

    this.tableLight = new THREE.PointLight('#ffb36b', 1.6, 7, 2);
    this.tableLight.position.copy(TABLE_LAMP);
    this.floorLight = new THREE.PointLight('#ffa860', 1.2, 8, 2);
    this.floorLight.position.copy(FLOOR_LAMP.shade);
    scene.add(this.tableLight, this.floorLight);

    // The neon sign across the street, through the blinds: the only shadow caster.
    const neon = (this.neon = new THREE.SpotLight('#ff4fae', 45, 14, 0.42, 0.35, 1.6));
    neon.position.copy(NEON.light);
    neon.target.position.copy(NEON.target);
    neon.castShadow = true;
    neon.shadow.mapSize.set(1024, 1024);
    neon.shadow.camera.near = 0.5;
    neon.shadow.camera.far = 14;
    neon.shadow.bias = -0.0004;
    neon.shadow.normalBias = 0.02;
    neon.shadow.radius = 3;
    scene.add(neon, neon.target);
    this.neonIntensity = neon.intensity;
  }

  placeTV(tv) {
    tv.group.position.set(STAND.position.x, STAND.height, STAND.position.z);
    tv.group.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = o !== tv.screen;
    });
    this.scene.add(tv.group);
    tv.group.updateMatrixWorld(true);
    // Dust lights up along the beam from the screen towards the couch.
    const origin = tv.group.localToWorld(tv.screenCenter);
    this.dust.material.uniforms.uBeamOrigin.value.copy(origin);
    this.dust.material.uniforms.uBeamDir.value.copy(EYE).sub(origin).normalize();
  }

  // The snake plant's leaves, from a model (main.js loads the Sansevieria).
  setPlantLeaves(model) {
    replaceLeaves(this.plant, model);
  }

  // The can on the coffee table, from a model (main.js loads the soda can).
  setCanModel(model) {
    const at = this.can.group.position;
    // Facing you, +x is your right: turn the tab's ring that way, then on round.
    const facing = Math.atan2(EYE.x - at.x, EYE.z - at.z);
    replaceCan(this.can, model, CAN_TURN, facing + TAB_TURN);
  }

  // The clock radio on the bookshelf, from a model (main.js loads it).
  setRadioModel(model) {
    this.radioMeter = placeRadio(this.bookshelf, model);
  }

  // Flick the table lamp's switch; returns whether it's now on.
  toggleTableLamp() {
    this.tableLampOn = !this.tableLampOn;
    this.tableLampFlicked = this.time;
    return this.tableLampOn;
  }

  update(time, { tvColor, tvLevel, pixelScale, camera, radioOn = false }) {
    const s = this.settings;
    const dt = Math.max(0, time - this.time);
    this.time = time;

    this.bookshelf.group.visible = s.bookshelf;
    this.lava.brightness = s.lavaLight;
    this.lava.update(dt, camera, s.bookshelf);
    this.panda.update(dt);
    this.plantTwirl.update(dt);
    this.radioMeter?.update(dt, radioOn);
    this.bookshelf.radioLight.intensity = this.radioMeter ? s.radioLight : 0; // once the radio's there

    const level = s.flicker ? neonFlicker(time) : 1;
    this.neon.intensity = this.neonIntensity * s.neon * level;
    this.window.signMaterial.color.setScalar((0.2 + 0.8 * level) * Math.min(1, s.neon));
    this.window.rain.uniforms.uTime.value = time;
    this.window.rain.uniforms.uOpacity.value = 0.6 * (0.3 + 0.7 * level);
    this.window.rain.visible = s.rain;
    this.window.setTilt(s.blinds);

    const lamp = s.lamps ? s.lampLevel : 0;
    const tableLamp = lamp * lampLevel(this.tableLampOn, time - this.tableLampFlicked);
    this.tableLight.intensity = 1.6 * tableLamp;
    this.floorLight.intensity = 1.2 * lamp;
    [tableLamp, lamp].forEach((level, i) => {
      this.lampGlow[i].shade.emissiveIntensity = 1.6 * level;
      this.lampGlow[i].fringe.emissiveIntensity = 0.6 * level;
    });

    this.vcrDisplay.visible = time % 1 < 0.5;
    this.dust.update(time, { tvColor, tvLevel, pixelScale, opacity: s.dust, size: s.dustSize });

    // Clear coat stays just above zero so the shader never recompiles mid-tweak.
    const table = this.tableSurface;
    table.clearcoat = Math.max(0.001, s.tableReflectivity);
    table.envMapIntensity = 0.3 + s.tableReflectivity * 2.7;
    table.roughness = THREE.MathUtils.lerp(0.65, 0.18, s.tableGloss);
    table.clearcoatRoughness = THREE.MathUtils.lerp(0.5, 0.02, s.tableGloss);
  }
}
