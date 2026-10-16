# Retro Portfolio

A web and design portfolio set in a dingy 1980s apartment. You stare at an old CRT TV, raise a chunky remote, and every channel is a project.

**Status: Phase 4, the arm and remote.** Your right arm is held out towards the TV with a chunky remote in your hand. Moving the mouse glides your thumb over the buttons, and the one it's over lights up. Clicking presses it with your thumb. All of this sits in the Phase 3 greybox apartment, on top of the Phase 1 screen and the Phase 2 tuner and sound. Procedural models stand in for the final art.

## Getting started

Requires Node 20.19+ (or 22.12+).

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests: tuner, framing, thumb mapping and reach (Vitest)
npm run build      # static build in dist/, relative paths, runs from any folder
npm run media:test # regenerate the placeholder test videos (needs ffmpeg)
npm run media:music # regenerate the placeholder channel music (needs ffmpeg)
```

## Screen lab controls

The set starts switched off. Press <kbd>P</kbd>, or move your thumb to the red **POWER** button (top right of the remote) and click. That first press also enables sound, since browsers block audio until you interact with the page.

| Input | Remote button | Action |
|---|---|---|
| Move the mouse | | Your thumb glides over the remote; the button it's over lights green |
| Click | the lit one | Press it with your thumb; hold CH or VOL to repeat |
| <kbd>P</kbd> | POWER | Power on/off (warm-up, degauss, collapse to a dot) |
| <kbd>↑</kbd> <kbd>→</kbd> / <kbd>↓</kbd> <kbd>←</kbd> | CH ▲ / ▼ | Channel up/down; skips unprogrammed numbers; hold to surf |
| Scroll up / down, <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | CH ▲ / ▼ | Channel up / down (orbit view keeps the wheel for zoom) |
| <kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd> | 1–9, 0 | Tune straight to channel 1–9; 0 is channel 10 |
| <kbd>R</kbd> / <kbd>Backspace</kbd> | RCL | Recall the previous channel |
| <kbd>+</kbd> / <kbd>−</kbd> | VOL + / − | Volume, with the OSD bar; hold to repeat |
| <kbd>M</kbd> | MUTE | Mute |
| <kbd>D</kbd> | | Degauss |
| <kbd>V</kbd> | | Cycle views: seated (you, on the couch), orbit (free debug camera), flat screen |
| <kbd>H</kbd> | | Hide the panels |

- In the seated view the camera stays still; the pointer moves your arm a little as well as your thumb. In orbit view, drag to move the camera.
- Every key, scroll and on-screen remote press plays out with your thumb too, so you always see which button went down.
- Drop any image or video onto the page (or use **Source → Load image / video…**) to add it as the next channel. Dropped videos play their soundtrack through the TV speaker.
- Channels start at 1, so the number keys reach the first ten. Tuning a number with nothing on it gives dead air: snow and hiss.
- **TV → Speed (slow-mo)** runs the lab clock down to 2% speed, so you can study a channel change frame by frame.
- **Tuner** sets reduced motion, rough-change odds, IR latency and the snow/surf timings. **Sound** sets the volume and mix.
- Every slider in **Signal**, **Tube** and **Glass** is live. Changes auto-save to this browser. **Presets → Copy JSON** exports the current look; paste it into `PRESETS` in `src/screen/params.js` to make it permanent.

## The apartment

```
            TV wall (paneling) ── print · lamp on end table · TV on stand · plant
   door ▏                                                                 ▕ window + blinds
 (ajar,  ▏                    rug · coffee table                          ▕  ← neon sign
  hall)  ▏                                                                ▕    across the street
            couch (you sit here, eye 1.1 m) · floor lamp behind
