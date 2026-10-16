// Buffers and curves for the synthesized sound design.

export function whiteNoise(ctx, seconds = 2) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Integrated (brown) noise: a low rumble, like traffic through a window.
export function brownNoise(ctx, seconds = 4) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

// A small carpeted living room: a short noise tail with a few early reflections.
export function roomImpulse(ctx, seconds = 0.5, decay = 0.11) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate / decay) * 0.4;
    }
    for (const [delay, level] of [[0.007, 0.5], [0.013, 0.35], [0.021, 0.25]]) {
      data[Math.floor((delay + ch * 0.0015) * ctx.sampleRate)] += level;
    }
  }
  return buffer;
}

// Soft saturation for an overdriven little speaker.
export function softClipCurve(amount = 2.5, samples = 1024) {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}
