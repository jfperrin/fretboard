// Sampler basé sur de vrais échantillons de guitare acoustique.
// Source : https://github.com/nbrosowsky/tonejs-instruments (samples MP3, CORS OK).
// Stratégie : on charge une grille d'échantillons couvrant la tessiture du manche,
// puis pour chaque note demandée on pitch-shift l'échantillon le plus proche.

const SAMPLE_BASE =
  'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/';

// Échantillons retenus (espacés ~ tierce mineure pour limiter le pitch-shift).
// Notation : Cs = C#, Ds = D#, Fs = F#, Gs = G#, As = A#.
const SAMPLE_NOTES = [
  'E2', 'G2', 'As2', 'Cs3', 'E3', 'G3', 'As3', 'Cs4', 'E4', 'G4', 'As4', 'Cs5', 'E5',
];

const NAME_TO_INDEX = {
  C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5,
  Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11,
};

function midiFromName(name) {
  const m = name.match(/^([A-G]s?)(\d)$/);
  if (!m) throw new Error(`Bad note name: ${name}`);
  const idx = NAME_TO_INDEX[m[1]];
  const oct = parseInt(m[2], 10);
  return (oct + 1) * 12 + idx;
}

let ctx = null;
function getCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const buffers = new Map(); // midi -> AudioBuffer
let loadPromise = null;
let loadFailed = false;

async function loadOne(ac, name) {
  const url = SAMPLE_BASE + name + '.mp3';
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const arr = await res.arrayBuffer();
  const buf = await ac.decodeAudioData(arr);
  buffers.set(midiFromName(name), buf);
}

export function preloadSamples() {
  if (loadPromise) return loadPromise;
  const ac = getCtx();
  loadPromise = Promise.allSettled(SAMPLE_NOTES.map((n) => loadOne(ac, n)))
    .then((results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      if (ok === 0) {
        loadFailed = true;
        console.warn('[audio] Aucun échantillon de guitare chargé — fallback synthèse.');
      } else if (ok < results.length) {
        console.warn(`[audio] ${ok}/${results.length} échantillons chargés.`);
      }
    });
  return loadPromise;
}

function nearestSampleMidi(targetMidi) {
  let best = null;
  let bestDist = Infinity;
  for (const m of buffers.keys()) {
    const d = Math.abs(m - targetMidi);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return best;
}

function playSample(frequency, { gain = 0.85, duration = 1.6 } = {}) {
  const ac = getCtx();
  const targetMidi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const srcMidi = nearestSampleMidi(targetMidi);
  if (srcMidi == null) return false;

  const buffer = buffers.get(srcMidi);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = Math.pow(2, (targetMidi - srcMidi) / 12);

  const env = ac.createGain();
  const now = ac.currentTime;
  env.gain.setValueAtTime(gain, now);
  // Release doux pour étouffer la note proprement
  env.gain.setValueAtTime(gain, now + duration - 0.4);
  env.gain.exponentialRampToValueAtTime(1e-4, now + duration);

  src.connect(env).connect(ac.destination);
  src.start(now);
  src.stop(now + duration + 0.1);
  return true;
}

// Fallback synthétique (utilisé si les échantillons ne sont pas chargés).
function playSynth(frequency, { duration = 1.2, gain = 0.25 } = {}) {
  const ac = getCtx();
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(8000, frequency * 8);
  const env = ac.createGain();
  env.gain.value = 0;
  osc.connect(filter).connect(env).connect(ac.destination);

  const attack = 0.01, decay = 0.12, release = 0.45;
  const peak = gain, sustain = 0.4 * gain;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(peak, now + attack);
  env.gain.exponentialRampToValueAtTime(Math.max(sustain, 1e-4), now + attack + decay);
  const releaseStart = now + Math.max(attack + decay, duration - release);
  env.gain.setValueAtTime(Math.max(sustain, 1e-4), releaseStart);
  env.gain.exponentialRampToValueAtTime(1e-4, releaseStart + release);
  osc.start(now);
  osc.stop(releaseStart + release + 0.05);
}

export function playNote(frequency, opts = {}) {
  if (buffers.size > 0) {
    if (playSample(frequency, opts)) return;
  }
  // Pendant le chargement initial ou en cas d'échec CDN.
  playSynth(frequency, opts);
  // Si le chargement n'a pas encore été déclenché, le déclencher maintenant.
  if (!loadPromise && !loadFailed) preloadSamples();
}
