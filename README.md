# Retro Portfolio

A web and design portfolio set in a dingy 1980s apartment. You stare at an old CRT TV, raise a chunky remote, and every channel is a project.

**Status: Phase 2, the channel engine.** The screen lab from Phase 1 now has a working set behind it: a tuner state machine, a remote with infrared lag, number entry, volume and mute, and synthesized sound. A procedural TV, a greybox corner of the room and a clickable remote stand in for the final models.

## Getting started

Requires Node 20.19+ (or 22.12+).

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the tuner state machine (Vitest)
npm run build      # static build in dist/, relative paths, runs from any folder
npm run media:test # regenerate the placeholder test videos (needs ffmpeg)
```

## Screen lab controls

The set starts switched off. Press <kbd>P</kbd> or the red **POWER** button on the on-screen remote. That first press also enables sound, since browsers block audio until you interact with the page.

| Key | Remote button | Action |
|---|---|---|
| <kbd>P</kbd> | POWER | Power on/off (warm-up, degauss, collapse to a dot) |
| <kbd>↑</kbd> <kbd>→</kbd> / <kbd>↓</kbd> <kbd>←</kbd> | CH ▲ / ▼ | Channel up/down; skips unprogrammed numbers; hold to surf |
| <kbd>0</kbd>–<kbd>9</kbd> | 0–9 | Tune directly: one digit waits briefly for a second (`CH 1-`) |
| <kbd>R</kbd> / <kbd>Backspace</kbd> | RCL | Recall the previous channel |
| <kbd>+</kbd> / <kbd>−</kbd> | VOL + / − | Volume, with the OSD bar; hold to repeat |
| <kbd>M</kbd> | MUTE | Mute |
| <kbd>D</kbd> | | Degauss |
| <kbd>V</kbd> | | Toggle the 3D TV set and the flat, head-on screen |
| <kbd>H</kbd> | | Hide the panels |

- Drag to orbit the TV in 3D view.
- Drop any image or video onto the page (or use **Source → Load image / video…**) to add it as the next channel. Dropped videos play their soundtrack through the TV speaker.
- Tuning a number with nothing on it gives dead air: snow and hiss.
- **TV → Speed (slow-mo)** runs the lab clock down to 2% speed, so you can study a channel change frame by frame.
- **Tuner** sets reduced motion, rough-change odds, IR latency and the snow/surf timings. **Sound** sets the volume and mix.
- Every slider in **Signal**, **Tube** and **Glass** is live. Changes auto-save to this browser. **Presets → Copy JSON** exports the current look; paste it into `PRESETS` in `src/screen/params.js` to make it permanent.

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

## How the set works

```
Remote.press(button) ──'press'──▶ IR LED blink, button click sound (Phase 4: thumb)
        │ after IR latency (~60 ms)
        ▼
Television.receive(button)
  power · tuner · number entry · recall · volume/mute
        │                     │                      │
        ▼                     ▼                      ▼
  fx (transitions.js)        OSD               events: swap · relay · power · volume
  roll, tearing, snow,       CH 05, CH 1-,           │
  colour lock                VOLUME bar, MUTE        ▼
                                              AudioEngine, source switching
```

- **Tuner phases:** `locked → losing → searching → acquiring → locked`, or `dead` when nothing is broadcasting on that number. Presses mid-change never restart the sequence. The tuner stays in the snow, swaps stations under it, and only locks once you stop pressing, so holding CH ▲ surfs the way a real set did.
- **`Television`** decides *when* things happen. **`transitions.js`** decides *what they look like*. Both run on the GSAP clock, so the lab's slow motion applies to the whole set.
- **Sound is fully synthesized** (`src/audio/`), so there are no audio files:
  - **Through the TV speaker** (small-speaker EQ and a little room reverb, scaled by volume): static and channel audio. Static follows the snow on screen, so sound and picture can't drift apart.
  - **Straight from the hardware** (unaffected by volume): remote clicks, the tuner relay, the power thunk, degauss hum and HV crackle, and the 15.7 kHz flyback whine.
  - **Always on:** quiet room tone.
- **Reduced motion:** with `prefers-reduced-motion` the tuner swaps through a quick snow cut, with no roll or tearing.

## Project structure

```
index.html                 lab page
src/
  main.js                  wiring: renderer, views, channels, input, render loop
  tv/
    Television.js          the set: power, tuner state machine, number entry, volume, OSD
    Remote.js              buttons, with infrared latency
    Television.test.js     state machine tests
  audio/
    AudioEngine.js         synthesized sound: speaker chain, static, clicks, relay, degauss, whine
    synth.js               noise buffers, room impulse response, saturation curve
  screen/
    SignalPass.js          Stage A render pass
    ScreenMaterial.js      Stage B material
    OSD.js                 channel, number entry, caption, volume bar, mute; 5×7 bitmap font
    transitions.js         signal loss / acquire / dead air, power on/off, degauss
    params.js              tunable defaults and presets
    shaders/               common.glsl, signal.frag, screen.vert/.frag, fullscreen.vert
  world/                   procedural stand-ins until the Blender art pass
    TV.js                  ~20" woodgrain set: fascia, dials, rabbit ears
    Stage.js               carpet, paneling, TV stand, VCR, tapes, lights
    TVGlow.js              screen-coloured room light
    screenGeometry.js      curved (spherical cap) glass
    textures.js            canvas textures: wood, carpet, smudges, room reflection
  lab/                     screen-lab-only tooling
    LabGui.js · RemotePad.js · sources.js · testCards.js · storage.js
  styles/                  main.scss, _tokens.scss, _remote.scss
public/media/test/         placeholder videos (MP4 + WebM)
scripts/make-test-media.sh
```

## Placeholders to replace

- **TV, stand and room:** procedural geometry and canvas textures. They get replaced by Blender models with baked lightmaps in Phase 5.
- **Projects:** canvas-drawn mock sites (Neon Burger Co., Field Notes, Orbit Analytics), test patterns and two ffmpeg-generated loops. Real screenshots and recordings arrive in Phase 6.
- **Remote:** a clickable DOM remote (`src/lab/RemotePad.js`) drives the same `Remote` object the 3D arm and remote will use in Phase 4.
- **Brand badge:** "Lumatron" is a stand-in for your own mark (`createBadgeTexture` in `src/world/textures.js`).

## Roadmap

1. ~~Screen lab: both shader stages, tuning UI, presets~~
2. ~~Channel engine: tuner state machine, remote with IR latency, number entry, volume, synthesized audio~~ (this phase)
3. Greybox apartment, camera framing per aspect ratio
4. Arm and remote: viewmodel pass, mouse mapping (up/right = CH▲, left/down = CH▼), thumb poses
5. Art pass: Blender models, baked lightmaps with a TV light channel, post-processing
6. Content: project data, PHP-rendered routes and fallback, TV Guide case-study overlay
7. Polish: power-on intro, mobile, accessibility (reduced motion, keyboard), quality tiers
