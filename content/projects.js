// Your work, one channel each, in channel order unless a project asks for a
// number (keys 1–9 tune straight to the first nine). Media sits in
// public/work/<slug>/ and is named here by file name; a path starting with /
// is from public/ instead, and a full URL is used as it is. See "Adding a
// project" in the README for sizes and formats.
//
//   slug         the project's URL: /work/<slug>/
//   channel      the channel number it airs on, 1–99 (optional; without one it
//                takes the lowest number still free, in the order listed here)
//   name         channel name: ≤ 18 characters, A–Z 0–9 space - . , : · / & ! ? +
//   blurb        the line under it in the listings: ≤ 32 characters
//   title        full title, for the case study and the page
//   summary      one or two sentences, ≤ 155 characters
//   role, client, year, credits, tech, links { live, repo, … }
//   tv           what plays on the channel, one of:
//                  { type: 'image', src, fit?, focus? }
//                  { type: 'slideshow', slides: [src, …], seconds?, fit?, focus? }
//                  { type: 'scroll', src, url? }          a tall full-page capture
//                  { type: 'video', src: [mp4, webm], poster }
//                fit: 'cover' (default; crops to 4:3 round `focus`, [x, y] 0–1) or 'contain'
//   music        a looping MP3 for the channel (optional)
//   hero         the case study's lead image (16:9)
//   gallery      [{ src, alt, caption? }, …] for the case study
//   video        { src: [mp4, webm], poster } for the case study (optional)
//   share        a 1200×630 image for link previews (optional; falls back to hero)
//   alt          descriptions of the TV media, by file name
//   story        the case study: paragraphs separated by blank lines
//   placeholder  true while it's stand-in content (the pages say so)

