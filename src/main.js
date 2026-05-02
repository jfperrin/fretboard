import './style.css';
import { mountLanding, buildHeadstock } from './views/landing.js';
import { mountHome } from './views/home.js';
import { mountGame } from './views/game.js';
import { mountLevels } from './views/levels.js';
import { mountChords } from './views/chords.js';
import { mountTriads } from './views/triads.js';
import { preloadSamples } from './audio.js';
import { isUnlocked, MAX_LEVEL } from './progression.js';

// Préchargement immédiat des échantillons de guitare (CORS, ~13 MP3 légers).
// Garantit que même un clic sur un peg de la home utilise la vraie guitare,
// pas le synth de fallback.
preloadSamples();

const view = document.getElementById('view');
const body = document.body;
const topLinks = document.querySelectorAll('.topbar-links a');

// Tête de guitare décorative à gauche du menu de la topbar.
const topHeadstock = document.querySelector('.topbar-headstock');
if (topHeadstock) topHeadstock.innerHTML = buildHeadstock();

let cleanup = null;

function parseGameLevel(hash) {
  const m = hash.match(/^#\/game\/(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LEVEL) return null;
  return n;
}

function setActive(hash) {
  const navHash = hash.startsWith('#/game')     ? '#/game'
                : hash.startsWith('#/manche')   ? '#/manche'
                : hash.startsWith('#/accords')  ? '#/accords'
                : hash.startsWith('#/triades')  ? '#/triades'
                : null;
  topLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === navHash));
  body.classList.toggle('is-landing', hash === '#/' || hash === '');
}

function route() {
  const hash = location.hash || '#/';
  if (cleanup) { cleanup(); cleanup = null; }
  view.replaceChildren();
  setActive(hash);

  if (hash === '#/' || hash === '') {
    cleanup = mountLanding(view) || null;
    return;
  }
  if (hash === '#/manche') {
    cleanup = mountHome(view) || null;
    return;
  }
  if (hash === '#/accords') {
    cleanup = mountChords(view) || null;
    return;
  }
  if (hash === '#/triades') {
    cleanup = mountTriads(view) || null;
    return;
  }
  if (hash === '#/game') {
    cleanup = mountLevels(view) || null;
    return;
  }
  const lvl = parseGameLevel(hash);
  if (lvl !== null) {
    if (!isUnlocked(lvl)) { location.hash = '#/game'; return; }
    cleanup = mountGame(view, lvl) || null;
    return;
  }
  // Hash inconnu → landing
  location.hash = '#/';
}

window.addEventListener('hashchange', route);
route();

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.accept(
    [
      './views/landing.js',
      './views/home.js',
      './views/game.js',
      './views/levels.js',
      './views/chords.js',
      './views/triads.js',
      './fretboard.js',
      './notes.js',
      './audio.js',
      './pitch.js',
      './progression.js',
    ],
    () => import.meta.hot.invalidate()
  );
}
