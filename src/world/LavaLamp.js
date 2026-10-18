import * as THREE from 'three';
import { place } from './furniture.js';

// A lava lamp, switched on: blobs of wax rise from the warm base, wobble and
// sink again in glowing liquid. The glass is a single shader that raymarches
// the inside of the bulb: a handful of spheres drifting up and down, blended
// smoothly into each other and into the pool at the bottom. A small light
// inside tints the shelf and wall around it. Click it for a new colour: the
// wax, the liquid and the light it casts all fade to a random new scheme.

// The bulb's outline (radius at height), shared by the lathe and the shader.
const BULB = [
  [0.034, 0.13],
  [0.045, 0.16],
  [0.05, 0.2],
  [0.046, 0.25],
  [0.036, 0.31],
  [0.026, 0.36],
];
const BOTTOM = BULB[0][1];
const TOP = BULB.at(-1)[1];

// Five blobs: how long each takes to go up and come back (seconds), where it
// starts in that cycle, its size, and how far it drifts sideways.
const BLOBS = [
  [21, 0.0, 0.016, 0.006],
  [27, 0.35, 0.013, 0.01],
  [17, 0.62, 0.011, 0.008],
  [33, 0.8, 0.015, 0.005],
  [24, 0.15, 0.01, 0.012],
];

// How quickly a new colour scheme fades in (seconds; mostly there in three times this).
const FADE = 0.2;

// A random colour scheme: wax of any hue at least 54° round the colour wheel
// from `lastHue` (if given), in a darker, softer liquid 40–130° from the wax,
// and the colour of the light they cast together, mostly the wax's. Hues and
// lightness are as you see them (sRGB); the colours come back linear.
export function lavaColours(random = Math.random, lastHue) {
  const hue = lastHue === undefined ? random() : (lastHue + 0.15 + random() * 0.7) % 1;
  const offset = (0.12 + random() * 0.25) * (random() < 0.5 ? -1 : 1);
  const wax = new THREE.Color().setHSL(hue, 1, 0.58, THREE.SRGBColorSpace);
  const liquid = new THREE.Color().setHSL((hue + offset + 1) % 1, 0.6, 0.46, THREE.SRGBColorSpace);
  return { hue, wax, liquid, light: lightColour(wax, liquid) };
}

// The light from inside: mostly the wax's colour, at full strength.
function lightColour(wax, liquid) {
  const light = new THREE.Color().lerpColors(liquid, wax, 0.7);
  return light.multiplyScalar(1 / Math.max(light.r, light.g, light.b, 1e-4));
}

const glsl = (n) => n.toFixed(4);

// r(y) for the bulb, as GLSL: straight lines between the outline's points.
const radiusAt = BULB.slice(1)
  .map(([r, y], i) => {
    const [r0, y0] = BULB[i];
    return `if (y < ${glsl(y)}) return mix(${glsl(r0)}, ${glsl(r)}, (y - ${glsl(y0)}) / ${glsl(y - y0)});`;
  })
  .join('\n      ');

const blobs = BLOBS.map(
  ([period, phase, size, drift], i) => `
      {
        float c = 0.5 - 0.5 * cos(6.2831853 * (uFlow / ${glsl(period)} + ${glsl(phase)}));
        vec3 centre = vec3(sin(uFlow * 0.31 + ${i}.0) * ${glsl(drift)}, mix(BOTTOM + 0.02, TOP - 0.03, c), cos(uFlow * 0.23 + ${i * 2}.0) * ${glsl(drift)});
        vec3 q = p - centre;
        q.y *= 0.8; // a little tall, as warm wax is
        d = smin(d, length(q) - ${glsl(size)}, 0.014);
      }`,
).join('');

