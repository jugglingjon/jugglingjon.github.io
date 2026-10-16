import * as THREE from 'three';
import common from './shaders/common.glsl?raw';
import vertexShader from './shaders/screen.vert?raw';
import screenFrag from './shaders/screen.frag?raw';

// Stage B: the material on the curved glass mesh. One material instance can be
// shared by every mesh showing the same TV (flat lab view and the 3D set).
export class ScreenMaterial extends THREE.ShaderMaterial {
  constructor({ signal, env, smudge }) {
    super({
      vertexShader,
      fragmentShader: common + screenFrag,
      uniforms: {
        uSignal: { value: signal },
        uEnv: { value: env },
        uSmudge: { value: smudge },
        uTime: { value: 0 },
        uFrame: { value: 0 },
        uPower: { value: 0 },
        uAfterglow: { value: 0 },
        uEmission: { value: 1 },
        uBarrel: { value: 0 },
        uOverscan: { value: 0 },
        uCornerRadius: { value: 0.1 },
        uScanlines: { value: 240 },
        uScanlineStrength: { value: 0.5 },
        uBeamSpread: { value: 0.1 },
        uMaskType: { value: 1 },
        uMaskStrength: { value: 0.3 },
        uMaskTriads: { value: 300 },
        uConvergence: { value: new THREE.Vector2() },
        uDegauss: { value: 0 },
        uHalation: { value: 0 },
        uHalationLod: { value: 3 },
        uVignette: { value: 0.3 },
        uEdgeShadow: { value: 0.5 },
        uFlicker: { value: 0 },
        uGlassTint: { value: new THREE.Color() },
        uReflection: { value: 1 },
        uRoughness: { value: 0.05 },
        uSmudgeAmount: { value: 0.5 },
        uEnvIntensity: { value: 1 },
      },
    });
    this.toneMapped = false;
  }

  update(params, fx, signalTexture, time, frame) {
    const d = params.display;
    const g = params.glass;
    const u = this.uniforms;

    u.uSignal.value = signalTexture;
    u.uTime.value = time;
    u.uFrame.value = frame % 1000;
    u.uPower.value = fx.power;
    u.uAfterglow.value = fx.afterglow;
    u.uDegauss.value = fx.degauss;
    u.uEmission.value = d.emission;
    u.uBarrel.value = d.barrel;
    u.uOverscan.value = d.overscan;
    u.uCornerRadius.value = d.cornerRadius;
    u.uScanlines.value = d.scanlines;
    u.uScanlineStrength.value = d.scanlineStrength;
    u.uBeamSpread.value = d.beamSpread;
    u.uMaskType.value = d.maskType;
    u.uMaskStrength.value = d.maskStrength;
    u.uMaskTriads.value = d.maskTriads;
    u.uConvergence.value.set(d.convergenceX, d.convergenceY);
    u.uHalation.value = d.halation;
    u.uHalationLod.value = d.halationLod;
    u.uVignette.value = d.vignette;
    u.uEdgeShadow.value = d.edgeShadow;
    u.uFlicker.value = d.flicker;
    u.uGlassTint.value.set(g.tint);
    u.uReflection.value = g.reflection;
    u.uRoughness.value = g.roughness;
    u.uSmudgeAmount.value = g.smudge;
    u.uEnvIntensity.value = g.envIntensity;
  }
}
