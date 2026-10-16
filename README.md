# Retro Portfolio

A web and design portfolio set in a dingy 1980s apartment. You stare at an old CRT TV, raise a chunky remote, and every channel is a project.

**Status: Phase 1, the screen lab.** The CRT look is the heart of the site, so it gets built and tuned first, in isolation. A procedural TV and a greybox corner of the room stand in for the final Blender models.

## Getting started

Requires Node 20.19+ (or 22.12+).

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/, relative paths, runs from any folder
npm run media:test # regenerate the placeholder test videos (needs ffmpeg)
```

## Screen lab controls

| Key | Action |
|---|---|
| <kbd>↑</kbd> <kbd>→</kbd> | Channel up |
| <kbd>↓</kbd> <kbd>←</kbd> | Channel down |
| <kbd>P</kbd> | Power on/off (warm-up, collapse to a dot, afterglow) |
| <kbd>D</kbd> | Degauss |
| <kbd>V</kbd> | Toggle the 3D TV set and the flat, head-on screen |
| <kbd>H</kbd> | Hide the panels |

- Drag to orbit the TV in 3D view.
- Drop any image or video onto the page (or use **Source → Load image / video…**) to tune it in as a new channel.
- **TV → Speed (slow-mo)** runs the lab clock at down to 2% speed, so you can study a channel change frame by frame.
- Every slider in **Signal**, **Tube** and **Glass** is live. Changes auto-save to this browser.
- **Presets → Copy JSON** exports the current look. Paste it into `PRESETS` in `src/screen/params.js` to make it permanent.

## How the screen works

```
Project media (image / <video> / canvas)
        │
        ▼
Stage A · SignalPass   640×480 render target, mipmapped, ping-ponged
  vertical roll · sync tearing · snow · colour lock · NTSC chroma bleed
  multipath ghost · picture breathing · phosphor persistence · OSD
        │                                   │ smallest mip = average screen colour
        ▼                                   ▼
Stage B · ScreenMaterial on curved glass    TVGlow → RectAreaLight lights the room
  barrel · overscan · scanline beam · phosphor mask · convergence · halation
  power-on collapse · degauss · fresnel room reflections · smudges
```

- **Stage A** (`src/screen/shaders/signal.frag`) is everything that goes wrong with the broadcast before it reaches the tube. The OSD is composited after the distortion, so it stays steady while the picture rolls, like a real TV's.
- **Stage B** (`src/screen/shaders/screen.frag`) is the tube and its glass. Scanlines and the phosphor mask fade out by their on-screen frequency (`fwidth`), so they never moiré, even when the TV is small in frame.
- **Transitions** (`src/screen/transitions.js`) are GSAP timelines that animate a shared `fx` object. It is layered on top of the tuned params every frame, so a transition never overwrites your settings. GSAP is driven from the render loop (`gsap.updateRoot`), so animation and picture never drift apart.
- Colour work in Stage A happens in gamma space, as a real NTSC set's does. Stage B converts to linear light before the beam profile, mask and glass are applied.

## Project structure

```
index.html                 lab page
src/
  main.js                  wiring: renderer, views, channels, input, render loop
  screen/
    SignalPass.js          Stage A render pass
    ScreenMaterial.js      Stage B material
    OSD.js                 channel number + caption, 5×7 bitmap font
    transitions.js         channel change, power on/off, degauss
    params.js              tunable defaults and presets
    shaders/               common.glsl, signal.frag, screen.vert/.frag, fullscreen.vert
  world/                   procedural stand-ins until the Blender art pass
    TV.js                  ~20" woodgrain set: fascia, dials, rabbit ears
    Stage.js               carpet, paneling, TV stand, VCR, tapes, lights
    TVGlow.js              screen-coloured room light
    screenGeometry.js      curved (spherical cap) glass
    textures.js            canvas textures: wood, carpet, smudges, room reflection
  lab/                     screen-lab-only tooling
    LabGui.js · sources.js · testCards.js · storage.js
  styles/main.scss
public/media/test/         placeholder videos (MP4 + WebM)
scripts/make-test-media.sh
```

## Placeholders to replace

- **TV, stand and room:** procedural geometry and canvas textures. They get replaced by Blender models with baked lightmaps in Phase 5.
- **Projects:** canvas-drawn mock sites (Neon Burger Co., Field Notes, Orbit Analytics), test patterns and two ffmpeg-generated loops. Real screenshots and recordings arrive in Phase 6.
- **Brand badge:** "Lumatron" is a stand-in for your own mark (`createBadgeTexture` in `src/world/textures.js`).

## Roadmap

1. ~~Screen lab: both shader stages, tuning UI, presets~~ (this phase)
2. Channel engine: ChannelManager state machine, audio, remote LED timing, input queueing
3. Greybox apartment, camera framing per aspect ratio
4. Arm and remote: viewmodel pass, mouse mapping (up/right = CH▲, left/down = CH▼), thumb poses
5. Art pass: Blender models, baked lightmaps with a TV light channel, post-processing
6. Content: project data, PHP-rendered routes and fallback, TV Guide case-study overlay
7. Polish: power-on intro, mobile, accessibility (reduced motion, keyboard), quality tiers
