const KEY = 'retro-portfolio:screen-lab';

// Lab tweaks persist per browser. Storage can be unavailable (private mode,
// blocked site data), so every access is guarded and failure is silent.

export function loadSaved(params) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved) return;
    for (const group of ['signal', 'display', 'glass']) Object.assign(params[group], saved[group]);
  } catch {
    // Ignore unreadable or missing data.
  }
}

export function save(params) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lookOnly(params)));
  } catch {
    // Ignore quota or access errors.
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

export function lookOnly(params) {
  return { signal: params.signal, display: params.display, glass: params.glass };
}
