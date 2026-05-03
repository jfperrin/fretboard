import './style.css';
import { mountLanding } from './views/landing.js';
import { mountHome } from './views/home.js';
import { mountGame } from './views/game.js';
import { mountLevels } from './views/levels.js';
import { mountChords } from './views/chords.js';
import { mountTriads } from './views/triads.js';
import { mountScales } from './views/scales.js';
import { mountMetronome } from './views/metronome.js';
import { preloadSamples } from './audio.js';
import { isUnlocked, MAX_LEVEL } from './progression.js';

// Préchargement au démarrage : un clic sur un peg de la home doit déjà
// utiliser le sampler de guitare, pas le synth de fallback.
preloadSamples();

const view = document.getElementById('view');
const body = document.body;
const topLinks = document.querySelectorAll('.topbar-menu a');

const ROUTES = {
  '#/':           (v) => mountLanding(v),
  '#/manche':     (v) => mountHome(v),
  '#/accords':    (v) => mountChords(v),
  '#/triades':    (v) => mountTriads(v),
  '#/gammes':     (v) => mountScales(v),
  '#/metronome':  (v) => mountMetronome(v),
  '#/game':       (v) => mountLevels(v),
};

let cleanup = null;

function parseGameLevel(hash) {
  const m = hash.match(/^#\/game\/(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LEVEL) return null;
  return n;
}

function setActive(hash) {
  const navHash = hash.startsWith('#/game')      ? '#/game'
                : hash.startsWith('#/manche')    ? '#/manche'
                : hash.startsWith('#/accords')   ? '#/accords'
                : hash.startsWith('#/triades')   ? '#/triades'
                : hash.startsWith('#/gammes')    ? '#/gammes'
                : hash.startsWith('#/metronome') ? '#/metronome'
                : null;
  topLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === navHash));
  body.classList.toggle('is-landing', hash === '#/' || hash === '');
}

function route() {
  const hash = location.hash || '#/';
  if (cleanup) { cleanup(); cleanup = null; }
  view.replaceChildren();
  setActive(hash);

  const direct = ROUTES[hash];
  if (direct) {
    cleanup = direct(view) || null;
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
      './views/headstock.js',
      './views/home.js',
      './views/game.js',
      './views/levels.js',
      './views/chords.js',
      './views/triads.js',
      './views/scales.js',
      './views/metronome.js',
      './fretboard.js',
      './notes.js',
      './audio.js',
      './pitch.js',
      './progression.js',
      './theory.js',
      './svg/svg-utils.js',
      './svg/mini-fretboard.js',
    ],
    () => import.meta.hot.invalidate()
  );
}
