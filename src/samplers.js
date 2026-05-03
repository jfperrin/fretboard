// Sampler multi-instruments. Réutilise l'AudioContext partagé et la même
// stratégie de pitch-shift que audio.js : on charge une grille d'échantillons
// puis on sélectionne le plus proche en MIDI pour chaque note demandée.
//
// Source : https://github.com/nbrosowsky/tonejs-instruments (samples MP3, CORS OK).

import { getAudioContext } from './audio.js';

const NAME_TO_INDEX = {
  C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5,
  Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11,
};

function midiFromName(name) {
  const m = name.match(/^([A-G]s?)(\d)$/);
  if (!m) return null;
  return (parseInt(m[2], 10) + 1) * 12 + NAME_TO_INDEX[m[1]];
}

const BASE = 'https://nbrosowsky.github.io/tonejs-instruments/samples/';

// Échantillons retenus par instrument (espacement ~ tierce mineure pour limiter
// le pitch-shift). Si certains 404 le scheduler ne crashe pas — Promise.allSettled
// + fallback sur les échantillons disponibles.
// Liste vérifiée contre l'arborescence du repo (api.github.com).
const INSTRUMENTS = {
  'bass-electric': {
    notes: ['Cs1', 'E1', 'G1', 'As1', 'Cs2', 'E2', 'G2', 'As2', 'Cs3', 'E3', 'G3', 'As3', 'Cs4', 'E4'],
  },
  'guitar-electric': {
    notes: ['Cs2', 'E2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5'],
  },
};

const buffers = new Map();        // `${inst}:${midi}` -> AudioBuffer
const loadPromises = new Map();   // inst -> Promise

async function loadOne(ac, inst, name) {
  const url = `${BASE}${inst}/${name}.mp3`;
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const arr = await res.arrayBuffer();
  const buf = await ac.decodeAudioData(arr);
  const midi = midiFromName(name);
  if (midi != null) buffers.set(`${inst}:${midi}`, buf);
}

export function preloadInstrument(inst) {
  if (loadPromises.has(inst)) return loadPromises.get(inst);
  const config = INSTRUMENTS[inst];
  if (!config) return Promise.resolve();
  const ac = getAudioContext();
  const p = Promise.allSettled(config.notes.map((n) => loadOne(ac, inst, n)))
    .then((results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      if (ok === 0) {
        console.warn(`[samplers] ${inst} : aucun échantillon chargé — fallback synthèse.`);
      } else if (ok < results.length) {
        console.info(`[samplers] ${inst} : ${ok}/${results.length} échantillons chargés.`);
      }
    });
  loadPromises.set(inst, p);
  return p;
}

export function hasInstrument(inst) {
  for (const key of buffers.keys()) {
    if (key.startsWith(`${inst}:`)) return true;
  }
  return false;
}

function nearestMidi(inst, targetMidi) {
  let best = null;
  let bestDist = Infinity;
  for (const key of buffers.keys()) {
    if (!key.startsWith(`${inst}:`)) continue;
    const m = parseInt(key.split(':')[1], 10);
    const d = Math.abs(m - targetMidi);
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return best;
}

// Joue un échantillon planifié à l'instant `t` de l'AudioContext (sample-accurate).
// Retourne true si un échantillon a été déclenché, false sinon.
export function playSample(inst, frequency, t, { duration = 0.4, gain = 0.6, destination, release = 0.12 } = {}) {
  const ac = getAudioContext();
  const targetMidi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const srcMidi = nearestMidi(inst, targetMidi);
  if (srcMidi == null) return false;

  const buffer = buffers.get(`${inst}:${srcMidi}`);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = Math.pow(2, (targetMidi - srcMidi) / 12);

  // Enveloppe : attaque très courte (préserve le transitoire/pluck), sustain
  // plat, release exponentiel pour étouffer naturellement la note.
  const env = ac.createGain();
  const attack = 0.005;
  const releaseStart = t + Math.max(attack + 0.02, duration - release);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.setValueAtTime(gain, releaseStart);
  env.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release);

  src.connect(env).connect(destination || ac.destination);
  src.start(t);
  src.stop(releaseStart + release + 0.05);
  return true;
}
