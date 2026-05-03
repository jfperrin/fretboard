// Persistance localStorage avec namespacing et tolérance aux navigateurs
// privés (Safari mode privé, accès refusé : on dégrade silencieusement).

const PREFIX = 'fretboard:';

function safeGet(key) {
  try { return localStorage.getItem(PREFIX + key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(PREFIX + key, value); } catch { /* ignore */ }
}

export function loadPref(key, fallback) {
  const raw = safeGet(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function savePref(key, value) {
  safeSet(key, JSON.stringify(value));
}
