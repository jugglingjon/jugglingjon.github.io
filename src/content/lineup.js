// Channel numbers. A project can ask for one (`channel` in
// content/projects.js); everything else (the rest of your work, then the test
// cards) takes the lowest numbers still free, in order, from FIRST_CHANNEL.
// The TV, the listings and the pages all number channels this way, so they
// agree. A show's time slot follows its number: channel 1 at 7:00, each one
// half an hour after the last.

export const FIRST_CHANNEL = 1; // so number keys 1–9 land on the first nine channels

// Numbers for a lineup, given the number each item asks for (or null).
export function channelNumbers(wanted, first = FIRST_CHANNEL) {
  const taken = new Set(wanted.filter((n) => n != null));
  let next = first;
  return wanted.map((n) => {
    if (n != null) return n;
    while (taken.has(next)) next++;
    taken.add(next);
    return next;
  });
}

// Your work in channel order: [{ project, number }].
export function numberedProjects(projects) {
  const numbers = channelNumbers(projects.map((p) => p.channel));
  return projects.map((project, i) => ({ project, number: numbers[i] })).sort((a, b) => a.number - b.number);
}

// Where a channel's time slot falls among the evening's (see airTime).
export const slotOf = (number) => number - FIRST_CHANNEL;
