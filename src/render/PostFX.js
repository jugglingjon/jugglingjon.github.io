import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Post-processing over the finished frame. The room still renders straight to
// the screen first, exactly as before: the CRT, the neon sign and the VCR
// clock skip tone mapping on purpose, which an offscreen render would undo.
// That frame is then copied into a texture and polished: ambient occlusion
// darkens corners and contact points, bloom lets the bright things glow, and a
// film pass adds grain, a vignette and a light grade, before it goes back to
// the screen. Everything works on the display-ready colours.

// High: everything. Medium: no ambient occlusion. Low: no post at all.
export const TIERS = ['high', 'medium', 'low'];

// Bloom only comes from things that give off light (the neon, the lamp
// shades, the VCR clock, the remote's lit button, and more gently the TV
// picture, so its text stays sharp), not from bright reflections or white
// paper. They go on GLOW_LAYER (or SCREEN_LAYER), and things that can sit in
// front of them (your arm, the magazine in your hands) on FRONT_LAYER, so the
// glow mask is drawn with them blocking it.
export const GLOW_LAYER = 4;
export const FRONT_LAYER = 5;
export const SCREEN_LAYER = 6;

export const POST_DEFAULTS = {
  quality: 'auto', // or a tier; auto starts high (medium on touch devices) and steps down if frames drop
  ao: 0.7, // ambient occlusion strength
  aoRadius: 0.3, // metres
  bloom: 0.05,
  bloomRadius: 0.11,
  bloomThreshold: 0.79, // how bright (0–1) a glowing thing has to be to bloom
  screenGlow: 0, // how much of that bloom the TV picture gets (none: it stays sharp)
  grain: 0.035,
  vignette: 0.3,
  saturation: 1.06,
  contrast: 1.04,
  shadowTint: '#3a1440', // shadows lean a little this way…
  tint: 0.05, // …by this much
};

// Auto quality: after a warm-up, if a few seconds average below this many
// frames a second, drop a tier (it never climbs back during a visit).
export const WATCH = { warmup: 3, window: 3, minFps: 40 };

export class QualityWatch {
  constructor(tier = 'high') {
    this.tier = tier;
    this.time = 0;
    this.frames = 0;
    this.elapsed = 0;
  }

