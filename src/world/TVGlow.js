import * as THREE from 'three';
import vertexShader from '../screen/shaders/fullscreen.vert?raw';

// How the room's light responds to the picture's brightness. A white screen
// really is ~10× brighter than a dark one, but your eyes adapt, so it should
// read as a few times brighter, not flood the room. A soft knee compresses
// the top end: dark pictures are unchanged, full white tops out about 3×.
const KNEE = 0.15;
const GAIN = 0.18; // keeps dark pictures where they were tuned
export const glowResponse = (luminance) => (GAIN * luminance * (1 + KNEE)) / (luminance + KNEE);

// Lights the room with whatever is on screen. The signal target's smallest mip
// is its average colour; we render that into a 1×1 target and read it back
// asynchronously (no pipeline stall), then drive a RectAreaLight from it.
// Phase 5 replaces this with a baked "TV light" lightmap channel tinted on the GPU.
export class TVGlow {
  constructor(renderer, { width, height, strength = 280 }) {
    this.renderer = renderer;
    this.strength = strength;
    this.light = new THREE.RectAreaLight('#ffffff', 0, width, height);
    this.light.rotation.y = Math.PI; // emit out of the screen (+z)

    this.target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: /* glsl */ `
        uniform sampler2D uSignal;
        void main() { gl_FragColor = vec4(textureLod(uSignal, vec2(0.5), 12.0).rgb, 1.0); }
      `,
      uniforms: { uSignal: { value: null } },
      depthTest: false,
      depthWrite: false,
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);

    this.level = 0; // light output before `strength`; dust and other effects scale with it
    this.pixel = new Uint8Array(4);
    this.sampled = new THREE.Color(0, 0, 0);
    this.color = new THREE.Color(0, 0, 0);
    this.pending = false;
  }

  update(signalTexture, brightness, dt) {
    if (!this.pending) {
      this.pending = true;
      this.material.uniforms.uSignal.value = signalTexture;
      const previous = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(previous);
      this.renderer
        .readRenderTargetPixelsAsync(this.target, 0, 0, 1, 1, this.pixel)
        .then(() => {
          const [r, g, b] = this.pixel;
          this.sampled.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
        })
        .catch(() => {})
        .finally(() => {
          this.pending = false;
        });
    }

    this.color.lerp(this.sampled, 1 - Math.exp(-dt * 15));
    const { r, g, b } = this.color;
    const peak = Math.max(r, g, b, 1e-4);
    this.light.color.setRGB(r / peak, g / peak, b / peak);
    this.level = glowResponse(0.2126 * r + 0.7152 * g + 0.0722 * b) * brightness;
    this.light.intensity = this.strength * this.level;
  }
}
