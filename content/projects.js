// Your work, one channel each, in channel order (keys 1–9 tune straight to
// the first nine). Media sits in public/work/<slug>/ and is named here by file
// name; a path starting with / is from public/ instead, and a full URL is used
// as it is. See "Adding a project" in the README for sizes and formats.
//
//   slug         the project's URL: /work/<slug>/
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
];
