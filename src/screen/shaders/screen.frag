// Stage B — the tube and its glass.
// Everything the *display* does to the signal: barrel geometry, overscan, scanline
// beam profile, phosphor mask, convergence, halation, power-on collapse, degauss,
// then the glass on top (fresnel reflections of the room, smudges, dark body tint).
// Scanlines and mask fade out by on-screen frequency (fwidth) so they never moiré.

uniform sampler2D uSignal;
uniform sampler2D uEnv;
uniform sampler2D uSmudge;
uniform float uTime;
uniform float uFrame;

uniform float uPower;
uniform float uAfterglow;
uniform float uEmission;
uniform float uBarrel;
uniform float uOverscan;
uniform float uCornerRadius;
uniform float uScanlines;
uniform float uScanlineStrength;
uniform float uBeamSpread;
uniform float uMaskType;
uniform float uMaskStrength;
uniform float uMaskTriads;
uniform vec2 uConvergence;
uniform float uDegauss;
uniform float uHalation;
uniform float uHalationLod;
uniform float uVignette;
uniform float uEdgeShadow;
uniform float uFlicker;

uniform vec3 uGlassTint;
uniform float uReflection;
uniform float uRoughness;
uniform float uSmudgeAmount;
uniform float uEnvIntensity;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

vec2 gradX;
vec2 gradY;

