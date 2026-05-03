// Moteur de backing tracks : batterie + basse + stabs d'accord, synthétisés
// avec Web Audio (aucun fichier audio externe). Scheduler "lookahead" (Chris
// Wilson) pour timing échantillon-précis dans l'AudioContext.

import { getAudioContext } from './audio.js';
import { preloadInstrument, hasInstrument, playSample } from './samplers.js';
import { midiOf, frequencyOf } from './notes.js';
import { CHORD_INTERVALS, resolveStep } from './theory.js';

// ── Synthèse de la batterie ──

let cachedNoise = null;
function noiseBuffer(ctx) {
  if (cachedNoise && cachedNoise.sampleRate === ctx.sampleRate) return cachedNoise;
  const len = Math.floor(ctx.sampleRate * 0.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  cachedNoise = buf;
  return buf;
}

function playKick(ctx, t, gain = 0.7) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const env = ctx.createGain();
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.13);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(env).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playSnare(ctx, t, gain = 0.42) {
  // Composante bruit (peau et timbre)
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1400;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  src.connect(hp).connect(env).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.2);

  // Composante tonale (corps)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);
  const tEnv = ctx.createGain();
  tEnv.gain.setValueAtTime(0, t);
  tEnv.gain.linearRampToValueAtTime(gain * 0.45, t + 0.002);
  tEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(tEnv).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playHihat(ctx, t, { gain = 0.18, open = false } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7500;
  const env = ctx.createGain();
  const decay = open ? 0.22 : 0.045;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.001);
  env.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(hp).connect(env).connect(ctx.destination);
  src.start(t);
  src.stop(t + decay + 0.05);
}

function playRide(ctx, t, gain = 0.16) {
  // Bell/ride : sinusoïde + petite couche de bruit
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 5200;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 5200;
  bp.Q.value = 8;
  osc.connect(bp).connect(env).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

// ── Basse : sampler bass-electric (CDN nbrosowsky) avec fallback synth ──

function synthBass(ctx, frequency, t, duration, gain) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = frequency;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(900, frequency * 5), t);
  lp.frequency.exponentialRampToValueAtTime(Math.min(500, frequency * 3), t + duration * 0.6);
  lp.Q.value = 1.4;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.008);
  env.gain.setValueAtTime(gain * 0.7, t + duration * 0.3);
  env.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(lp).connect(env).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function playBass(ctx, frequency, t, duration = 0.3, gain = 0.42) {
  if (hasInstrument('bass-electric')) {
    // Release un poil plus long que la durée nominale pour laisser respirer
    // le transitoire de la basse (pluck).
    if (playSample('bass-electric', frequency, t, { duration, gain: gain * 1.25, release: 0.15 })) return;
  }
  synthBass(ctx, frequency, t, duration, gain);
}

// ── Stab d'accord : sampler guitar-electric strummed (avec fallback synth) ──

function synthChordStab(ctx, freqs, t, duration, gain) {
  freqs.forEach((f) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 0.7;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.012);
    env.gain.setValueAtTime(gain * 0.5, t + duration * 0.4);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(lp).connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  });
}

function playChordStab(ctx, freqs, t, duration = 0.22, gain = 0.13) {
  if (hasInstrument('guitar-electric')) {
    // Strum réaliste : léger décalage entre les cordes (~10 ms)
    const stagger = 0.014;
    let any = false;
    freqs.forEach((f, i) => {
      if (playSample('guitar-electric', f, t + i * stagger, { duration, gain: gain * 1.5, release: 0.1 })) {
        any = true;
      }
    });
    if (any) return;
  }
  synthChordStab(ctx, freqs, t, duration, gain);
}

// ── Styles ──

// Chaque style définit la progression sur 12 mesures + paramètres rythmiques.
// `pattern` est appelé pour chaque double-croche (16 par mesure) ; il
// déclenche les voix utiles à cette subdivision.

