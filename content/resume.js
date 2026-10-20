// Your résumé, typed on the sheet of paper folded into a plane on the coffee
// table: click the plane and it unfolds in front of you. Its links open in a
// new tab (an email address opens your mail app). It's one typed page, so
// keep it short: `npm test` checks it all fits.
//
//   name, title   the heading
//   links         [{ label, text, url }]: email (mailto:…), LinkedIn, GitHub, other sites
//   profile       a few sentences about you
//   experience    [{ role, company, dates, points: [one line or two each] }]
//   work          slugs from content/projects.js, listed with their live links
//   skills        a list
//   education     [{ what, where, dates }]
//   placeholder   true while any of it is a stand-in (the page is stamped DRAFT)

export const resume = {
  name: 'Jonathan Cronin',
  title: 'Web developer · Designer · Mobile app developer',
  links: [
    { label: 'Email', text: 'you@example.com', url: 'mailto:you@example.com' },
    { label: 'LinkedIn', text: 'linkedin.com/in/your-name', url: 'https://www.linkedin.com/in/your-name' },
    { label: 'GitHub', text: 'github.com/jugglingjon', url: 'https://github.com/jugglingjon' },
    { label: 'Web', text: 'jugglingjon.github.io', url: 'https://jugglingjon.github.io/' },
  ],
  profile:
    'Front-end developer and designer. I build websites, web apps and mobile apps, by hand, in HTML, CSS and SCSS, JavaScript and PHP, from public-sector sites to playful experiments in 3D.',
  experience: [
    {
      role: 'Senior front-end developer',
      company: 'Company name',
      dates: '20XX – now',
      points: ['What you built, for whom, and what changed because of it.', 'Another highlight, with a number if you have one.'],
    },
    {
      role: 'Web developer',
      company: 'Company name',
      dates: '20XX – 20XX',
      points: ['What you built, for whom, and what changed because of it.'],
    },
  ],
  work: ['reacharound', 'arpa-h', 'zones'],
  skills: ['HTML', 'CSS & SCSS', 'JavaScript', 'PHP', 'three.js & WebGL', 'Responsive, accessible UI', 'Mobile apps', 'UI & visual design'],
  education: [{ what: 'Degree or course', where: 'School or college', dates: '20XX' }],
  placeholder: true,
};
