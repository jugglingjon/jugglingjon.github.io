import * as THREE from 'three';

// A glowing outline round whatever you're pointing at. The object is drawn as
// a white silhouette into an offscreen mask, then a full-screen pass traces
// the mask's edge over the finished frame, so the line is the same even width
// whatever the object's shape. Costs nothing when nothing's hovered.

export const OUTLINE_LAYER = 3;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMask;
  uniform vec2 uTexel;
  uniform float uWidth;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float inside = texture2D(uMask, vUv).r;
    float near = 0.0;
    for (int i = 0; i < 16; i++) {
      float a = float(i) * 0.39269908; // 2π / 16
      vec2 dir = vec2(cos(a), sin(a)) * uTexel;
      near = max(near, texture2D(uMask, vUv + dir * uWidth).r);
      near = max(near, texture2D(uMask, vUv + dir * uWidth * 0.5).r);
    }
    float edge = near * (1.0 - inside);
    if (edge < 0.01) discard;
    gl_FragColor = vec4(uColor, edge * uOpacity);
    #include <colorspace_fragment>
  }
`;

export class HoverOutline {
  constructor(renderer, { color = '#ffdf8a', width = 2.5 } = {}) {
    this.renderer = renderer;
    this.width = width;
    this.target = null;
    this.mask = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.maskMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, side: THREE.DoubleSide });
    this.maskCamera = new THREE.PerspectiveCamera();
    this.maskCamera.layers.set(OUTLINE_LAYER);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMask: { value: this.mask.texture },
        uTexel: { value: new THREE.Vector2() },
        uWidth: { value: width },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.size = new THREE.Vector2();
    this.clearColor = new THREE.Color();
  }

  // Outline `object` (and everything in it), or nothing.
  setTarget(object) {
    if (object === this.target) return;
    this.target?.traverse((o) => o.layers.disable(OUTLINE_LAYER));
    this.target = object;
    object?.traverse((o) => o.layers.enable(OUTLINE_LAYER));
  }

  // Draw the outline over what's already on screen, after the scene's render.
  render(scene, camera, time = 0) {
    if (!this.target) return;
    const r = this.renderer;
    r.getDrawingBufferSize(this.size);
    if (this.mask.width !== this.size.x || this.mask.height !== this.size.y) this.mask.setSize(this.size.x, this.size.y);
    this.material.uniforms.uTexel.value.set(1 / this.size.x, 1 / this.size.y);
    this.material.uniforms.uWidth.value = this.width * r.getPixelRatio();
    this.material.uniforms.uOpacity.value = 0.85 + 0.15 * Math.sin(time * 5); // a gentle pulse

    // The silhouette: just the target, flat white on black. The room's shadow
    // map and background are left alone.
    const saved = { background: scene.background, fog: scene.fog, override: scene.overrideMaterial, shadows: r.shadowMap.autoUpdate, alpha: r.getClearAlpha() };
    r.getClearColor(this.clearColor);
    scene.background = null;
    scene.fog = null;
    scene.overrideMaterial = this.maskMaterial;
    r.shadowMap.autoUpdate = false;
    this.maskCamera.copy(camera, false);
    this.maskCamera.layers.set(OUTLINE_LAYER);
    r.setRenderTarget(this.mask);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(scene, this.maskCamera);
    r.setRenderTarget(null);
    r.setClearColor(this.clearColor, saved.alpha);
    scene.background = saved.background;
    scene.fog = saved.fog;
    scene.overrideMaterial = saved.override;
    r.shadowMap.autoUpdate = saved.shadows;

    // Its edge, over the frame.
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.render(this.quadScene, this.quadCamera);
    r.autoClear = autoClear;
  }
}
