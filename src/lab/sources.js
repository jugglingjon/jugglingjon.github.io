import * as THREE from 'three';
import { createScrollRecording, drawColorBars, drawDashboard, drawNeonBurger, drawResolutionChart } from './testCards.js';

// A source is anything the TV can show:
//   { name, texture, width, height, update?(time), activate?(), deactivate?(), onResize?,
//     video?, tone? }   ← sound: a <video> soundtrack, or a test tone in Hz
// Textures stay in their native (sRGB-encoded) values; Stage A works in gamma space.

function canvasSource(name, canvas) {
  return { name, texture: new THREE.CanvasTexture(canvas), width: canvas.width, height: canvas.height };
}

function animatedSource(name, recording) {
  const texture = new THREE.CanvasTexture(recording.canvas);
  return {
    name,
    texture,
    width: recording.canvas.width,
    height: recording.canvas.height,
    update(time) {
      if (recording.update(time)) texture.needsUpdate = true;
    },
  };
}

// `srcs` lists encodings in preference order; the browser plays the first it can.
function videoSource(name, srcs) {
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous', preload: 'auto' });
  for (const src of [srcs].flat()) {
    const el = document.createElement('source');
    el.src = src;
    video.append(el);
  }
  // Channels keep "airing" while you're away: tuning in lands mid-broadcast.
  const airOffset = Math.random() * 1000;

  const source = {
    name,
    video,
    texture: new THREE.VideoTexture(video),
    width: 640,
    height: 480,
    activate() {
      if (video.duration) video.currentTime = (performance.now() / 1000 + airOffset) % video.duration;
      video.play().catch(() => {});
    },
    deactivate() {
      video.pause();
    },
  };
  video.addEventListener('loadedmetadata', () => {
    source.width = video.videoWidth;
    source.height = video.videoHeight;
    source.onResize?.();
  });
  return source;
}

const testMedia = (name) => ['mp4', 'webm'].map((ext) => `${import.meta.env.BASE_URL}media/test/${name}.${ext}`);

export function createTestSources() {
  return [
    canvasSource('Neon Burger Co.', drawNeonBurger()),
    animatedSource('Field Notes', createScrollRecording()),
    canvasSource('Orbit Analytics', drawDashboard()),
    videoSource('Game of Life', testMedia('life')),
    videoSource('Gradient Reel', testMedia('gradient-reel')),
    { ...canvasSource('Colour Bars', drawColorBars()), tone: 1000 }, // the classic 1 kHz line-up tone
    canvasSource('Resolution Chart', drawResolutionChart()),
  ];
}

export async function sourceFromFile(file) {
  const url = URL.createObjectURL(file);
  const name = file.name.replace(/\.[^.]+$/, '');
  if (file.type.startsWith('video/')) return videoSource(name, url);

  const image = new Image();
  image.src = url;
  await image.decode();
  const texture = new THREE.Texture(image);
  texture.needsUpdate = true;
  return { name, texture, width: image.naturalWidth, height: image.naturalHeight };
}