```

- **Layout:** everything is placed from `src/world/layout.js`. The room, the seated camera and the painted glass reflections all read from it, so moving the lamp moves its reflection too.
- **Light:** the TV (its picture's average colour, see `TVGlow`), two warm lamps, the hallway bulb, and a pink neon sign across the street. The neon is the one shadow-casting light, and the blinds are real slats, so it throws genuine stripes across the floor, table and TV. **Room → Blind tilt** changes them.
- **Tuning:** the Room panel sets lamps, neon, blind tilt, dust brightness and size, and the coffee table's varnish. **Table reflectivity** is how strongly it reflects the TV and lamps; **Table gloss** is how sharp those reflections are.
- **Ambient motion:** dust motes sparkle in the TV's beam and take on the picture's colour, the neon buzzes and stutters, rain runs down the window, and the VCR blinks 12:00.
- **Seated camera** (`src/camera/SeatedCamera.js`): a fixed seat with a slow breath (**Camera → Breathing**, 0 for a dead-still camera); the pointer moves your arm, not your head. `fitVerticalFov` keeps a box around the TV in frame at any aspect ratio. Wide screens get the preferred 42° with more room either side; tall phones zoom out until the TV fits across. The TV sits a little above centre, leaving the bottom of the frame for the coffee table and the remote.
- **Screen rect:** `seated.screenRect(tv.screen)` gives the TV glass's on-screen bounds in normalised coordinates every frame, for anything that has to line up with the picture. **Camera → Show screen rect** draws it, with the engage zone around it.
- **Reduced motion:** with `prefers-reduced-motion`, breathing stops and the arm follows the pointer half as much.

## The arm and remote

- **The mapping:** the middle 80% of the screen maps onto the remote's face, the way you see it. Up is towards the tip (POWER, then the number pad), down is the VOL and CH rockers, and left and right go across. The nearest button is the target, with a little hysteresis so the thumb doesn't flicker on a boundary (`src/viewmodel/thumbing.js`). The middle of the screen is **8**, and the bottom right is **CH ▲ / ▼**.
- **The thumb** is three bones, solved every frame. First the CMC joint by the wrist swings the metacarpal: as you reach across the remote it carries the big knuckle up and over the face, and the fleshy pad at the base of the thumb stretches with it. Then the MCP and IP joints bend (two-bone IK) to put the pad on the button. It hovers just above the targeted button, then sinks with it on a press. The whole grip shuffles along the remote to reach the far buttons, the way you would, and the arm (shoulder → elbow → wrist, also IK) follows. The arm also drifts a few centimetres after the pointer, and the remote's tip swings that way a little while it stays aimed at the set. The flannel sleeve comes in from the bottom-right corner.
- **Presses:** a click goes to `Remote.hold`. The remote fires `press` immediately, and `ArmRig` plays the thumb press: down 60 ms, hold, up 100 ms. The button sinks, the IR LED blinks, and the TV reacts after the IR latency. Keys, scroll and the lab remote go through the same `Remote`, so the thumb presses for those too.
- **Tuning:** the **Arm & remote** panel moves the remote around (across, height, reach), tilts and rolls it, and scales it. It also sets how far the arm follows the pointer (**Follow pointer**) and how firmly the thumb settles onto the target. You can also switch the highlight off there.
- When the pointer leaves the page, the arm lowers; it comes back up when the pointer returns. On touch screens a tap aims and presses in one go.

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
Remote.press(button) ──'press'──▶ thumb press, IR LED blink, button click sound
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
- **The set's own sounds are synthesized** (`src/audio/`); only channel music and video soundtracks are files:
  - **Through the TV speaker** (small-speaker EQ and a little room reverb, scaled by volume): channel music, video soundtracks and static. Static follows the snow on screen and channel audio ducks under it, so sound and picture can't drift apart.
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
  viewmodel/               your arm and the remote in your hand
    ArmRig.js              places the remote, targets buttons, plays presses, arm IK and sleeve
    RemoteModel.js         the remote: body, buttons with labels, highlight, press travel, IR LED
    Hand.js                right hand: palm, curled fingers, three-joint thumb (CMC swing + IK), grip slide
    thumbing.js            button layout, pointer → button, two-bone IK, bone swing (+ thumbing.test.js, Hand.test.js)
  camera/
    SeatedCamera.js        the viewer: seat, framing, breathing, screen rect
    framing.js             fitVerticalFov, projectBounds (+ framing.test.js)
  world/                   procedural stand-ins until the Blender art pass
    layout.js              where everything is
    Room.js                walls, floor, ceiling, door, lights; assembles the rest
    furniture.js           TV stand + VCR + tapes, coffee table, couch, end table, lamps
    props.js               beer can, magazines, plant, framed print
    windowView.js          window, real blind slats, rain glass, the street and its neon
    atmosphere.js          dust motes, rain shader
    TV.js                  ~20" woodgrain set: fascia, dials, rabbit ears
    TVGlow.js              screen-coloured room light
    screenGeometry.js      curved (spherical cap) glass
    textures.js            canvas textures for all of the above, plus the room reflection
  lab/                     screen-lab-only tooling
    LabGui.js · RemotePad.js · ScreenRectOverlay.js · sources.js · testCards.js · storage.js
  styles/                  main.scss, _tokens.scss, _remote.scss
public/media/test/         placeholder videos (MP4 + WebM)
public/media/music/        placeholder channel music (MP3 loops)
scripts/
  make-test-media.sh       renders the test videos
  make-placeholder-music.mjs  synthesizes the music loops from note data
```

