import * as THREE from 'three';
import common from './shaders/common.glsl?raw';
import vertexShader from './shaders/fullscreen.vert?raw';
import signalFrag from './shaders/signal.frag?raw';

export const SIGNAL_WIDTH = 640;
export const SIGNAL_HEIGHT = 480;
const SIGNAL_ASPECT = SIGNAL_WIDTH / SIGNAL_HEIGHT;

// Stage A: renders the "broadcast" into a 640×480 render target. Two targets
// ping-pong so the shader can read last frame for phosphor persistence and
// picture breathing. Targets are mipmapped: Stage B reads blurred mips for
// halation, and the smallest mip is the screen's average colour (TV glow).
export class SignalPass {
  constructor(renderer, osdTexture) {
    this.renderer = renderer;
    this.rollPhase = 0;

    const options = {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    };
    this.targets = [
      new THREE.WebGLRenderTarget(SIGNAL_WIDTH, SIGNAL_HEIGHT, options),
      new THREE.WebGLRenderTarget(SIGNAL_WIDTH, SIGNAL_HEIGHT, options),
    ];
    this.index = 0;

    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: common + signalFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSource: { value: blank },
        uPrev: { value: this.targets[1].texture },
        uOSD: { value: osdTexture },
        uHasSource: { value: 0 },
        uSrcScale: { value: new THREE.Vector2(1, 1) },
        uSrcOffset: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(SIGNAL_WIDTH, SIGNAL_HEIGHT) },
        uTime: { value: 0 },
        uRoll: { value: 0 },
        uRollBar: { value: 1 },
        uHSync: { value: 0 },
        uJitter: { value: 0 },
        uWobble: { value: 0 },
        uSnow: { value: 0 },
        uNoise: { value: 0 },
        uBrightness: { value: 0 },
        uContrast: { value: 1 },
        uSaturation: { value: 1 },
        uChroma: { value: 1 },
        uHue: { value: 0 },
        uBleed: { value: 0 },
        uChromaShift: { value: 0 },
        uGhost: { value: 0 },
        uGhostOffset: { value: 0 },
        uBreathing: { value: 0 },
        uPersistence: { value: 0 },
        uOSDOpacity: { value: 0 },
      },
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  get texture() {
    return this.targets[this.index].texture;
  }

  // Fit any source aspect into the 4:3 frame. `cover` crops around `focus`,
  // `contain` letterboxes (outside the frame renders as black blanking).
  setSource(source, fit = 'cover', focus = [0.5, 0.5]) {
    const u = this.material.uniforms;
    if (!source) {
      u.uHasSource.value = 0;
      return;
    }
    u.uSource.value = source.texture;
    u.uHasSource.value = 1;

    const ratio = source.width / source.height / SIGNAL_ASPECT;
    const wide = ratio > 1;
    if (fit === 'contain') {
      u.uSrcScale.value.set(wide ? 1 : 1 / ratio, wide ? ratio : 1);
      u.uSrcOffset.value.set(0, 0);
    } else {
      const scale = u.uSrcScale.value.set(wide ? 1 / ratio : 1, wide ? 1 : ratio);
      u.uSrcOffset.value.set((focus[0] - 0.5) * (1 - scale.x), (focus[1] - 0.5) * (1 - scale.y));
    }
  }

  setOSDOpacity(value) {
    this.material.uniforms.uOSDOpacity.value = value;
  }

  render(params, fx, time, dt) {
    const s = params.signal;
    const u = this.material.uniforms;

    this.rollPhase = (this.rollPhase + s.rollSpeed * dt) % 1;
    u.uTime.value = time;
    u.uRoll.value = (((s.roll + this.rollPhase + fx.roll) % 1) + 1) % 1;
    u.uRollBar.value = s.rollBar;
    u.uHSync.value = s.hsync + fx.hsync;
    u.uJitter.value = s.jitter;
    u.uWobble.value = s.wobble;
    u.uSnow.value = Math.min(1, s.snow + fx.snow);
    u.uNoise.value = s.noise;
    u.uBrightness.value = s.brightness + fx.brightness;
    u.uContrast.value = s.contrast;
    u.uSaturation.value = s.saturation;
    u.uChroma.value = fx.chroma;
    u.uHue.value = s.hue;
    u.uBleed.value = s.bleed;
    u.uChromaShift.value = s.chromaShift;
    u.uGhost.value = s.ghost;
    u.uGhostOffset.value = s.ghostOffset;
    u.uBreathing.value = s.breathing;
    // Persistence is per-frame decay at 60 fps; keep it frame-rate independent.
    u.uPersistence.value = Math.pow(s.persistence, Math.min(dt, 0.1) * 60);

    const read = this.targets[this.index];
    const write = this.targets[1 - this.index];
    u.uPrev.value = read.texture;

    const previous = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(write);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(previous);
    this.index = 1 - this.index;
  }

  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.material.dispose();
  }
}
