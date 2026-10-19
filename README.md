# Retro Portfolio

A web and design portfolio set in a dingy 1980s apartment. You stare at an old CRT TV, raise a chunky remote, and every channel is a project.

**Status: Phase 6 under way: the content pipeline is in, with placeholder projects.** Your work lives in `content/projects.js`: each project gets a channel (a still, a slideshow, a scrolling page or a video), a story you bring up with **INFO** on the remote, and a plain page of its own at `work/<slug>/` for search engines, link previews and browsers without WebGL. Swap in your own projects (see [Your work](#your-work)) and the TV, the listings magazine and the pages all follow.

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

## Publishing to GitHub Pages

`.github/workflows/pages.yml` runs the tests, builds the site and publishes `dist/` to GitHub Pages on every push to `main`. You can also run it from the **Actions** tab (**Deploy to GitHub Pages → Run workflow**).

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site then lives at `https://<user>.github.io/<repo>/`, and each run's deploy step links to it. The build uses relative paths, so it works in that subfolder as is. On a free GitHub plan the repository has to be public for Pages.

## Screen lab controls

The set starts switched off. Press <kbd>P</kbd>, or move your thumb to the red **POWER** button (top right of the remote) and click. That first press also enables sound, since browsers block audio until you interact with the page.

| Input | Remote button | Action |
|---|---|---|
| Move the mouse, middle of the screen | | Your thumb glides over the remote; the button it's over lights green |
| Move the mouse towards the edges | | Your arm drops out of view and you look around a little |
| Click, middle of the screen | the lit one | Press it with your thumb; hold CH or VOL to repeat |
| Point at something towards the edges | | If it glows with an outline, it's clickable: the table lamp switches on and off, the listings magazine opens |
| Click a listing in the open magazine | | Tune to that show (switching the set on if it's off) |
| <kbd>Esc</kbd>, or click off the magazine | | Put the magazine back down |
| <kbd>P</kbd> | POWER | Power on/off (warm-up, degauss, collapse to a dot) |
| <kbd>↑</kbd> <kbd>→</kbd> / <kbd>↓</kbd> <kbd>←</kbd> | CH ▲ / ▼ | Channel up/down; skips unprogrammed numbers; hold to surf |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | CH ▲ / ▼ | Channel up / down |
| Scroll up / down, or pinch | | Zoom in on the set / back out to the whole room (orbit view keeps the wheel for its own zoom) |
| <kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd> | 1–9, 0 | Tune straight to channel 1–9; 0 is channel 10 |
| <kbd>R</kbd> / <kbd>Backspace</kbd> | RCL | Recall the previous channel |
| <kbd>+</kbd> / <kbd>−</kbd> | VOL + / − | Volume, with the OSD bar; hold to repeat |
| <kbd>M</kbd> | MUTE | Mute |
| <kbd>I</kbd> | INFO | The story behind the show on now, as a page from a TV listings magazine; <kbd>Esc</kbd>, <kbd>I</kbd> or a click outside puts it away |
| <kbd>D</kbd> | | Degauss |
| <kbd>V</kbd> | | Cycle views: seated (you, on the couch), orbit (free debug camera), flat screen |
| <kbd>H</kbd> | | Hide the panels |

- In the seated view, the middle of the screen is the **remote area**: an upright box, 70% of the window's height tall and half that wide, centred, then stretched a little to the right so it takes in the whole TV, with its bottom edge raised to just above the coffee table and the can (no wider than the window). There the view holds still, the pointer moves your thumb and arm, and the cursor hides because your thumb is the cursor. Outside it the arm drops out of view, the cursor comes back, and the view turns towards the pointer. The turn is nothing at the box's edge and grows to about 11° sideways or 7° up and down at the edge of the screen. Clicks out there press nothing. In orbit view, drag to move the camera.
- The **Screen Lab** panel starts collapsed: click its title bar (top right) to open it.
- Every key, scroll and on-screen remote press plays out with your thumb too, so you always see which button went down.
- Drop any image or video onto the page (or use **Source → Load image / video…**) to add it as the next channel. Dropped videos play their soundtrack through the TV speaker.
- Channels start at 1, so the number keys reach the first ten. Tuning a number with nothing on it gives dead air: snow and hiss.
- **TV → Speed (slow-mo)** runs the lab clock down to 2% speed, so you can study a channel change frame by frame.
- **Tuner** sets reduced motion, rough-change odds, IR latency and the snow/surf timings. **Sound** sets the volume and mix.
- Every slider in **Signal**, **Tube** and **Glass** is live. Changes auto-save to this browser. **Presets → Copy JSON** exports the current look; paste it into `PRESETS` in `src/screen/params.js` to make it permanent.

## Your work

Every project is an entry in **`content/projects.js`**, in channel order (the number keys tune straight to the first nine), with its media in **`public/work/<slug>/`**. A project can ask for a channel of its own with `channel: 8`; the rest take the lowest numbers still free, in order, and the test cards fill in after them (`src/content/lineup.js`, shared by the TV, the listings and the pages). A show's time slot follows its number: channel 1 at 7:00, each one half an hour later. The comment at the top of that file lists every field. The test cards come on the channels after your work. `content/site.js` holds the site's title, description and published URL.

**Adding a project:** make the folder `public/work/<slug>/`, put the media in it, add an entry to `content/projects.js`, and run `npm test`. The content tests check what the TV and the pages can show: a URL-safe slug, a channel number (if it asks for one) of 1–99 that no other project has, a channel name of at most 18 characters in the on-screen display's font (A–Z, 0–9, space and `- . , : · / & ! ? +`), a blurb of at most 32 characters and a summary of at most 155, a valid TV type, every named file present, and alt text for every picture. Remove `placeholder: true` once it's yours; until then the story and the page say it's a placeholder.

**What plays on the channel** (`tv`). The set draws every channel into a 640×480 picture, so stills, slideshows and pages are drawn into a 4:3 frame first. Media loads the first time you tune in, behind a PLEASE STAND BY card, and the rest load in the background a few seconds after the page opens. Channels air on the clock, so tune away and back and the show has moved on.

| Type | Media | Notes |
|---|---|---|
| `image` | One still, 4:3, **1280×960** (1024×768 at least). PNG for flat UI, JPEG/WebP (quality 85) for photos. | `fit: 'contain'` letterboxes instead of cropping to 4:3; `focus: [x, y]` (0–1) picks the crop's centre. |
| `slideshow` | 3–8 stills as above, in `slides`. | `seconds` per slide (5 by default; twice that with reduced motion). |
| `scroll` | A full-page capture **1024 px wide, up to 4096 tall**, JPEG/WebP (quality 80), taken at 1× in a 1024–1280 px window. | Shown in a browser window that holds, scrolls down, holds and scrolls back up; `url` is the address in its bar. With reduced motion it steps down a screen at a time. |
| `video` | A loop, **960×720** (or 640×480), 24–30 fps, 10–30 s, H.264 MP4 (yuv420p, faststart) plus a VP9 WebM, no audio track unless it should be heard; and a `poster`, 1280×960. | It has to loop without a seam: you tune in mid-loop. The poster shows while it loads, and instead of it with reduced motion. |

On the CRT, keep what matters in the middle 80% of the frame (the channel number sits top right and the name along the bottom as you tune in), headings at least 30 px tall at 960 px, and off-white (#f2ede4) rather than pure white for big bright areas. `music` is an optional MP3 loop for the channel (128–192 kbps, 30–90 s, about −16 LUFS).

**The story** (INFO, `src/content/StoryOverlay.js`) and **the project's page** share one article (`renderCaseStudy` in `src/content/caseStudy.js`) and one stylesheet (`src/content/story.css`), laid out like a TV listings magazine: channel and time slot, title, summary, `hero` (16:9, **1600×900**, WebP or JPEG, ≤ 250 KB), the facts (role, client, year, credits, tech), the `story` (paragraphs separated by blank lines), an optional `video` (**1280×720** MP4 with a poster), the `gallery` (desktop screenshots **1600×1000**, phone screens **750×1624**, each with alt text and an optional caption) and the `links`. `share` is a **1200×630** image for link previews (the hero stands in otherwise). The story is a modal dialog: focus moves into it and stays there, the arrow keys scroll it, and it hands focus back when it closes.

**The pages** (`src/content/pages.js`, written by the Vite plugin in `src/content/vitePlugin.js`): `npm run build` writes `work/<slug>/index.html` for each project (next to its media), `work/index.html` listing them all, `sitemap.xml` and `robots.txt`, and fills in the TV page's title, description and link previews from `content/site.js`. The dev server serves the same pages straight from the content, so an edit shows up on a refresh. Each page has absolute link-preview URLs, the credits, and a **Watch it on the TV** link to `?channel=<slug>`, which switches the set on tuned to that show. The TV page also carries plain links to every project, hidden until a keyboard reaches them, and browsers without WebGL 2 go straight to `work/`.

## The apartment

```
            TV wall (paneling) ── plant · print · lamp on end table · TV on stand · bookshelf
   door ▏                                                                 ▕ window + blinds
 (ajar,  ▏                    rug · coffee table                          ▕  ← neon sign
  hall)  ▏                                                                ▕    across the street
            couch (you sit here, eye 1.1 m) · floor lamp behind
```

- **Layout:** everything is placed from `src/world/layout.js`. The room, the seated camera and the painted glass reflections all read from it, so moving the lamp moves its reflection too.
- **Light:** the TV (its picture's average colour, see `TVGlow`), two warm lamps, the hallway bulb, and a pink neon sign across the street. The neon is the one shadow-casting light, and the blinds are real slats, so it throws genuine stripes across the floor, table and TV. **Room → Blind tilt** changes them.
- **The corner right of the TV** has a small three-shelf bookcase (`src/world/bookshelf.js`): a lava lamp glowing on top, a stuffed panda, a few books, and a clock radio on the middle shelf. The lava lamp (`src/world/LavaLamp.js`) is a single shader that raymarches the inside of the glass bulb: five wax blobs rise and sink on their own slow cycles, merging smoothly with each other and with the pool at the bottom, in a softly glowing liquid. A small light inside it tints the corner in the lamp's colours. **Room → Bookshelf + lava lamp** takes the bookcase away, and **Lava lamp light** sets how much it lights the corner.
- **The can on the coffee table** (click it for a drink) is a soda can model (`public/models/can/soda-can.glb`, from Sketchfab, see [Credits](#credits)), sized to a real 12 oz can and turned so its logo faces the couch. Its metal picks up the room's reflections. Its textures were cut from 1024 to 512 px (256 for the metal/roughness map), taking the file from 460 KB to 96 KB with no visible difference; its tangents stay, because without them three.js shades the can differently. `fitModel` in `props.js` sizes and stands any model like this; the procedural lager can stands in until it loads.
- **The clock radio** sits right of the novels on the bookcase's middle shelf, its clock turned a little towards the couch. It's a Sketchfab model (`public/models/radio/clock-radio.glb`, see [Credits](#credits)) sized to 7 cm tall by `placeRadio` in `bookshelf.js`, which also makes it matte (the model leaves its material at glTF's default, fully metallic, which renders black without reflections). Its red LED digits glow, from an emissive map painted for it and baked into the file with `slim-glb.py --emissive`, and a faint amber light just in front of it (its displays' red and green, mixed) picks out its case and the shelf round it, so you can make it out in the dark. **Room → Clock radio glow** sets how much; the light is there from the start (dark until the model arrives), so the scene's light count doesn't change and recompile every material when it loads. Its tuning dial (station numbers and needle) was painted out of the texture, leaving the window empty (`slim-glb.py --source` swaps in the edited copy), and a level meter fills the window instead (`RadioMeter.js`). Its texture was cut from 1024 px PNG to 512 px JPEG, taking the file from 318 KB to 48 KB.
- **The snake plant** stands in the far left corner, beside the end table, where the table lamp lights it. Its leaves are a low-poly Sansevieria model (`public/models/plant/sansevieria.glb`, 1,100 triangles, coloured from a gradient palette texture), standing 0.72 m out of the procedural terracotta pot (turned, with a rolled lip, and dark speckled soil a few centimetres down inside), with a little soil showing round the rim. `replaceLeaves` in `props.js` sizes it to the pot and makes it matte. Until the model loads, or if it fails to, simple procedural blades stand in.
- **Tuning:** the Room panel sets lamps, neon, blind tilt, dust brightness and size, and the coffee table's varnish. **Table reflectivity** is how strongly it reflects the TV and lamps; **Table gloss** is how sharp those reflections are.
- **Ambient motion:** dust motes sparkle in the TV's beam and take on the picture's colour, the neon can buzz and stutter (**Room → Neon flicker**, off by default), rain runs down the window, and the VCR blinks 12:00.
- **Seated camera** (`src/camera/SeatedCamera.js`): a fixed seat with a slow breath (**Camera → Breathing**, 0 for a dead-still camera). Over the remote area the pointer moves your arm, not your head; outside it, the head turns a little towards the pointer (**Camera → Look around** scales it, 0 turns it off; reduced motion halves it). `src/camera/pointerZones.js` works out which zone the pointer is in. `fitVerticalFov` keeps a box around the TV in frame at any aspect ratio. Wide screens get the preferred 42° with more room either side; tall phones zoom out until the TV fits across. The TV sits a little above centre, leaving the bottom of the frame for the coffee table and the remote.
- **Zoom:** scrolling up eases the view in to a 20° field of view, and scrolling down eases it back out to the framed view (0.7 s, ease-in-out; 0.15 s with reduced motion). A reversal mid-zoom carries on from where the view is. Your arm zooms with the room.
- **Screen rect:** `seated.screenRect(tv.screen)` gives the TV glass's on-screen bounds in normalised coordinates every frame, for anything that has to line up with the picture. **Camera → Show screen rect** draws it, along with the remote area.
- **Reduced motion:** with `prefers-reduced-motion`, breathing stops and the arm follows the pointer half as much.

## The arm and remote

- **The mapping:** the middle 80% of the screen maps onto the remote's face, the way you see it. Up is towards the tip (POWER, then the number pad), down is the VOL and CH rockers, and left and right go across. The nearest button is the target, with a little hysteresis so the thumb doesn't flicker on a boundary (`src/viewmodel/thumbing.js`). The middle of the screen is **8**, and the bottom right is **CH ▲ / ▼**.
- **The hand** is the WebXR generic hand model (`public/models/hand/right.glb`, 94 KB). Its joints follow the WebXR Hand Input names, so the thumb's `thumb-metacarpal`, `thumb-phalanx-proximal` and `thumb-phalanx-distal` are our CMC, MCP and IP. The grip was fitted numerically. The hand lies along the remote, which crosses the palm diagonally. With the thumb on CH ▲, the wrist sits just behind the remote's tail, so the forearm carries straight on back towards you with less than 20° of sideways wrist bend. No skin goes more than a couple of millimetres into the remote, and the fingertips wrap its left edge. For the far buttons the hand shifts 40% of the way up the remote and the thumb stretches for the rest. The model's thumb is short for a remote this wide, so the grip stretches it by 20%. Until the model loads, or if it fails to, the built-in hand made from capsules stands in.
- **INFO** sits top left on the remote, opposite POWER; both are a little down from the tip, where the thumb reaches them comfortably.
- **The thumb** is three bones, solved every frame. First the CMC joint by the wrist swings the metacarpal: as you reach across the remote it carries the big knuckle up and over the face, and the fleshy pad at the base of the thumb stretches with it. Then the MCP and IP joints bend (two-bone IK) to put the pad on the button. It hovers just above the targeted button, then sinks with it on a press. The whole grip shuffles along the remote to reach the far buttons, the way you would, and the arm (shoulder → elbow → wrist, also IK) follows. The arm also drifts a few centimetres after the pointer, and the remote's tip swings that way a little while it stays aimed at the set. The forearm leaves the hand along the wrist's own axis, with the same oval section as the hand model's wrist. The flannel cuff starts just before the hand mesh ends, so the two meet with no seam or kink. The elbow sits at the far end of the forearm, and the upper arm runs from there up to the shoulder.
- **Presses:** a click goes to `Remote.hold`. The remote fires `press` immediately, and `ArmRig` plays the thumb press: down 60 ms, hold, up 100 ms. The button sinks, the IR LED blinks, and the TV reacts after the IR latency. Keys, scroll and the lab remote go through the same `Remote`, so the thumb presses for those too.
- **Tuning:** the **Arm & remote** panel moves the remote around (across, height, reach), tilts and rolls it, and scales it. It also sets how far the arm follows the pointer (**Follow pointer**) and how firmly the thumb settles onto the target. You can also switch the highlight off there, and switch between the WebXR and built-in hands (**Hand**). **Grip (WebXR hand)** has every grip setting: wrist position, hand heading, tilt and roll, size, finger bends, the wrap of each finger, thumb length and swing, and how far the grip follows the thumb up the remote. **Copy grip JSON** copies the result, ready to paste into `GRIP_DEFAULTS` in `src/viewmodel/XRHand.js`.
- When the pointer leaves the remote area or the page, the arm lowers out of view; it comes back up when the pointer returns. Inside the box, the box itself maps onto the remote's buttons, so every button is in reach without leaving it. **Arm & remote → Remote area** sets its height, **Remote area width** its width (as a share of its height; 1 makes it square), **Remote area: extra on the right** how far it stretches to the right, and **Remote area: bottom raised** how far its bottom edge comes up. On touch screens a tap in the box aims and presses in one go.

## Things you can click

Outside the remote area, pointing at the room finds the first visible surface under the pointer, so you can't click through the furniture. If that surface belongs to something interactive, it glows with an outline, the cursor becomes a pointer, and a click does something (`src/world/Interactions.js`).

- **The outline** (`src/world/HoverOutline.js`) is drawn in screen space. The hovered object is drawn as a white silhouette into an offscreen mask on its own layer, then a full-screen pass traces the mask's edge over the finished frame with a gentle pulse. The line is the same width whatever the object's shape, and nothing extra is drawn when nothing is hovered.
- **The table lamp** switches its light, shade and fringe glow. Coming on, the bulb catches with a quick stutter; going off, the filament fades. A synthesized switch click plays (`lampLevel` in `Room.js`, `lampSwitch` in the audio engine).
- **The listings magazine** (`src/world/Magazine.js`) lifts off the coffee table to a reading spot in front of you, sized to fill most of the view at any zoom. Its cover swings open on a hinge, with a paper rustle. The inside spread is drawn on canvases (`src/world/listings.js`). The left page is a welcome and how-to-watch guide; the right page lists every channel with a time slot and a one-line blurb (`blurb` on each source in `src/lab/sources.js`), and marks the show on now. The row under the pointer lights up. Clicking a listing tunes the set to it (switching it on if need be) and puts the magazine back down, exactly where it was. Esc or a click off the magazine also puts it down.
- **The lava lamp** on the bookshelf changes colour, with a bubbly bloop. Each click picks a random wax hue at least 54° round the colour wheel from the last, in a darker, softer liquid 40–130° away from it (`lavaColours` in `LavaLamp.js`). The wax, the liquid and the light the lamp casts on the corner all fade to the new scheme over about half a second. Click again mid-fade and it heads straight for the newer colours.
- **The snake plant** (pot and all) does a twirl: it hops, spins a full turn, lands with a clay clunk (`potClunk` in the audio engine) and a wobble that circles round and dies away like a settling coin, and stands exactly where it was (`Twirl.js`). With reduced motion it just spins. Clicks wait until it's done.
- **The stuffed panda** on the bookshelf gets a squeeze: it squashes down and bulges out (keeping its volume), then springs back up with a wobble (`Squishy.js`; with reduced motion it comes straight back). Its squeaker squeals as it's squeezed and gives a softer, falling squeak as it fills back up with air (`squeak` in the audio engine, a little different in pitch each time).
- **The clock radio** on the bookshelf switches on with a click of its switch and plays its station (`public/media/radio/station.mp3`, 3½ minutes). Click again to switch it off; the next click picks up where it left off, or starts again from the top once the song has finished. The MP3 is streamed through an `<audio>` element rather than decoded up front, then through a little speaker's EQ, panned a little to your right where the bookcase is, and into the room's reverb (`toggleRadio` in the audio engine). It's mastered loud, so it plays at about the TV's starting volume; the TV's volume and mute don't touch it. While it plays, the level meter beside the clock bounces: two rows of 20 LED segments, green through yellow to red, like a tape deck's (`RadioMeter.js`, one instanced mesh, glowing). Both rows kick up at random every tenth of a second or so and drop back between kicks, and the top segment lit hangs on half a second before it follows (peak hold). It doesn't follow the music, which is compressed so hard its level hardly moves; it just shows the radio's on. The segments skip the scene's tone mapping, so they keep their colour, like real LEDs. Switched off, they drop back to dark; with reduced motion they light to a steady level instead of bouncing.
- **The soda can** gets drunk (`src/viewmodel/Drink.js`, about 12 seconds the first time). It stands on the left of the coffee table, just outside the remote area, so you can point at it. You lean in towards the coffee table and your left arm reaches out, picks the can up with a tink and brings it to the middle of the view. The first time, your right hand comes over (leaving the remote behind, its fingers closed into a loose fist), and your thumb reaches over the rim and levers the tab up, with a crack and a fizz. Up to your mouth: you turn the can in your hand to bring the opening to your lips, your head tips back, three gulps. Back down, a satisfied "ahhh", then you lean in again and put it back exactly where it was, with a tok. After that the can stays open, so later drinks skip the tab. The pointer and clicks wait while your hands are full; the remote's keys still work.
  - **How it runs:** one clock drives tracks of keyframes, eased between: the left hand's pose, how closed it is, how far you lean and tip your head back, the right hand borrowing the remote, the tab, and the sound cues. The hand's poses are either at the table (world space) or in front of you (camera space, so they move with your head). The can sits in the hand in the same pose it had when the hand closed round it on the table, so putting it back returns it exactly.
  - **Your left hand** is the WebXR generic left hand (`public/models/hand/left.glb`) on a flannel sleeve shared with the right arm (`Sleeve.js`). `CanHand` places it against the can and curls each finger, joint by joint, just far enough to meet the can (`wrapAngles`), then swings the thumb round the near side and wraps that too. Its placement was fitted numerically: no skin inside the can or below its base (the table, when it's standing there), fingertips resting on it, and the wrist in line with the forearm. The arm follows from your left shoulder (two-bone IK); when the can's out of reach, the upper arm, mostly out of view, stretches rather than leave the hand behind. **Room → Can grip (left hand)** tunes the placement; the fingers re-wrap to fit.
  - **Opening the can:** the model's tab is only painted into its normal map, so `CanTop` (`src/world/CanTop.js`) covers the lid with a plain one carrying a real pull tab on a rivet, and the mouth it opens. While the tab opens, `ArmRig`'s `override` borrows your right hand: the remote is hidden (it comes and goes while the arm is lowered out of view, so it's never seen to vanish), the fingers close into a fist (`XRHand.setFist`), and the hand moves beside the can, placed as if round the remote stood up against it. The thumb tip goes on the tab's ring, its middle joint bent up so it comes down over the rim.
  - **Sounds:** the tink, the crack and fizz, the gulps, the "ahhh" (a sawtooth voice falling in pitch through the formants of the vowel, breathy at each end) and the tok are all synthesized in `AudioEngine`.
  - **Room → Have a drink** plays it from the lab, and `lab.drink.seek(seconds)` jumps to any moment of it.
- **Adding more:** call `interactions.add(object, { name, onClick, enabled })` in `main.js` for anything in the room. Models that load later are added to what can block the pointer as they arrive.
- **Baked lighting later:** if the room's lighting is baked, switchable lights like the table lamp need their own per-light map, blended at runtime (like the TV-light channel), so they keep switching.

## Post-processing

`src/render/PostFX.js` polishes each finished frame. The room still renders straight to the screen first, exactly as before: the CRT, the neon sign and the VCR clock skip tone mapping on purpose, which an offscreen render would undo. That frame is copied into a texture and run through three steps:

- **Ambient occlusion** (three's GTAO): soft darkening in corners, under shelves and where objects touch. It draws the scene once more for depth and normals, so it's the most expensive step and only runs on High.
- **Bloom, but only from things that give off light**: the lamp shades, the neon, the VCR clock, the remote's lit button. It's kept subtle by default, and the TV picture gets none at all so it stays perfectly legible (**Screen glow** can bring some back). Each frame these are drawn white into a small glow mask (the TV in grey), with your arm and the magazine in your hands drawn first in black so they block what's behind them. The bloom only takes bright pixels inside the mask, so the shiny coffee table and white magazine pages don't glow.
- **Film**: subtle grain (still, with reduced motion), a vignette, and a light grade: a touch more saturation and contrast, with shadows leaning slightly purple.

**Quality tiers:** High has everything; Medium has no ambient occlusion; Low has no post-processing at all. On **Auto** (the default), it starts on High (Medium on touch screens), and if a few seconds after load average under 40 fps it steps down a tier. It never steps back up during a visit. **Post-processing** in the lab panel sets the tier, shows the one in use, and has a slider for every effect.

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
index.html                 the TV's page (the build adds its title, link previews and plain links)
content/
  projects.js              your work: one entry per channel (+ the content tests in src/content/)
  site.js                  the site's title, description, published URL and credits
src/
  main.js                  wiring: renderer, views, channels, input, render loop
  content/                 from content/ to the TV and the pages
    channels.js            each project's channel: still, slideshow, scrolling page or video (+ channels.test.js)
    caseStudy.js           the story behind a show, as an article (+ pages.test.js)
    StoryOverlay.js        the story over the TV (INFO): a modal dialog
    pages.js               the static pages, work index, sitemap and robots.txt (+ pages.test.js)
    vitePlugin.js          writes those at build time, and serves them in dev
    media.js               where a project's media lives, for the app and for its page
    story.css              the article, the pages and the overlay, styled like a listings magazine
  tv/
    Television.js          the set: power, tuner state machine, number entry, volume, OSD
    Remote.js              buttons, with infrared latency
    Television.test.js     state machine tests
  audio/
    AudioEngine.js         synthesized sound: speaker chain, static, clicks, relay, degauss, whine, the drink
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
    XRHand.js              the WebXR hand model gripping the remote: grip fit, finger curls, thumb IK (+ XRHand.test.js)
    handRig.js             what both WebXR hands share: joints, rest frames, bending, placing, the wrist's section
    Sleeve.js              the flannel sleeve from wrist to shoulder, for either arm
    CanHand.js             your left hand round the can: fingers and thumb wrapped to fit (+ CanHand.test.js)
    LeftArm.js             your left arm: the can hand on the end of a sleeve, IK from the shoulder
    Drink.js               the drink: timeline, poses, the can in hand, the right thumb on the tab (+ Drink.test.js)
    Hand.js                built-in fallback hand: palm, curled fingers, three-joint thumb (CMC swing + IK), grip slide
    thumbing.js            button layout, pointer → button, two-bone IK, bone swing (+ thumbing.test.js, Hand.test.js)
  render/
    PostFX.js              post-processing: copy the frame, AO, glow-masked bloom, film grade; quality tiers (+ QualityWatch.test.js)
  camera/
    SeatedCamera.js        the viewer: seat, framing, breathing, zoom, screen rect (+ SeatedCamera.test.js)
    framing.js             fitVerticalFov, projectBounds (+ framing.test.js)
  world/                   procedural stand-ins until the Blender art pass
    layout.js              where everything is
    Room.js                walls, floor, ceiling, door, lights; assembles the rest
    furniture.js           TV stand + VCR + tapes, coffee table, couch, end table, lamps
    props.js               can, magazines, plant, framed print; fitting models in their place (+ props.test.js)
    CanTop.js              the can's lid: a pull tab that levers up, and the mouth it opens (+ CanTop.test.js)
    bookshelf.js           three-shelf bookcase: books, a stuffed panda, the lava lamp, the clock radio (+ bookshelf.test.js)
    LavaLamp.js            lava lamp: raymarched wax blobs in the bulb, its light, random colours (+ LavaLamp.test.js)
    Squishy.js             a spring for squeezing something soft, like the panda (+ Squishy.test.js)
    Twirl.js               a hop, a spin and a wobble for the plant (+ Twirl.test.js)
    RadioMeter.js          the clock radio's LED level meter, bouncing while it plays (+ RadioMeter.test.js)
    Magazine.js            the listings magazine: hinged cover, lifts to you, picks a listing
    listings.js            its inside pages, drawn on canvases; row hit-testing (+ listings.test.js)
    Interactions.js        what's clickable and under the pointer, with occlusion (+ Interactions.test.js)
    HoverOutline.js        screen-space outline round the hovered thing
    windowView.js          window, real blind slats, rain glass, the street and its neon
    atmosphere.js          dust motes, rain shader
    TV.js                  ~20" woodgrain set: fascia, dials, rabbit ears
    TVGlow.js              screen-coloured room light
    screenGeometry.js      curved (spherical cap) glass
    textures.js            canvas textures for all of the above, plus the room reflection
  lab/                     screen-lab-only tooling
    LabGui.js · RemotePad.js · ScreenRectOverlay.js · sources.js · testCards.js · storage.js
  styles/                  main.scss, _tokens.scss, _remote.scss
public/work/<slug>/        each project's media (its page is written next to it at build time)
public/media/test/         placeholder videos (MP4 + WebM)
public/media/music/        placeholder channel music (MP3 loops)
public/media/radio/        what the clock radio plays (MP3)
public/models/hand/        WebXR generic left and right hands (.glb) and their MIT licence
public/models/plant/       Sansevieria leaves for the snake plant (.glb)
public/models/can/         soda can on the coffee table (.glb) and its CC BY licence
public/models/radio/       clock radio on the bookshelf (.glb) and its CC BY licence
scripts/
  make-test-media.sh       renders the test videos
  make-placeholder-music.mjs  synthesizes the music loops from note data
  slim-glb.py              shrinks a .glb's textures and buffers for the web, adds glow maps (Python + Pillow)
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
- **Projects:** five placeholder projects in `content/projects.js` (Neon Burger Co., Field Notes, Orbit Analytics, Game of Life, Gradient Reel), with placeholder stories. Their pictures were exported from the canvas mock sites in `src/lab/testCards.js` into `public/work/`; the videos are the ffmpeg loops in `public/media/test/`. Replace them with your own (see [Your work](#your-work)). **The Reacharound** on channel 8 is real work: its pictures, including the TV's slideshow, were captured from the live site, and its story is a starter draft (still marked `placeholder` until it's reviewed).
- **Channel music:** synthesized placeholder loops (see [Channel music](#channel-music)), except The Reacharound's, “Countdown Groove” (`public/media/music/reacharound.mp3`), supplied by the site owner.
- **Hand:** the WebXR generic hand (see [Credits](#credits)). A more realistic rigged hand can replace it. Any model with three thumb joints and three per finger works with the same IK; only the joint names and the grip fit change.
- **Arm and remote:** procedural cylinders and rounded boxes (`src/viewmodel/`), still to be replaced in Phase 5. The clickable DOM remote (`src/lab/RemotePad.js`) stays as a lab tool and drives the same `Remote`.
- **Brand badge:** "Lumatron" is a stand-in for your own mark (`createBadgeTexture` in `src/world/textures.js`).

## Credits

- **Soda can model:** ["Soda Can"](https://sketchfab.com/3d-models/soda-can-1b63dd4832144e89955ecf2f70e8af4b) by [junhyde](https://sketchfab.com/junhyde), [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/), with its textures downsized for the web; the notice is in `public/models/can/LICENSE.md`. The Pepsi logo on its label is a trademark of PepsiCo, Inc.
- **Clock radio model:** ["Digital Radio Clock"](https://sketchfab.com/3d-models/digital-radio-clock-23b2d0e81d414836877c555e5b5fc18d) by [NoMoreFeelings](https://sketchfab.com/NoMoreFeelings), [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/), with its tuning dial painted out, its texture downsized for the web and a glow map added for its clock; the notice is in `public/models/radio/LICENSE.md`.
- **Clock radio station:** `public/media/radio/station.mp3`, supplied by the site owner.
- **Plant model:** the Sansevieria (`public/models/plant/sansevieria.glb`), supplied by the site owner; its texture is from a "tiny treats" palette.
- **Hand models:** the generic left and right hands from [WebXR Input Profiles](https://github.com/immersive-web/webxr-input-profiles) (`@webxr-input-profiles/assets` 1.0.20). MIT licence, © 2019 Amazon; the full notice is in `public/models/hand/LICENSE.md`.

## Roadmap

1. ~~Screen lab: both shader stages, tuning UI, presets~~
2. ~~Channel engine: tuner state machine, remote with IR latency, number entry, volume, synthesized audio~~
3. ~~Greybox apartment, seated camera, framing per aspect ratio, screen rect~~
4. ~~Arm and remote: viewmodel pass, pointer → thumb mapping over every button, highlight, thumb presses~~ (this phase)
5. ~~Art pass: rigged hands, clickable room (lamp, listings magazine, lava lamp, the drink), post-processing, models for the plant and can~~ (baked lighting skipped: the lights stay live)
6. Content: project data, static pages per project with link previews and a sitemap, TV Guide case-study overlay (pipeline done, with placeholders; your projects next) (this phase)
7. Polish: power-on intro, mobile, accessibility (reduced motion, keyboard), quality tiers