const BLUES_DOM7_12 = [
  { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' },
  { d: 4, q: 'dom7' }, { d: 4, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' },
  { d: 5, q: 'dom7' }, { d: 4, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 5, q: 'dom7' },
];

// Mineur blues : i7 - iv7 - i7 - V7 (12 bar version)
const BLUES_MIN_12 = [
  { d: 1, q: 'min7' }, { d: 1, q: 'min7' }, { d: 1, q: 'min7' }, { d: 1, q: 'min7' },
  { d: 4, q: 'min7' }, { d: 4, q: 'min7' }, { d: 1, q: 'min7' }, { d: 1, q: 'min7' },
  { d: 5, q: 'dom7' }, { d: 4, q: 'min7' }, { d: 1, q: 'min7' }, { d: 5, q: 'dom7' },
];

// Quick change blues (IV à la mesure 2)
const BLUES_QUICK_12 = [
  { d: 1, q: 'dom7' }, { d: 4, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' },
  { d: 4, q: 'dom7' }, { d: 4, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' },
  { d: 5, q: 'dom7' }, { d: 4, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 5, q: 'dom7' },
];

// Walking bass : root, 3, 5, 6 (montant) puis 6, 5, 3, root (descendant) en alternance.
// Les valeurs sont des demi-tons depuis la racine de l'accord.
const WALK_UP_DOM   = [0, 4, 7, 9];
const WALK_DOWN_DOM = [0, 9, 7, 4];
const WALK_UP_MIN   = [0, 3, 7, 9];
const WALK_DOWN_MIN = [0, 9, 7, 3];

function isMinorQuality(q) {
  return q === 'min' || q === 'min7' || q === 'min7b5';
}

// Calcul d'une note de basse : root absolu (octave 1, registre basse) + offset
// en demi-tons. `octave: 1` correspond à la tessiture réelle d'une basse 4 cordes
// (corde A à vide = A1 = MIDI 33). On ajoute l'offset *après* avoir converti
// en MIDI absolu pour éviter le pliage de quintes/septièmes une octave plus bas.
function bassMidi(rootIdx, offset, octave = 1) {
  return midiOf({ noteIndex: rootIdx, octave }) + offset;
}

// Pattern shuffle blues : 16 doubles-croches par mesure, swing sur les paires.
// Drums : kick 1&3, snare 2&4, hi-hat sur double-croches "swing".
// Bass : walking quarter notes.
// Chord stabs : sur l'ampli sur 2&4 (skank).
function shufflePattern(ctx, t, sub16, beat, chord, isLastBar, swing, beatDur) {
  // sub16 : 0..15 (numéro de double-croche dans la mesure)
  // beat  : 0..3 (temps)
  const isDownbeat = sub16 % 4 === 0;       // 1, 2, 3, 4
  const isOffbeat  = sub16 % 4 === 2;       // & de chaque temps (avec swing)

  // Hi-hat
  if (isDownbeat) playHihat(ctx, t, { gain: beat === 0 ? 0.20 : 0.16 });
  if (isOffbeat)  playHihat(ctx, t, { gain: 0.12 });

  // Kick : 1 et 3
  if (beat === 0 && sub16 === 0) playKick(ctx, t, 0.72);
  if (beat === 2 && sub16 === 8) playKick(ctx, t, 0.55);
  // Snare : 2 et 4
  if (beat === 1 && sub16 === 4) playSnare(ctx, t, 0.46);
  if (beat === 3 && sub16 === 12) playSnare(ctx, t, 0.46);

  // Walking bass (quarter notes) — accent léger sur le 1
  if (isDownbeat) {
    const minor = isMinorQuality(chord.quality);
    const walk = (Math.floor(sub16 / 4) % 8 < 4)
      ? (minor ? WALK_UP_MIN   : WALK_UP_DOM)
      : (minor ? WALK_DOWN_MIN : WALK_DOWN_DOM);
    const offset = walk[beat];
    const midi = bassMidi(chord.rootIdx, offset);
    const accent = beat === 0 ? 0.55 : 0.45;
    playBass(ctx, frequencyOf(midi), t, beatDur * 0.92, accent);
  }

  // Chord stab sur 2 et 4 (skank shuffle)
  if ((beat === 1 || beat === 3) && sub16 % 4 === 0) {
    const intervals = CHORD_INTERVALS[chord.quality] || CHORD_INTERVALS.maj;
    const baseMidi = midiOf({ noteIndex: chord.rootIdx, octave: 3 });
    const freqs = intervals.map((iv) => frequencyOf(baseMidi + iv));
    playChordStab(ctx, freqs, t, beatDur * 0.55, 0.18);
  }
}

// Slow blues : sparse, half-time feel. Kick 1, snare 3.
function slowPattern(ctx, t, sub16, beat, chord, isLastBar, swing, beatDur) {
  if (sub16 === 0) playKick(ctx, t, 0.65);
  if (sub16 === 8) playSnare(ctx, t, 0.42);

  // Hi-hat sur chaque temps
  if (sub16 % 4 === 0) playHihat(ctx, t, { gain: 0.14 });
  // Ride sur début de mesure
  if (sub16 === 0) playRide(ctx, t, 0.12);

  // Bass : note longue sur le 1, courte sur le 3 (quinte)
  if (sub16 === 0) {
    playBass(ctx, frequencyOf(bassMidi(chord.rootIdx, 0)), t, beatDur * 1.7, 0.5);
  }
  if (sub16 === 8) {
    playBass(ctx, frequencyOf(bassMidi(chord.rootIdx, 7)), t, beatDur * 0.85, 0.4);
  }

  // Chord stab : un sur 2& (anticipation), un sur 4
  if (sub16 === 6 || sub16 === 12) {
    const intervals = CHORD_INTERVALS[chord.quality] || CHORD_INTERVALS.maj;
    const baseMidi = midiOf({ noteIndex: chord.rootIdx, octave: 3 });
    const freqs = intervals.map((iv) => frequencyOf(baseMidi + iv));
    playChordStab(ctx, freqs, t, beatDur * 0.7, 0.16);
  }
}

// Boogie : straight 8ths, kick 1&3, snare 2&4, bass classique R-5-6-5.
function boogiePattern(ctx, t, sub16, beat, chord, isLastBar, swing, beatDur) {
  // Hi-hat sur chaque 8th
  if (sub16 % 2 === 0) playHihat(ctx, t, { gain: 0.13 });
  // Kick 1 et 3
  if (beat === 0 && sub16 === 0) playKick(ctx, t, 0.72);
  if (beat === 2 && sub16 === 8) playKick(ctx, t, 0.62);
  // Snare 2 et 4
  if (beat === 1 && sub16 === 4) playSnare(ctx, t, 0.44);
  if (beat === 3 && sub16 === 12) playSnare(ctx, t, 0.44);

  // Boogie bass : R-5-6-5 répété en 8ths
  const boogie = [0, 7, 9, 7, 0, 7, 9, 7];
  if (sub16 % 2 === 0) {
    const idx = sub16 / 2;
    const offset = boogie[idx];
    const midi = bassMidi(chord.rootIdx, offset);
    const accent = idx === 0 ? 0.5 : 0.42;
    playBass(ctx, frequencyOf(midi), t, beatDur * 0.55, accent);
  }
}

export const STYLES = {
  shuffle: {
    id: 'shuffle',
    label: 'Shuffle blues',
    hint: 'Le grand classique 12 mesures',
    progression: BLUES_DOM7_12,
    defaultBpm: 110,
    swing: 0.66,
    pattern: shufflePattern,
  },
  quick: {
    id: 'quick',
    label: 'Quick-change blues',
    hint: 'IV dès la 2e mesure',
    progression: BLUES_QUICK_12,
    defaultBpm: 120,
    swing: 0.66,
    pattern: shufflePattern,
  },
  slow: {
    id: 'slow',
    label: 'Slow blues',
    hint: 'BB King · 6/8 lent',
    progression: BLUES_DOM7_12,
    defaultBpm: 72,
    swing: 0.66,
    pattern: slowPattern,
  },
  minor: {
    id: 'minor',
    label: 'Minor blues',
    hint: 'Couleur jazz/Santana',
    progression: BLUES_MIN_12,
    defaultBpm: 96,
    swing: 0.66,
    pattern: shufflePattern,
  },
  boogie: {
    id: 'boogie',
    label: 'Boogie',
    hint: 'Straight 8 · Chuck Berry',
    progression: BLUES_DOM7_12,
    defaultBpm: 132,
    swing: 0,
    pattern: boogiePattern,
  },
};

// ── Engine ──

export function createBackingEngine() {
  // Précharge les samplers utilisés par la basse + les stabs.
  // Promise.allSettled : si un instrument est indisponible on tombera sur le synth.
  preloadInstrument('bass-electric');
  preloadInstrument('guitar-electric');

  const state = {
    style: STYLES.shuffle,
    keyRoot: 9, // La par défaut (blues en La)
    bpm: 110,
    playing: false,
    barIdx: 0,
    onBarChange: null,
  };

  let timer = null;
  let nextTime = 0;
  let sub16 = 0; // 0..15 par mesure
  let barIdx = 0;

  function progressionResolved() {
    return state.style.progression.map((step) =>
      resolveStep(step, state.keyRoot, () => '')
    );
  }

  function schedule() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const beatDur = 60 / state.bpm;
    const sub16Dur = beatDur / 4;
    const chords = progressionResolved();

    while (nextTime < ctx.currentTime + 0.12) {
      // Swing : décalage de la 2e double-croche de chaque paire 8th
      // (sub16 impair dans la même 8th group = positions 1,3,5,7,9,11,13,15)
      const swingOffset = state.style.swing > 0 && (sub16 % 2 === 1)
        ? (state.style.swing - 0.5) * 2 * sub16Dur
        : 0;

      const t = nextTime + swingOffset;
      const chord = chords[barIdx % chords.length];
      const beat = Math.floor(sub16 / 4);
      const isLastBar = barIdx === chords.length - 1;

      try {
        state.style.pattern(ctx, t, sub16, beat, chord, isLastBar, state.style.swing, beatDur);
      } catch (err) {
        // ignore — un ratage de note ne doit pas crasher le scheduler
        console.warn('[backing] pattern error', err);
      }

      nextTime += sub16Dur;
      sub16 = (sub16 + 1) % 16;
      if (sub16 === 0) {
        barIdx = (barIdx + 1) % chords.length;
        state.barIdx = barIdx;
        if (state.onBarChange) state.onBarChange(barIdx);
      }
    }
  }

  return {
    setStyle(styleId) {
      if (!STYLES[styleId]) return;
      state.style = STYLES[styleId];
    },
    setKey(rootIdx) { state.keyRoot = rootIdx; },
    setBpm(bpm) { state.bpm = bpm; },
    setOnBarChange(cb) { state.onBarChange = cb; },
    get progression() { return state.style.progression; },
    get isPlaying() { return state.playing; },
    start() {
      if (state.playing) return;
      const ctx = getAudioContext();
      state.playing = true;
      sub16 = 0;
      barIdx = 0;
      state.barIdx = 0;
      nextTime = ctx.currentTime + 0.08;
      schedule();
      timer = setInterval(schedule, 25);
      if (state.onBarChange) state.onBarChange(0);
    },
    stop() {
      if (!state.playing && !timer) return;
      state.playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      sub16 = 0;
      barIdx = 0;
      state.barIdx = 0;
    },
  };
}