export const projects = [
  {
    slug: 'reacharound',
    channel: 1,
    name: 'The Reacharound',
    blurb: 'Yoga gadget infomercial · web',
    title: 'The Reacharound: an infomercial you can spin',
    summary: 'A late-night infomercial as a website, for a 31 cm plastic yoga tool: big promises, a countdown and a 3D model you can spin in five colors.',
    role: 'Concept, design and front-end development',
    year: 2026,
    tech: ['HTML', 'CSS', 'JavaScript', 'Three.js', 'Web Components'],
    links: { live: 'https://jugglingjon.github.io/reacharound/' },
    tv: { type: 'slideshow', slides: ['tv-hero.webp', 'tv-colours.webp', 'tv-order.webp', 'tv-reviews.webp', 'tv-offer.webp'] },
    music: '/media/music/reacharound.mp3',
    hero: 'hero.webp',
    share: 'share.jpg',
    gallery: [
      {
        src: 'colours.webp',
        alt: 'The hero with the tool in Volt Lime: REACH AROUND. GRAB ON. BIND LIKE A PRO. over a blue sunburst, with five color swatches and a $29.99 price',
        caption: 'Pick your power color: the 3D model, the swatches and the order form change together',
      },
      {
        src: 'order.webp',
        alt: 'The order pop-up over the dimmed page: color swatches, two bundles of two, a $59.98 total and a Place order button',
        caption: 'The order form, two bundles in',
      },
      {
        src: 'reviews.webp',
        alt: 'REAL PEOPLE. REAL BINDS. above three testimonial cards in blue, pink and cream',
        caption: 'Testimonials: dramatized but emotionally accurate',
      },
      {
        src: 'offer.webp',
        alt: 'BUT WAIT, THERE’S MORE! over a blue sunburst, with a countdown and a 2-for-1 bundle card',
        caption: 'The countdown starts again the moment it runs out',
      },
      {
        src: 'faq.webp',
        alt: 'QUESTIONS YOU’RE TOO SHY TO ASK, an accordion with “Is the name intentional?” open: “Yes. Next question.”',
        caption: 'The FAQ',
      },
      { src: 'phone.webp', alt: 'The top of the page on a phone: the ticker, the header and the headline', caption: 'On a phone…' },
      { src: 'phone-tool.webp', alt: 'The tool in Flamingo Pink on a phone, under the price, with a Drag to spin it! hint', caption: '…the tool, in Flamingo Pink' },
    ],
    alt: {
      'tv-hero.webp': 'The Reacharound’s hero: REACH AROUND. GRAB ON. BIND LIKE A PRO. beside an orange plastic tool over a blue sunburst',
      'tv-colours.webp': 'The same hero with the tool in Volt Lime',
      'tv-order.webp': 'The order pop-up over the dimmed hero, with Sky Cyan picked and a $29.99 total',
      'tv-reviews.webp': 'REAL PEOPLE. REAL BINDS. above three testimonial cards',
      'tv-offer.webp': 'BUT WAIT, THERE’S MORE! with a countdown and a 2-for-1 bundle card',
      'hero.webp': 'The Reacharound’s hero: REACH AROUND. GRAB ON. BIND LIKE A PRO. beside an orange plastic tool over a blue sunburst',
    },
    story: `The Reacharound is a 31-centimeter plastic stick for yoga binds, and its website sells it the only way it deserves: as a late-night infomercial. A ticker of promises runs across the top, a starburst shouts NOW WITH MORE REACH, the sunburst behind the hero never stops turning, and every section ends in a button that costs $29.99.

The star of the page is the tool itself, a 3D model you can grab and spin. It's a small web component, <reach-viewer>, that loads the STL model and three.js on demand, turns slowly on its own with a gentle bob, carries a drag on with a little momentum, and fits its camera so the whole tool stays in frame at any screen size. It stops drawing when it scrolls out of view, and holds still for anyone who prefers reduced motion.

Pick a power color and the model, the swatches and the order form change together. The order pop-up sells bundles of two, the countdown in the offer starts again the moment it runs out, and the fine print at the bottom is where most of the jokes live.

The rest is plain HTML, CSS and a little JavaScript: the FAQ is an accordion, the swatches are a radio group you can work from the keyboard, and the sunbursts are CSS conic gradients, turned by an animated custom property.`,
    placeholder: true,
  },
  {
    slug: 'zones',
    channel: 2,
    name: 'Zones',
    blurb: 'Playlist builder app · web',
    title: 'Zones: playlists built from timed zones of music',
    summary: 'A mobile-first web app that builds Spotify playlists in timed zones: pick a song, a playlist or a phrase, set the minutes, and Claude fills it.',
    role: 'Design and development',
    year: 2026,
    tech: ['JavaScript', 'Sass', 'Vite', 'Spotify Web API', 'Claude API', 'Cloudflare Workers', 'SortableJS'],
    links: { live: 'https://jugglingjon.github.io/Zones/', repo: 'https://github.com/jugglingjon/Zones' },
    tv: { type: 'slideshow', slides: ['tv-1.webp', 'tv-2.webp', 'tv-3.webp'] },
    music: '/media/music/zones.mp3',
    hero: 'hero.webp',
    share: 'share.jpg',
    gallery: [
      { src: 'login.webp', alt: 'The Zones logo, three stacked blocks in purple, green and orange, above a Connect Spotify button', caption: 'Connect Spotify' },
      { src: 'empty.webp', alt: 'Create your first zone: a short explanation of zones and a Create zone button', caption: 'Starting out' },
      {
        src: 'new-zone.webp',
        alt: 'New zone: Song, Playlist and Phrase tabs, Cosmic Love by Florence + The Machine as the song, a 20 minute length slider and the name Introduction',
        caption: 'A new zone, inspired by a song',
      },
      {
        src: 'zone.webp',
        alt: 'The Introduction zone: 20:00 of 20 minutes, five songs with album art, Add song and Delete zone buttons, and a toast: Created Introduction, 5 songs, 20:00',
        caption: 'Zones fills it to length',
      },
      {
        src: 'playlist.webp',
        alt: 'My playlist: 1 h 19 m, 20 songs, 3 zones, shown as purple, green and orange blocks sized by their length',
        caption: 'Each zone is a block, sized by its length',
      },
      {
        src: 'finalize.webp',
        alt: 'Finalize playlist: a name, a description with each zone’s start time, a public toggle, Save to Spotify, and Copy list and Share buttons',
        caption: 'Save to Spotify, or copy it as a list',
      },
    ],
    alt: {
      'tv-1.webp': 'The Zones logo and tagline beside a phone showing a playlist of three colored zones',
      'tv-2.webp': 'Two phones: Create your first zone, and a new zone inspired by Cosmic Love',
      'tv-3.webp': 'Two phones: a filled zone of five songs, and the Finalize playlist sheet',
      'hero.webp': 'The Zones logo and tagline beside three phones: a new zone, a playlist of three zones, and a filled zone',
    },
    story: `Zones builds Spotify playlists out of zones: stretches of music with a vibe and a length. Pick a song, a playlist or a phrase as the inspiration, set the minutes, and Zones fills the zone. Stack a few up, say a gentle introduction, a long middle and a wind-down, and save the whole thing to Spotify as one playlist.

Spotify no longer gives new apps recommendations, so the suggestions come from Claude. It's asked for about 40 songs that fit the inspiration, each one is looked up with Spotify's search, duplicates go, and a small, tested fill function picks songs until the zone is within a minute of its length. The leftovers become the Add song suggestions, so topping up a zone needs no second request.

On the overview each zone is a block in its own color, sized by its real length. Zones and songs drag to reorder, a tapped song plays in Spotify's player, and anything that doesn't fit can go. Finalize writes a new playlist to your account with each zone's start time in its description, or copies the whole thing as a plain list.

There's no backend. It runs in the browser, logs in to Spotify with PKCE and talks to Claude directly with your own key, or through a small Cloudflare Worker that lets invited testers share one key, with a daily limit. It's plain JavaScript, Sass and Vite, mobile-first, with a light and a dark theme.`,
    placeholder: true,
  },
  {
    slug: 'arpa-h',
    channel: 3,
    name: 'ARPA-H',
    blurb: 'Health research agency · web',
    title: 'ARPA-H: a website for health breakthroughs',
    summary: 'The public website of the Advanced Research Projects Agency for Health: its mission, more than 40 research programs, funding, news and careers.',
    role: 'Lead Front-end development',
    client: 'Advanced Research Projects Agency for Health (ARPA-H)',
    tech: ['Drupal', 'U.S. Web Design System', 'JavaScript', 'GSAP', 'Swiper'],
    links: { live: 'https://arpa-h.gov/' },
    tv: {
      type: 'slideshow',
      slides: ['tv-home.webp', 'tv-mission.webp', 'tv-portfolio.webp', 'tv-programs.webp', 'tv-about.webp', 'tv-careers.webp', 'tv-news.webp', 'tv-spectra.webp'],
    },
    music: '/media/music/arpa-h.mp3',
    hero: 'share.jpg',
    share: 'share.jpg',
    gallery: [
      {
        src: 'arpa-map.png',
        alt: 'Interactive infographic with animated map',
        caption: 'Interactive infographic with animated map',
      },
      {
        src: 'arpa-swh.png',
        alt: 'Animated carousel element',
        caption: 'Animated carousel element',
      },
      {
        src: 'mission.webp',
        alt: 'The mission statement in large white type over a gradient from navy to pink and violet',
        caption: 'The mission brightens word by word as you scroll to it',
      },
      {
        src: 'portfolio.webp',
        alt: 'Investing in transformative health solutions: a carousel of program cards, each with a glowing illustration',
        caption: 'The program portfolio on the homepage',
      },
      {
        src: 'programs.webp',
        alt: 'The Programs page: a grid of white cards for 1-CURE, ADAPT, ADVOCATE, AIR and more, each with its own illustration and question',
        caption: 'Every program has its own card, illustration and question',
      },
      {
        src: 'about.webp',
        alt: 'The About page: Who We Are beside a photo of a scientist in safety glasses, and What We Fund beside a microscope image of cells',
        caption: 'About ARPA-H',
      },
      {
        src: 'careers.webp',
        alt: 'Career Opportunities beside a gloved hand holding up a vial, over a list of current openings',
        caption: 'Careers',
      },
      {
        src: 'spectra.webp',
        alt: 'The SPECTRA program page: its full name over navy beside a glowing illustration, and its solicitation status below',
        caption: 'A program page: SPECTRA',
      },
      { src: 'phone-home.webp', alt: 'The homepage on a phone: the official-government banner, the ARPA-H logo and the headline over the background video', caption: 'On a phone…' },
      { src: 'phone-programs.webp', alt: 'The 1-CURE program card on a phone, with its illustration and question', caption: '…and a program card' },
    ],
    alt: {
      'tv-home.webp': 'ARPA-H’s homepage: The future of health isn’t waiting, and neither are we, over a glowing holographic figure from the background video',
      'tv-mission.webp': 'The mission statement over a navy-to-pink gradient',
      'tv-portfolio.webp': 'Investing in transformative health solutions: program cards for SURPASS, SPECTRA, UNIQUE and PCX',
      'tv-programs.webp': 'The program grid: 1-CURE, ADAPT, ADVOCATE, AIR, APECx, ARPA-H BDF, BIOGAMI and BoSS',
      'tv-about.webp': 'Who We Are and What We Fund, beside a scientist and a microscope image of cells',
      'tv-careers.webp': 'Career Opportunities beside a gloved hand holding a vial',
      'tv-news.webp': 'News and Insights beside a robotic surgical arm',
      'tv-spectra.webp': 'The SPECTRA program page: Systems for Phenotypic Evaluation, Clinical Trajectories, Response, and Agency',
      'hero.webp': 'ARPA-H’s News and Insights page: the heading beside a robotic surgical arm in a ring of light',
      'share.jpg': 'ARPA-H’s homepage: The future of health isn’t waiting, and neither are we, over a glowing holographic figure from the background video',
    },
    story: `ARPA-H, the Advanced Research Projects Agency for Health, funds research that's too big, too complex or too high-risk for traditional funding or industry. Its website is the agency's front door: for researchers looking for funding, for patients and partners, for the press, and for people who might want to work there.

The homepage opens on a full-width background video under "The future of health isn't waiting, and neither are we", with a button to pause it. Below, the mission statement brightens word by word as you scroll it into view, and carousels lead into the program portfolio and the latest news.

Each of the more than 40 research programs has its own illustrated card and page: the question it asks, the problem and the proposed solution, its solicitation status and key dates, and the program manager behind it. The portfolio can be filtered by solicitation status and sorted.

It's built on Drupal with the U.S. Web Design System, so it has the parts every federal site shares, from the official-government banner to accessible menus and forms, with motion (GSAP and ScrollTrigger) and carousels (Swiper) layered on top.`,
    placeholder: true,
  },
  {
    slug: 'crowdsurf',
    channel: 5,
    name: 'Crowdsurf',
    blurb: 'Scroll-built pages · JS library',
    title: 'Crowdsurf: a page that builds itself as you scroll',
    summary: 'A JavaScript library: a crew of named cursors builds a web page in front of the reader as they scroll, dragging out boxes and typing in the text.',
    role: 'Design and development',
    year: 2026,
    tech: ['JavaScript', 'CSS Custom Highlight API', 'IntersectionObserver', 'Shadow DOM', 'esbuild', 'Playwright', 'TypeScript definitions'],
    links: { live: 'https://jugglingjon.github.io/crowdsurf/', repo: 'https://github.com/jugglingjon/crowdsurf', npm: 'https://www.npmjs.com/package/crowdsurf' },
    tv: { type: 'slideshow', slides: ['tv-1.webp', 'tv-2.webp', 'tv-3.webp', 'tv-4.webp', 'tv-5.webp'] },
    music: '/media/music/crowdsurf.mp3',
    hero: 'hero.webp',
    share: 'share.jpg',
    gallery: [
      {
        src: 'build-hero.webp',
        alt: "The Crowdsurf demo building its own headline: “A page that gets built while you scrol” half typed by a green cursor named Ines, the paragraph below being typed by Kofi, and a box being dragged out at the top with its size showing",
        caption: 'The demo page, built in front of you',
      },
      {
        src: 'copies.webp',
        alt: 'A grid of cards being built: the first card finished, and five tinted outlines of it being dragged into place by cursors named Mara, Ines, Kofi and Lena',
        caption: 'One card is built, then copied into place',
      },
      {
        src: 'typing.webp',
        alt: 'The copied cards in place, their headings done and their descriptions being typed in by several cursors at once',
        caption: 'Each copy gets its own text typed in',
      },
      {
        src: 'image.webp',
        alt: 'A dark band being built: its paragraph and list items typed in, and an image sweeping in from the top over a grey placeholder crossed corner to corner, with its size shown as 500 × 346',
        caption: 'Images get a placeholder, then sweep in',
      },
      {
        src: 'pricing.webp',
        alt: 'Pricing cards mid-build: Starter and Studio finished, the Agency card’s button being drawn as a shape, and the table under them having its caption typed',
        caption: 'Buttons and form controls are drawn as shapes',
      },
      {
        src: 'controls.webp',
        alt: 'The demo’s controls panel beside cards being copied: 9 of 107 pieces built, 5 agents working, with switches for imperfect placement, natural cursor movement and dilly-dallying',
        caption: 'The demo’s controls: progress, speed and behaviour',
      },
      {
        src: 'finished.webp',
        alt: 'The same section finished: six cards in a grid, each with an icon, a heading, a short description and a link',
        caption: 'What you end up with: the page’s own markup',
      },
    ],
    alt: {
      'tv-1.webp': 'Crowdsurf: a page that builds itself as you scroll, with the headline being typed by a cursor and npm install crowdsurf being dragged out by another',
      'tv-2.webp': "Built piece by piece, in front of you: the demo's headline and paragraph being typed by named cursors",
      'tv-3.webp': 'Build one card, the crew copies the rest: five outlines of a card being dragged into place',
      'tv-4.webp': 'Images get a placeholder, then sweep in: a picture uncovered from the top on a dark band',
      'tv-5.webp': 'One script, one attribute: a script tag and a section marked data-crowdsurf, with zero dependencies, three browsers, and MIT on npm',
      'hero.webp': 'Crowdsurf: a page that builds itself as you scroll, beside a grid of cards being copied into place',
    },
    story: `Crowdsurf is a JavaScript library that builds a web page in front of the reader as they scroll. Point it at a section, or at the whole page, and its elements wait hidden until they come into view. Then a small crew of named cursors builds them: boxes are dragged out with a live size readout, lines are drawn with a pen, images get a crossed placeholder and sweep in from the top, and text is typed in.

Nothing is copied or screenshotted. Crowdsurf sorts the page's own elements into boxes, lines, text and media, hides them, and reveals each one in place, putting its inline styles back exactly as they were. Text and media are hidden with opacity, so screen readers and keyboard focus still reach them, and the typing uses the CSS Custom Highlight API, so no wrapper elements are added and nothing reflows.

Repeated pieces, like a row of cards, are built once and then duplicated: a cursor drags a copy into place and types in its own text. The crew is shared across the page and grows when the reader scrolls fast, anything scrolled past unseen is finished instantly, and readers who prefer reduced motion get the finished page straight away.

It drops into any page with one script tag and a data-crowdsurf attribute, or installs from npm, with no dependencies and type definitions included. Options cover speed, crew size, deliberate slips that get corrected, hand-like cursor paths and building only on a first visit, and the same browser checks run in Chromium, Firefox and WebKit on every push. It's inspired by Joel Califa's Swarm, and written from scratch.`,
    placeholder: true,
  },
  {
    slug: 'balance-simulator',
    channel: 6,
    name: 'Balance Simulator',
    blurb: 'Yoga balance sim · 3D web app',
    title: 'Balance Simulator: will this yoga pose balance?',
    summary: "Drag a 3D mannequin into yoga poses and see whether its centre of gravity stays over what's on the floor: balanced, near the edge, or tipping over.",
    role: 'Design and development',
    year: 2026,
    credits: ['Mannequin: Open 3D Mannequin by GDQuest and contributors, character by Luciano Muñoz, CC BY 4.0'],
    tech: ['JavaScript', 'three.js', 'Sass', 'Vite', 'glTF Transform'],
    links: { live: 'https://jugglingjon.github.io/balance/', repo: 'https://github.com/jugglingjon/balance' },
    tv: { type: 'slideshow', slides: ['tv-1.webp', 'tv-2.webp', 'tv-3.webp', 'tv-4.webp', 'tv-5.webp'] },
    music: '/media/music/balance-simulator.mp3',
    hero: 'hero.webp',
    share: 'share.jpg',
    gallery: [
      {
        src: 'handstand.webp',
        alt: 'Balance Simulator: a blue mannequin in a handstand seen from the side, white dots on its joints, a green plumb line dropping from its centre of gravity to its hands, and a green Balanced label at the top',
        caption: 'A handstand: the centre of gravity right over the hands',
      },
      {
        src: 'warrior-iii.webp',
        alt: 'Warrior III from the side: the mannequin standing on one leg, body and back leg level, arms reaching forward, its plumb line falling onto the standing foot',
        caption: 'Warrior III, balanced on one foot',
      },
      {
        src: 'near-the-edge.webp',
        alt: 'The handstand with the legs tipped forward a little: the plumb line and label turn orange, Near the edge, with the centre of gravity 2.7 cm inside the base',
        caption: 'Near the edge: still up, but only just',
      },
      {
        src: 'off-balance.webp',
        alt: 'The handstand with the legs tipped well over: the plumb line and label turn red, Off balance, with the centre of gravity 3.4 cm outside the hands',
        caption: 'Off balance: the plumb line has left the base',
      },
      {
        src: 'mass-dots.webp',
        alt: 'Boat pose with mass dots on: purple dots on every body part, the largest on the torso and thighs, the smallest on the hands and feet',
        caption: 'Mass dots: the bigger the dot, the heavier the part',
      },
      {
        src: 'orbit.webp',
        alt: 'Tree pose in the orbit view: the mannequin on one foot, arms raised, standing on a tiled floor, its base of support drawn in green under the foot',
        caption: 'The orbit view: the base of support on the floor',
      },
      {
        src: 'front-view.webp',
        alt: 'A straddle handstand from the front: legs spread wide in a V, the plumb line falling between the hands',
        caption: 'A straddle handstand, from the front',
      },
      {
        src: 'crow.webp',
        alt: 'Crow pose from the side: the mannequin crouched forward, knees resting on its upper arms, all its weight on its hands',
        caption: 'Crow: all the weight forward onto the hands',
      },
    ],
    alt: {
      'tv-1.webp': 'Balance Simulator: Will it balance? beside a mannequin in tree pose, and a Balanced label',
      'tv-2.webp': 'Drag any joint into a pose: a mannequin in Warrior III with its joints marked and its plumb line on the standing foot',
      'tv-3.webp': 'Lean too far, and it tips: three handstands, balanced in green, near the edge in orange, and off balance in red',
      'tv-4.webp': 'Every part has its weight: boat pose with purple mass dots, bigger on the heavier parts',
      'tv-5.webp': 'From crow to headstand: six of the preset poses, crow, tree, headstand, straddle handstand, boat and forward fold',
      'hero.webp': 'Will it balance? beside a mannequin in a straddle handstand on a tiled floor, its base of support in green',
    },
    story: `Balance Simulator answers the question every yoga student asks upside down: will this pose hold? Drag the joints of a 3D mannequin into a pose and it shows where the body's centre of gravity sits. A pose balances only while that point stays over whatever is touching the floor: the hands in a handstand, one foot in tree pose, the head and forearms in a headstand.

A plumb line drops from the centre of gravity to the floor, and the base of support is drawn under whatever is planted. The status turns from green to orange once the centre of gravity drifts out of the middle half of the base, and to red when it leaves it, with the distance in centimetres. Mass dots show where each part's weight sits: the bigger the dot, the heavier the part.

The body is sixteen rigid segments with adult proportions and masses. Dragging a joint turns the limb about it, while planted hands and feet stay where they are (two-bone IK), nothing goes through the floor, and joints stop at their limits. Arms can mirror each other and legs can split, eleven presets start you off from handstands, crow, tree, warrior III and boat, and the camera switches between side, front and a free orbit.

It's plain JavaScript on three.js, built with Vite. The figure is GDQuest's Open 3D Mannequin (CC BY 4.0), trimmed and compressed with glTF Transform and given adult proportions at run time.`,
    placeholder: true,
  },
  {
    slug: 'visual-recon',
    channel: 7,
    name: 'Visual Recon',
    blurb: 'Aircraft recognition app · web',
    title: 'Visual Recon: aircraft recognition on 3D models',
    summary: "A training app for recognizing aircraft by their shape, with the Army's WEFT method on 3D models: learn it, explore 20 aircraft, then test yourself.",
    role: 'Design and development',
    year: 2026,
    tech: ['JavaScript', 'three.js', 'Sass', 'Vite', 'vite-plugin-pwa', 'Fuse.js', 'IndexedDB', 'glTF Transform', 'Vitest', 'Playwright', 'axe-core'],
    links: { live: 'https://jugglingjon.github.io/Vehicle-Identification/' },
    tv: { type: 'slideshow', slides: ['tv-1.webp', 'tv-2.webp', 'tv-3.webp', 'tv-4.webp', 'tv-5.webp'] },
    music: '/media/music/visual-recon.mp3',
    hero: 'hero.webp',
    share: 'share.jpg',
    gallery: [
      {
        src: 'home.webp',
        alt: 'The Visual Recon home screen: an F/A-18 Hornet turning on a dark grid inside an orange ring, beside Learn, Explore and Play',
        caption: 'Home: an aircraft on display, and the three ways in',
      },
      {
        src: 'explore.webp',
        alt: 'The Explore library: filters and search above a grid of 3D aircraft thumbnails, with the A-10C Thunderbolt II selected',
        caption: 'Explore: 20 aircraft in 3D, and the whole TC reference',
      },
      {
        src: 'aircraft-ah-64.webp',
        alt: "The AH-64 Apache's page: the helicopter in 3D on the left, and its wings, engines, fuselage and tail described on the right, each with its tags",
        caption: 'Each WEFT row turns the model to the angle that shows it',
      },
      {
        src: 'compare.webp',
        alt: 'The F-15 Eagle and the Su-27 Flanker side by side from the same angle, with their WEFT descriptions compared below and the differences tagged in orange',
        caption: 'Compare: two look-alikes at true relative size',
      },
      {
        src: 'lesson-wings.webp',
        alt: 'The Wings lesson: an F-15 and an AH-64 seen from above, beside the lesson text, the TC’s own words and a figure of the three wing types',
        caption: 'Learn: lessons in the order of TC 3-01.80',
      },
      {
        src: 'play-setup.webp',
        alt: 'Play setup: game type, aircraft types, affiliation, angles, difficulty, answer format, mode and rounds, beside a MiG-29 in 3D',
        caption: 'Play: set up a session',
      },
      {
        src: 'play-weft.webp',
        alt: 'A WEFT ID question: an Su-25 flying over farmland under a blue sky, and four answers to “Where are the wings mounted?”',
        caption: 'WEFT ID: name a feature, not just the aircraft',
      },
      {
        src: 'play-realworld.webp',
        alt: 'A real-world pass: a small drone crossing a hazy, cloudy sky, with four aircraft names to choose from',
        caption: 'Real world: a pass across a photographed sky',
      },
    ],
    alt: {
      'tv-1.webp': 'Visual Recon: Know the aircraft by its shape, beside an F/A-18 Hornet on a grid, and Learn, Explore and Play',
      'tv-2.webp': "Wings, engines, fuselage, tail, above the AH-64 Apache's page in Visual Recon",
      'tv-3.webp': 'Tell look-alikes apart: the F-15 Eagle and the Su-27 Flanker side by side',
      'tv-4.webp': 'Test yourself on a real sky: an Su-25 overhead and a question about where its wings are mounted',
      'tv-5.webp': 'Learn it from the manual: the Wings lesson, with an F-15 and an AH-64 seen from above',
      'hero.webp': 'Visual Recon: Know the aircraft by its shape, beside an F/A-18 Hornet on a grid',
    },
    story: `Visual Recon teaches aircraft recognition the way the Army does: by WEFT, the wings, engines, fuselage and tail, from TC 3-01.80, Visual Aircraft Recognition. Instead of the manual's line drawings, every lesson, page and question uses real 3D models you can turn in the browser, on a phone, a tablet or a desktop. It's an unofficial training aid.

Explore holds 20 modeled aircraft (fixed wing, rotary wing and drones) and all 123 entries of the manual's reference, with filters and a typo-tolerant search. On an aircraft's page, each WEFT row swings the camera round to the angle that shows that feature best, and look-alikes open side by side, from the same angle at true relative size, with the differences picked out.

Play asks you to name the aircraft, or one of its features, against the clock. A question only follows a view that shows the answer, and the hardest mode flies the aircraft across a photographed sky as if you were watching through binoculars, with haze, distance and low cloud. Learn walks through the manual in order, ends each lesson with a check, and finishes with a spot report you fill in line by line.

The models were found, license-checked, scaled to their real size and compressed from 77 MB to 11 MB. It's plain JavaScript on three.js, installs to a home screen and works offline, and every screen passes automated WCAG 2.2 AA checks.`,
    placeholder: true,
  },
  {
    slug: 'gradient-reel',
    channel: 8,
    name: 'Gradient Reel',
    blurb: 'Motion reel · video',
    title: 'Gradient Reel: colour in motion',
    summary: 'A short reel of slowly shifting gradients, made as a backdrop for live events.',
    role: 'Motion design',
    year: 2022,
    tech: ['GLSL', 'ffmpeg'],
    tv: { type: 'video', src: ['/media/test/gradient-reel.mp4', '/media/test/gradient-reel.webm'], poster: 'poster.jpg' },
    music: '/media/music/gradient-reel.mp3',
    hero: 'poster.jpg',
    video: { src: ['/media/test/gradient-reel.mp4', '/media/test/gradient-reel.webm'], poster: 'poster.jpg' },
    alt: { 'poster.jpg': 'Soft bands of colour drifting across the frame' },
    story: `Placeholder story. A backdrop reel for a stage: slow gradients written as a shader, rendered out and encoded small enough to loop from a phone.`,
    placeholder: true,
  },
  {
    slug: 'game-of-life',
    channel: 9,
    name: 'Game of Life',
    blurb: 'Generative loop · video',
    title: 'Game of Life: a generative loop',
    summary: 'Conway’s Game of Life, run until it settles into a loop, rendered as a short seamless video.',
    role: 'Code and motion',
    year: 2022,
    tech: ['JavaScript', 'Canvas', 'ffmpeg'],
    tv: { type: 'video', src: ['/media/test/life.mp4', '/media/test/life.webm'], poster: 'poster.jpg' },
    music: '/media/music/game-of-life.mp3',
    hero: 'poster.jpg',
    video: { src: ['/media/test/life.mp4', '/media/test/life.webm'], poster: 'poster.jpg' },
    alt: { 'poster.jpg': 'A grid of glowing cells mid-generation' },
    story: `Placeholder story. A small experiment: seed Conway's Game of Life, run it until the pattern repeats, and render exactly one period so the video loops without a seam.`,
    placeholder: true,
  },
];