const vertexShader = /* glsl */ `
  varying vec3 vObject;
  varying vec3 vNormalObject;
  void main() {
    vObject = position;
    vNormalObject = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define BOTTOM ${glsl(BOTTOM)}
  #define TOP ${glsl(TOP)}
  uniform vec3 uCamera; // camera position, in the bulb's own space
  uniform float uFlow; // the wax's own clock
  uniform vec3 uWax;
  uniform vec3 uLiquid;
  varying vec3 vObject;
  varying vec3 vNormalObject;

  float bulbRadius(float y) {
    ${radiusAt}
    return ${glsl(BULB.at(-1)[0])};
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Distance to the wax: the pool at the bottom and the drifting blobs.
  float wax(vec3 p) {
    float d = length((p - vec3(0.0, BOTTOM - 0.006, 0.0)) * vec3(1.0, 1.6, 1.0)) - 0.03;
    ${blobs}
    return d;
  }

  vec3 waxNormal(vec3 p) {
    vec2 e = vec2(0.0015, 0.0);
    return normalize(vec3(
      wax(p + e.xyy) - wax(p - e.xyy),
      wax(p + e.yxy) - wax(p - e.yxy),
      wax(p + e.yyx) - wax(p - e.yyx)
    ));
  }

  void main() {
    vec3 ray = normalize(vObject - uCamera);
    vec3 p = vObject;
    float t = 0.0;
    bool hit = false;
    for (int i = 0; i < 48; i++) {
      p = vObject + ray * t;
      if (p.y < BOTTOM - 0.01 || p.y > TOP || length(p.xz) > bulbRadius(p.y) + 0.002) {
        if (t > 0.004) break; // out the far side of the glass
      }
      float d = wax(p);
      if (d < 0.0008) { hit = true; break; }
      t += max(d * 0.9, 0.0015);
      if (t > 0.12) break;
    }

    // Heat comes from the bulb in the base: everything glows more low down.
    // Kept under the tone mapper's shoulder, so any colour stays that colour
    // rather than burning out to white.
    float heat = clamp(1.0 - (p.y - BOTTOM) / (TOP - BOTTOM), 0.0, 1.0);
    vec3 colour;
    if (hit) {
      vec3 n = waxNormal(p);
      float rim = pow(1.0 - abs(dot(n, -ray)), 2.0);
      colour = uWax * (0.4 + 0.35 * heat + 0.3 * rim);
    } else {
      colour = uLiquid * (0.12 + 0.3 * heat);
    }

    // A glint on the glass.
    vec3 n = normalize(vNormalObject);
    float fresnel = pow(1.0 - abs(dot(n, -ray)), 3.0);
    colour += vec3(0.9, 0.85, 1.0) * fresnel * 0.2;

    gl_FragColor = vec4(colour, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class LavaLamp {
  constructor({ wax = '#ff5a2a', liquid = '#c2307a' } = {}) {
    this.group = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: '#a9a2b2', metalness: 0.85, roughness: 0.35 });
    const lathe = (points) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 32);

    // Base, bulb and cap.
    place(this.group, lathe([[0, 0], [0.068, 0], [0.066, 0.012], [0.048, 0.08], [0.036, 0.125], [0.034, 0.13], [0, 0.13]]), metal);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uCamera: { value: new THREE.Vector3() },
        uFlow: { value: 0 },
        uWax: { value: new THREE.Color(wax) },
        uLiquid: { value: new THREE.Color(liquid) },
      },
      vertexShader,
      fragmentShader,
    });
    this.bulb = place(this.group, lathe(BULB), this.material, 0, 0, 0, { cast: false, receive: false });
    place(this.group, lathe([[0, 0.36], [0.026, 0.36], [0.02, 0.4], [0.015, 0.42], [0, 0.42]]), metal);

    const u = this.material.uniforms;
    this.target = { wax: u.uWax.value.clone(), liquid: u.uLiquid.value.clone(), light: lightColour(u.uWax.value, u.uLiquid.value) };
    this.hue = u.uWax.value.getHSL({}, THREE.SRGBColorSpace).h;
    this.light = new THREE.PointLight(this.target.light, 0, 2.2, 2);
    this.light.position.set(0, 0.22, 0.06);
    this.group.add(this.light);
    this.brightness = 0.45; // the light's intensity

    this.flow = Math.random() * 60;
    this.camera = new THREE.Vector3();
  }

  // Click: a new colour scheme, faded in over the next half second or so.
  // Returns the colours it's heading for.
  recolor(random = Math.random) {
    const { hue, wax, liquid, light } = lavaColours(random, this.hue);
    this.hue = hue;
    this.target = { wax, liquid, light };
    return this.target;
  }

  update(dt, camera, visible = true) {
    this.flow += dt;
    const u = this.material.uniforms;
    u.uFlow.value = this.flow;
    const fade = 1 - Math.exp(-dt / FADE);
    u.uWax.value.lerp(this.target.wax, fade);
    u.uLiquid.value.lerp(this.target.liquid, fade);
    this.light.color.lerp(this.target.light, fade);
    this.bulb.updateMatrixWorld();
    u.uCamera.value.copy(this.bulb.worldToLocal(camera.getWorldPosition(this.camera)));
    // The light wavers a little as the wax moves past it.
    this.light.intensity = visible ? this.brightness * (0.92 + 0.08 * Math.sin(this.flow * 1.7)) : 0;
  }
}
