// Stage A — the broadcast signal.
// Everything that goes wrong *before* the picture reaches the tube: vertical roll,
// sync tearing, snow, colour lock, NTSC chroma bleed, multipath ghosting.
// The OSD is generated inside the TV, so it is composited after the distortion
// and stays rock steady while the picture rolls. Output is gamma-space RGB.

uniform sampler2D uSource;
uniform sampler2D uPrev;
uniform sampler2D uOSD;
uniform float uHasSource;
uniform vec2 uSrcScale;
uniform vec2 uSrcOffset;
uniform vec2 uResolution;
uniform float uTime;

uniform float uRoll;
uniform float uRollBar;
uniform float uHSync;
uniform float uJitter;
uniform float uWobble;
uniform float uSnow;
uniform float uNoise;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uChroma;
uniform float uHue;
uniform float uBleed;
uniform float uChromaShift;
uniform float uGhost;
uniform float uGhostOffset;
uniform float uBreathing;
uniform float uPersistence;
uniform float uOSDOpacity;

varying vec2 vUv;

vec3 source(vec2 uv) {
  vec2 suv = (uv - 0.5) * uSrcScale + 0.5 + uSrcOffset;
  // Outside the frame is blanking: black. Covers letterboxing and sync-shifted lines.
  if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) return vec3(0.0);
  return texture(uSource, suv).rgb * uHasSource;
}

void main() {
  vec2 uv = vUv;
  float lines = uResolution.y * 0.5;
  float t60 = floor(uTime * 60.0);

  // Picture breathing: a bright frame sags the high voltage and the raster grows.
  float avgLum = dot(textureLod(uPrev, vec2(0.5), 12.0).rgb, LUMA);
  uv = (uv - 0.5) / (1.0 + uBreathing * avgLum) + 0.5;

  // Vertical hold.
  float rollPhase = fract(uv.y + uRoll);
  uv.y = rollPhase;
  float line = floor(uv.y * lines);

  // Horizontal sync: constant line jitter, slow wobble, and sync-loss tearing.
  float jitter = (hash12(vec2(line, t60)) - 0.5) * uJitter;
  float wobble = sin(uv.y * 9.0 + uTime * 1.7) * sin(uv.y * 23.0 - uTime * 2.3) * uWobble;
  float tear = (hash12(vec2(line * 0.37, t60 + 7.0)) - 0.5) * 0.06 * uHSync;
  tear += sin(uv.y * 5.0 - uTime * 18.0) * 0.05 * uHSync;
  float band = smoothstep(0.55, 0.95, valueNoise(vec2(uv.y * 7.0, uTime * 9.0)));
  tear += band * (valueNoise(vec2(uTime * 13.0, line * 0.05)) - 0.35) * 0.35 * uHSync;
  uv.x += jitter + wobble + tear;

  // Luma from the centre tap; chroma is low-bandwidth, so blur it wider and shift it.
  vec2 px = 1.0 / uResolution;
  float Y = dot(source(uv), LUMA);
  vec2 iq = vec2(0.0);
  float wsum = 0.0;
  for (int i = -3; i <= 3; i++) {
    float fi = float(i);
    float w = exp(-fi * fi / 4.5);
    iq += (RGB2YIQ * source(uv + vec2((fi * uBleed + uChromaShift) * px.x, 0.0))).yz * w;
    wsum += w;
  }
  iq /= wsum;

  // Multipath ghost: a faint copy displaced to the right.
  Y += dot(source(uv - vec2(uGhostOffset, 0.0)), LUMA) * uGhost;

  Y = (Y - 0.5) * uContrast + 0.5 + uBrightness;
  float ch = cos(uHue);
  float sh = sin(uHue);
  iq = mat2(ch, sh, -sh, ch) * iq * uSaturation * uChroma;
  vec3 col = YIQ2RGB * vec3(Y, iq);

  // Snow: horizontally stretched grains with per-line brightness streaks.
  vec2 grain = floor(vUv * vec2(uResolution.x * 0.5, uResolution.y));
  float n = hash12(grain + fract(uTime * 13.37) * 997.0);
  float snow = n * (0.7 + 0.6 * hash11(line + t60 * 3.1));
  col = mix(col, vec3(snow), clamp(uSnow, 0.0, 1.0));
  col += (n - 0.5) * uNoise;

  // Vertical blanking interval shows up as a dark bar where the picture wraps.
  float bar = smoothstep(0.0, 0.035, rollPhase) * smoothstep(1.0, 0.985, rollPhase);
  col *= mix(1.0, bar, uRollBar);

  vec4 osd = texture(uOSD, vUv);
  col = mix(col, osd.rgb, osd.a * uOSDOpacity);

  // Phosphor persistence: bright things decay instead of vanishing.
  col = max(clamp(col, 0.0, 1.0), texture(uPrev, vUv).rgb * uPersistence);

  gl_FragColor = vec4(col, 1.0);
}
