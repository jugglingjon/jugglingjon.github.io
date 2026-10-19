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
    slug: 'neon-burger',
    name: 'Neon Burger Co.',
    blurb: 'Burger joint site · web',
    title: 'Neon Burger Co.: a late-night brand online',
    summary: 'A loud, neon-lit site for a burger joint that only opens after dark: menu, locations and ordering in three taps.',
    role: 'Design and front-end development',
    client: 'Neon Burger Co.',
    year: 2024,
    credits: ['Illustration: in-house'],
    tech: ['HTML', 'SCSS', 'JavaScript', 'PHP'],
    links: { live: 'https://example.com/neon-burger' },
    tv: { type: 'slideshow', slides: ['home.png', 'menu.png', 'order.png'], seconds: 5 },
    music: '/media/music/neon-burger.mp3',
    hero: 'home.png',
    gallery: [
      { src: 'home.png', alt: 'Homepage: SMASHED. STACKED. GLOWING. over a glowing burger', caption: 'The homepage' },
      { src: 'menu.png', alt: 'Menu page: burgers, fries and shakes on neon cards', caption: 'The menu' },
      { src: 'order.png', alt: 'Order page: a three-step order summary', caption: 'Ordering in three taps' },
    ],
    alt: {
      'home.png': 'Homepage: SMASHED. STACKED. GLOWING. over a glowing burger',
      'menu.png': 'Menu page: burgers, fries and shakes on neon cards',
      'order.png': 'Order page: a three-step order summary',
    },
    story: `Placeholder story. Neon Burger Co. opens at 9pm and closes at 4am, and its old site looked like it was written at 4am. The brief: make the brand as loud online as it is on the street, and get people from "I'm hungry" to an order in three taps.

The site leans on big condensed type, a neon gradient that pulses slowly on hover, and a menu built as cards that work the same with a thumb on a phone as with a mouse.

Orders rose by a third in the first month, and the neon gradient ended up on the cups.`,
    placeholder: true,
  },
  {
    slug: 'field-notes',
    name: 'Field Notes',
    blurb: 'Editorial blog · long reads',
    title: 'Field Notes: long-form travel writing',
    summary: 'A calm, photo-led blog for long travel essays: big pictures, a measured column of text, and nothing in the way.',
    role: 'Design and development',
    client: 'Field Notes',
    year: 2023,
    tech: ['HTML', 'SCSS', 'PHP', 'WordPress'],
    links: { live: 'https://example.com/field-notes' },
    tv: { type: 'scroll', src: 'page.jpg', url: 'fieldnotes.example/stories' },
    music: '/media/music/field-notes.mp3',
    hero: 'hero.jpg',
    gallery: [{ src: 'page.jpg', alt: 'The full stories page: three essays, each with a landscape photograph', caption: 'The stories page, top to bottom' }],
    alt: {
      'page.jpg': 'The full stories page: three essays, each with a landscape photograph',
      'hero.jpg': 'The top of the stories page: the Field Notes masthead over a dusk landscape',
    },
    story: `Placeholder story. Field Notes publishes three long essays a season, each with a dozen photographs. Readers spend twenty minutes on a page, so the design gets out of the way: one column, generous type, photographs at full width.

The templates are built on WordPress with a custom theme, so the writers lay out a story with blocks and never touch code.`,
    placeholder: true,
  },
  {
    slug: 'orbit-analytics',
    name: 'Orbit Analytics',
    blurb: 'Dashboard UI · charts',
    title: 'Orbit Analytics: a dashboard you can read at a glance',
    summary: 'A product analytics dashboard redesigned around the three numbers people actually check every morning.',
    role: 'UI design and front-end development',
    client: 'Orbit',
    year: 2024,
    tech: ['TypeScript', 'SCSS', 'D3'],
    tv: { type: 'image', src: 'dashboard.png' },
    music: '/media/music/orbit-analytics.mp3',
    hero: 'dashboard.png',
    gallery: [{ src: 'dashboard.png', alt: 'The dashboard: headline numbers, a line chart and a table of top pages' }],
    alt: { 'dashboard.png': 'The dashboard: headline numbers, a line chart and a table of top pages' },
    story: `Placeholder story. Orbit's dashboard had forty charts and nobody looked past the first three. The redesign puts those three numbers at the top, in type big enough to read from across the room, and folds everything else into drill-downs.

Charts are drawn with D3 and share one small set of colours, so a colour always means the same thing.`,
    placeholder: true,
  },
  {
    slug: 'game-of-life',
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
  {
    slug: 'gradient-reel',
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
    slug: 'reacharound',
    channel: 8,
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
];