// Explicit gradients: scanline-quantised UVs jump at line edges, which would
// otherwise make the GPU pick a blurry mip along every line boundary.
vec3 sig(vec2 uv) {
  return textureGrad(uSignal, uv, gradX, gradY).rgb;
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec2 equirectUv(vec3 d) {
  return vec2(atan(d.z, d.x) / TAU + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
}

// uEnv is an sRGB texture, so samples arrive already linear.
vec3 env(vec3 dir, float lod) {
  return textureLod(uEnv, equirectUv(dir), lod).rgb * uEnvIntensity;
}

vec3 phosphorMask(vec2 uv) {
  float t = uv.x * uMaskTriads;
  float aa = 1.0 - smoothstep(0.2, 0.4, fwidth(t));
  if (uMaskType < 0.5 || aa <= 0.0) return vec3(1.0);

  float gap = 1.0;
  if (uMaskType > 1.5) {
    // Slot mask: square cells, every other row offset by half a triad.
    float row = uv.y * uMaskTriads * 0.75;
    t += mod(floor(row), 2.0) * 0.5;
    float fr = fract(row);
    gap = smoothstep(0.0, 0.12, fr) * smoothstep(1.0, 0.88, fr);
  }
  // Soft RGB stripes, normalised to unit mean (mean of |cos|^3 is 4/3π).
  vec3 m = 0.5 + 0.5 * cos(TAU * (t - vec3(0.0, 1.0, 2.0) / 3.0));
  m = pow(m, vec3(1.5)) * 2.356 * gap;
  return mix(vec3(1.0), m, uMaskStrength * aa);
}

void main() {
  vec2 c = vUv * 2.0 - 1.0;

  // Barrel: the picture's edges bow outwards, corners pull in.
  vec2 w = c * (1.0 + uBarrel * (c.yx * c.yx));

  // Power on/off: the raster collapses to a line, then to a dot.
  vec2 ps = vec2(
    mix(0.004, 1.0, smoothstep(0.0, 0.3, uPower)),
    mix(0.008, 1.0, smoothstep(0.25, 0.7, uPower))
  );
  vec2 uv = (w / ps) * (1.0 - uOverscan) * 0.5 + 0.5;
  gradX = dFdx(uv);
  gradY = dFdy(uv);

  vec2 rb = abs(uv - 0.5) * 2.0;
  float raster = (1.0 - smoothstep(0.98, 1.0, rb.x)) * (1.0 - smoothstep(0.98, 1.0, rb.y));
  float sdGlass = sdRoundBox(c, vec2(1.0), uCornerRadius);
  float glassMask = 1.0 - smoothstep(-0.006, 0.0, sdGlass);

  // Scanlines: sample each line at its centre while lines are resolvable.
  float f = uv.y * uScanlines;
  float lineAA = 1.0 - smoothstep(0.3, 0.7, fwidth(f));
  vec2 suv = vec2(uv.x, mix(uv.y, (floor(f) + 0.5) / uScanlines, lineAA));

  // Convergence error grows towards the edges; degauss wobbles it hard.
  vec2 conv = uConvergence * (0.35 + 0.65 * dot(c, c));
  conv += uDegauss * 0.012 * vec2(sin(uv.y * 7.0 + uTime * 9.0), cos(uv.x * 5.0 - uTime * 7.0));
  vec3 col = vec3(sig(suv + conv).r, sig(suv).g, sig(suv - conv).b);

  // A collapsing raster runs white-hot.
  col = mix(col, vec3(dot(col, LUMA)) * 0.6 + 0.5, 1.0 - ps.y);
  col *= mix(vec3(1.0), 0.6 + 0.8 * cos(TAU * (vec3(0.0, 0.33, 0.67) + dot(c, vec2(0.7, 0.4)) + uTime * 0.8)), uDegauss * 0.5);

  // Beam profile: brighter lines bloom wider, so scanline gaps show most in the darks.
  float lum = dot(col, LUMA);
  float width = 0.2 + uBeamSpread * lum;
  float d = fract(f) - 0.5;
  float beam = exp(-(d * d) / (2.0 * width * width));
  float beamMean = min(width * 2.5066, 1.0);
  float slMean = mix(1.0, beamMean, uScanlineStrength);
  float sl = mix(slMean, mix(1.0, beam, uScanlineStrength), lineAA);

  vec3 light = srgbToLinear(col) * sl / (0.5 + 0.5 * slMean);
  light *= phosphorMask(uv);

  vec3 halo = textureLod(uSignal, uv, uHalationLod).rgb * 0.6 + textureLod(uSignal, uv, uHalationLod + 1.5).rgb * 0.4;
  light += srgbToLinear(halo) * uHalation;

  vec2 vuv = clamp(uv, 0.0, 1.0);
  float vig = pow(clamp(16.0 * vuv.x * vuv.y * (1.0 - vuv.x) * (1.0 - vuv.y), 0.0, 1.0), uVignette);
  float edge = mix(1.0, smoothstep(0.0, 0.18, -sdGlass), uEdgeShadow);
  float flicker = 1.0 + uFlicker * ((hash11(uFrame) - 0.5) + 0.5 * sin(uTime * 3.7));
  float energy = min(1.0 / (ps.x * ps.y), 6.0);
  float warm = mix(0.4, 1.0, smoothstep(0.55, 1.0, uPower));
  float powered = smoothstep(0.0, 0.03, uPower);

  vec3 emissive = light * raster * vig * edge * flicker * energy * warm * powered * uEmission;
  emissive += vec3(0.9, 0.95, 1.0) * exp(-dot(c, c) * 600.0) * uAfterglow * 4.0;
  emissive *= glassMask;

  // Glass: dark grey-green body, fresnel reflection of the room, smudge haze.
  vec3 N = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 V = isOrthographic
    ? normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]))
    : normalize(cameraPosition - vWorldPos);
  float NoV = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
  float smudge = texture(uSmudge, vUv).r * uSmudgeAmount;
  float rough = clamp(uRoughness + smudge * 0.6, 0.0, 1.0);
  vec3 R = reflect(-V, N);

  vec3 body = uGlassTint * (0.25 + 2.0 * env(N, 8.0));
  vec3 refl = env(R, rough * 6.0) * fres * uReflection;
  vec3 haze = env(R, 7.0) * smudge * 0.08 * uReflection;

  gl_FragColor = vec4(body + emissive * (1.0 - fres) + refl + haze, 1.0);
  #include <colorspace_fragment>
}
