import * as THREE from 'three';
import common from '../screen/shaders/common.glsl?raw';

// Ambient motion that keeps the room alive while you sit still.

// Dust drifting through the TV's beam: invisible in the dark, sparkling where
// the screen's light catches it, tinted by whatever is on.
export class DustMotes {
  constructor({ count = 600, bounds, beamOrigin, beamDir }) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const size = bounds.getSize(new THREE.Vector3());
    for (let i = 0; i < count; i++) {
      positions[i * 3] = bounds.min.x + Math.random() * size.x;
      positions[i * 3 + 1] = bounds.min.y + Math.random() * size.y;
      positions[i * 3 + 2] = bounds.min.z + Math.random() * size.z;
      seeds[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 500 },
        uOpacity: { value: 1 },
        uTvColor: { value: new THREE.Color() },
        uTvLevel: { value: 0 },
        uAmbient: { value: new THREE.Color('#1c130a') },
        uBeamOrigin: { value: beamOrigin.clone() },
        uBeamDir: { value: beamDir.clone().normalize() },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uScale;
        uniform vec3 uBeamOrigin;
        uniform vec3 uBeamDir;
        varying float vGlow;
        varying float vTwinkle;
        void main() {
          float t = uTime * 0.06;
          vec3 p = position + vec3(
            sin(t * 1.3 + aSeed * 61.0) * 0.12,
            sin(t * 0.9 + aSeed * 17.0) * 0.08,
            cos(t * 1.1 + aSeed * 37.0) * 0.12);
          vec4 world = modelMatrix * vec4(p, 1.0);
          vec4 mv = viewMatrix * world;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (0.002 + 0.004 * fract(aSeed * 7.31)) / max(0.1, -mv.z);
          // Brightest on the beam's axis; the beam widens and dims with distance.
          vec3 rel = world.xyz - uBeamOrigin;
          float along = dot(rel, uBeamDir);
          float spread = 0.25 + max(along, 0.0) * 0.45;
          float perp = length(rel - along * uBeamDir);
          vGlow = step(0.0, along) * exp(-perp * perp / (spread * spread)) / (1.0 + along * along * 0.5);
          vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTvColor;
        uniform float uTvLevel;
        uniform vec3 uAmbient;
        uniform float uOpacity;
        varying float vGlow;
        varying float vTwinkle;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = dot(c, c);
          if (d > 0.25) discard;
          float soft = 1.0 - d * 4.0;
          gl_FragColor = vec4((uTvColor * uTvLevel * vGlow + uAmbient) * soft * soft * vTwinkle * uOpacity, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  update(time, { tvColor, tvLevel, pixelScale, opacity }) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uTvColor.value.copy(tvColor);
    u.uTvLevel.value = tvLevel;
    u.uScale.value = pixelScale;
    u.uOpacity.value = opacity;
    this.points.visible = opacity > 0;
  }
}

// Smoke curling up from the cigarette: a camera-facing card with rising noise.
export class Smoke {
  constructor({ width = 0.3, height = 0.8 } = {}) {
    const geometry = new THREE.PlaneGeometry(width, height);
    geometry.translate(0, height / 2, 0);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 0.5 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader:
        common +
        /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        float fbm(vec2 p) {
          float sum = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 4; i++) {
            sum += amp * valueNoise(p);
            p *= 2.03;
            amp *= 0.5;
          }
          return sum;
        }
        void main() {
          vec2 uv = vUv;
          float rise = uTime * 0.1;
          float sway = (fbm(vec2(uv.y * 2.5 - rise * 1.5, 3.1)) - 0.5) * 0.9 * uv.y;
          float width = mix(0.03, 0.32, pow(uv.y, 0.8));
          float x = (uv.x - 0.5 - sway) / width;
          float wisps = fbm(vec2(uv.x * 5.0 + sway * 3.0, uv.y * 4.0 - rise * 4.0));
          float a = exp(-x * x * 2.5) * smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.35, uv.y) * smoothstep(0.25, 0.75, wisps);
          gl_FragColor = vec4(uColor, a * uOpacity);
          #include <colorspace_fragment>
        }
      `,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 2;
  }

  update(time, camera, color) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uColor.value.copy(color);
    // Turn to face the camera around the vertical axis only, so it still rises.
    const p = this.mesh.position;
    this.mesh.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
  }
}

// Rain on the window: two layers of streaks sliding down at different speeds
// over static beads, lit by the street outside.
export function createRainMaterial(texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uRain: { value: texture },
      uTime: { value: 0 },
      uTint: { value: new THREE.Color('#ff7cc8') },
      uOpacity: { value: 0.6 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uRain;
      uniform float uTime;
      uniform vec3 uTint;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float a = texture(uRain, vUv * vec2(1.0, 0.6) + vec2(0.0, uTime * 0.25)).a;
        float b = texture(uRain, vUv * vec2(1.4, 0.9) + vec2(0.37, uTime * 0.4)).a;
        float beads = texture(uRain, vUv * 1.7 + vec2(0.11, 0.0)).a * 0.5;
        float v = max(max(a, b * 0.8), beads);
        gl_FragColor = vec4(uTint, v * uOpacity);
      }
    `,
  });
}
