import * as THREE from 'three';

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
        uSize: { value: 1 },
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
        uniform float uSize;
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
          gl_PointSize = uScale * uSize * (0.002 + 0.004 * fract(aSeed * 7.31)) / max(0.1, -mv.z);
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

  update(time, { tvColor, tvLevel, pixelScale, opacity, size = 1 }) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uSize.value = size;
    u.uTvColor.value.copy(tvColor);
    u.uTvLevel.value = tvLevel;
    u.uScale.value = pixelScale;
    u.uOpacity.value = opacity;
    this.points.visible = opacity > 0;
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