## Channel music

Each channel can have a looping music track (`music` on its source, see `src/lab/sources.js`). It plays through the TV speaker, ducks under the static during a channel change, and keeps "airing" while you're away: tune back in and you land mid-song, not at the top. Tracks are fetched and decoded when sound is first enabled, so tuning is instant.

The current tracks are placeholders synthesized by `scripts/make-placeholder-music.mjs`. They are original, so there is nothing to license. To use a real track:

1. Export a short loop (10–30 s) as MP3, mono is fine. Cut it on a bar line so it loops cleanly.
2. Drop it in `public/media/music/`.
3. Point the channel's `music` at it.

The TV speaker filter makes everything appropriately tinny, so there's no need for hi-fi files.

### Where to find music that fits

Tinny, synth, fun, ambient, retro, short:

- **Make your own in [BeepBox](https://www.beepbox.co/)** (or its fork JummBox). This is the closest fit. It's a free browser chiptune tracker that exports WAV, and BeepBox doesn't claim ownership of songs made with it, so there's no licence to manage.
- **[OpenGameArt.org](https://opengameart.org/)**: lots of short, loopable chiptune and synth tracks, many under CC0 (no credit needed), e.g. [short chiptune loop](https://opengameart.org/content/short-chiptune-loop) and [chiploop](https://opengameart.org/content/chiploop), both CC0. Synthwave packs exist too but are often CC-BY, which means credit required.
- **[Freesound.org](https://freesound.org/)**: synth loops and jingles. Filter by licence: CC0 is free to use, CC BY needs credit, and CC BY-NC is non-commercial only, so avoid it for a portfolio that wins you paid work.
- **[Pixabay Music](https://pixabay.com/music/)**: big searchable catalogue ("synthwave", "80s", "retro"), generally free with no attribution under the Pixabay Content License. Check the licence page and each track's page before relying on it.
- **Avoid the YouTube Audio Library** for a website. Its terms are written around use on YouTube, and use elsewhere is unclear track by track.

Keep a note of each track's source and licence (and credit CC-BY artists somewhere on the site).

## Placeholders to replace

- **TV, furniture, props and room:** procedural geometry and canvas textures, laid out in `layout.js`. They get replaced by Blender models with baked lightmaps (including a TV-light channel) in Phase 5.
- **Projects:** canvas-drawn mock sites (Neon Burger Co., Field Notes, Orbit Analytics), test patterns and two ffmpeg-generated loops. Real screenshots and recordings arrive in Phase 6.
- **Channel music:** synthesized placeholder loops; see [Channel music](#channel-music).
- **Arm, hand and remote:** procedural capsules and rounded boxes (`src/viewmodel/`). They get replaced by a rigged model in Phase 5, with the same IK targets. The clickable DOM remote (`src/lab/RemotePad.js`) stays as a lab tool and drives the same `Remote`.
- **Brand badge:** "Lumatron" is a stand-in for your own mark (`createBadgeTexture` in `src/world/textures.js`).

## Roadmap

1. ~~Screen lab: both shader stages, tuning UI, presets~~
2. ~~Channel engine: tuner state machine, remote with IR latency, number entry, volume, synthesized audio~~
3. ~~Greybox apartment, seated camera, framing per aspect ratio, screen rect~~
4. ~~Arm and remote: viewmodel pass, pointer → thumb mapping over every button, highlight, thumb presses~~ (this phase)
5. Art pass: Blender models, baked lightmaps with a TV light channel, post-processing
6. Content: project data, PHP-rendered routes and fallback, TV Guide case-study overlay
7. Polish: power-on intro, mobile, accessibility (reduced motion, keyboard), quality tiers