  // Count a frame (real seconds since the last one); returns the tier to use.
  // Pauses, like the tab sitting in the background, don't count.
  track(frameTime, hidden = false) {
    if (frameTime > 5 || hidden || this.tier === 'low') return this.tier;
    this.time += frameTime;
    if (this.time < WATCH.warmup) return this.tier;
    this.frames++;
    this.elapsed += frameTime;
    if (this.elapsed >= WATCH.window) {
      if (this.frames / this.elapsed < WATCH.minFps) this.tier = TIERS[TIERS.indexOf(this.tier) + 1];
      this.frames = 0;
      this.elapsed = 0;
    }
    return this.tier;
  }
}

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uGrain: { value: 0 },
    uVignette: { value: 0 },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uTint: { value: new THREE.Color() },
    uTintAmount: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uSaturation;
    uniform float uContrast;
    uniform vec3 uTint;
    uniform float uTintAmount;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(c, vec3(0.299, 0.587, 0.114));

      // Grade: a touch more colour and contrast, shadows leaning towards the tint.
      c = mix(vec3(luma), c, uSaturation);
      c = (c - 0.5) * uContrast + 0.5;
      c += uTint * uTintAmount * (1.0 - luma);

      // Vignette, round whatever the screen's shape.
      vec2 d = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
      c *= mix(1.0 - uVignette, 1.0, smoothstep(0.95, 0.3, length(d)));

      // Film grain, strongest in the mid-tones, moving every frame.
      float n = hash(floor(vUv * uResolution) + fract(uTime * 7.31) * 113.0) - 0.5;
      c += n * uGrain * (1.0 - abs(luma - 0.5) * 1.4);

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, { scene, camera }) {
    this.renderer = renderer;
    this.settings = { ...POST_DEFAULTS };
    this.reducedMotion = false;
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.watch = new QualityWatch(touch ? 'medium' : 'high');

    this.size = new THREE.Vector2();
    this.frame = null; // the finished frame, copied off the screen
    this.composer = new EffectComposer(renderer);
    this.input = new TexturePass(null);
    this.ao = new GTAOPass(scene, camera, 1, 1);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0, 0, 1);
    this.film = new ShaderPass(FilmShader);
    for (const pass of [this.input, this.ao, this.bloom, this.film]) this.composer.addPass(pass);

    // The glow mask, and the bloom's bright-pass patched to only take light
    // from inside it (if three's shader ever changes, bloom just goes unmasked).
    this.glowMask = new THREE.WebGLRenderTarget(1, 1);
    this.maskCamera = new THREE.PerspectiveCamera();
    this.white = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
    this.grey = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
    this.black = new THREE.MeshBasicMaterial({ color: '#000000', fog: false });
    const brightPass = this.bloom.materialHighPassFilter;
    this.bloom.highPassUniforms.tGlow = { value: this.glowMask.texture };
    this.bloom.highPassUniforms.smoothWidth.value = 0.2; // a soft knee
    const masked = brightPass.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform sampler2D tGlow;')
      .replace('gl_FragColor = mix( outputColor, texel, alpha );', 'gl_FragColor = mix( outputColor, texel, alpha ) * texture2D( tGlow, vUv ).r;');
    if (masked.includes('tGlow, vUv')) {
      brightPass.fragmentShader = masked;
      brightPass.needsUpdate = true;
    } else {
      console.warn('PostFX: bloom shader changed; bloom is not masked to glowing things.');
    }
  }

  // Tag things that give off light, and things that can sit in front of them.
  markGlowing(...objects) {
    for (const object of objects) object.traverse((o) => o.layers.enable(GLOW_LAYER));
  }

  markFront(...objects) {
    for (const object of objects) object.traverse((o) => o.layers.enable(FRONT_LAYER));
  }

  // The TV picture: it glows, but only `screenGlow` as much.
  markScreen(screen) {
    screen.layers.enable(SCREEN_LAYER);
  }

  // White where something glows (grey for the TV picture), black elsewhere,
  // with the front things blocking it (drawn first, with depth). Half
  // resolution: bloom is soft.
  renderGlowMask(scene, camera) {
    const r = this.renderer;
    const saved = { background: scene.background, fog: scene.fog, override: scene.overrideMaterial, autoClear: r.autoClear, alpha: r.getClearAlpha() };
    const clearColor = r.getClearColor(new THREE.Color());
    scene.background = null;
    scene.fog = null;
    r.autoClear = false;
    r.setRenderTarget(this.glowMask);
    r.setClearColor(0x000000, 1);
    r.clear();
    this.maskCamera.copy(camera, false);
    scene.overrideMaterial = this.black;
    this.maskCamera.layers.set(FRONT_LAYER);
    r.render(scene, this.maskCamera);
    scene.overrideMaterial = this.white;
    this.maskCamera.layers.set(GLOW_LAYER);
    r.render(scene, this.maskCamera);
    this.grey.color.setScalar(this.settings.screenGlow);
    scene.overrideMaterial = this.grey;
    this.maskCamera.layers.set(SCREEN_LAYER);
    r.render(scene, this.maskCamera);
    r.setRenderTarget(null);
    r.setClearColor(clearColor, saved.alpha);
    scene.background = saved.background;
    scene.fog = saved.fog;
    scene.overrideMaterial = saved.override;
    r.autoClear = saved.autoClear;
  }

  // The tier in use now.
  get tier() {
    return this.settings.quality === 'auto' ? this.watch.tier : this.settings.quality;
  }

  setSize(width, height) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    this.renderer.getDrawingBufferSize(this.size);
    this.frame?.dispose();
    this.frame = new THREE.FramebufferTexture(this.size.x, this.size.y);
    this.glowMask.setSize(Math.max(1, Math.round(this.size.x / 2)), Math.max(1, Math.round(this.size.y / 2)));
    this.input.map = this.frame;
    this.film.uniforms.uResolution.value.copy(this.size);
  }

  // Auto quality: judge the frame rate (real seconds between frames) while
  // it's on auto, and step down a tier if it's too slow.
  track(frameTime) {
    if (this.settings.quality === 'auto') this.watch.track(frameTime, document.hidden);
  }

  // Polish what's on screen now (call right after rendering `scene` to it).
  render(scene, camera, time) {
    const tier = this.tier;
    if (tier === 'low') return;
    const s = this.settings;
    const r = this.renderer;

    r.setRenderTarget(null);
    r.copyFramebufferToTexture(this.frame);

    this.ao.enabled = tier === 'high' && s.ao > 0;
    this.ao.camera = camera;
    this.ao.blendIntensity = s.ao;
    if (this.ao.enabled && this.ao.gtaoMaterial.uniforms.radius.value !== s.aoRadius) this.ao.updateGtaoMaterial({ radius: s.aoRadius });
    this.bloom.enabled = s.bloom > 0;
    this.bloom.strength = s.bloom;
    this.bloom.radius = s.bloomRadius;
    this.bloom.threshold = s.bloomThreshold;
    const u = this.film.uniforms;
    u.uTime.value = this.reducedMotion ? 0 : time; // still grain with reduced motion
    u.uGrain.value = s.grain;
    u.uVignette.value = s.vignette;
    u.uSaturation.value = s.saturation;
    u.uContrast.value = s.contrast;
    u.uTint.value.set(s.shadowTint).convertLinearToSRGB(); // we're working in display colours
    u.uTintAmount.value = s.tint;

    // The AO pass draws the scene again for depth and normals; the shadow map
    // from the main render is still good, so don't redraw that too.
    const shadows = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    if (this.bloom.enabled) this.renderGlowMask(scene, camera);
    this.composer.render();
    r.shadowMap.autoUpdate = shadows;
  }
}
