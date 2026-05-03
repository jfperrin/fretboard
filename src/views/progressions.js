import { NOTES_FR, midiOf, frequencyOf, noteLabel } from '../notes.js';
import { playNote } from '../audio.js';
import {
  PROGRESSIONS, CHORD_INTERVALS, CHORD_SUFFIX,
  DIATONIC_QUALITY, resolveStep,
} from '../theory.js';
import { loadPref, savePref } from '../storage.js';

const MIN_BPM = 40;
const MAX_BPM = 200;
const DEFAULT_BPM = 96;

const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

function romanFor(step) {
  const baseQ = step.q || DIATONIC_QUALITY[step.d - 1];
  let r = ROMAN[step.d - 1];
  // Si la qualité override change le caractère majeur/mineur, on ajuste la casse.
  if ((baseQ === 'min' || baseQ === 'min7' || baseQ === 'min7b5') && r === r.toUpperCase()) {
    r = r.toLowerCase();
  } else if ((baseQ === 'maj' || baseQ === 'maj7' || baseQ === 'dom7') && r === r.toLowerCase()) {
    r = r.toUpperCase();
  }
  if (baseQ === 'dom7' || baseQ === 'min7' || baseQ === 'maj7') r += '7';
  if (baseQ === 'min7b5') r += 'ø';
  return r;
}

function strumChord(rootIdx, quality, baseOctave = 3, { gain = 0.45, duration = 1.4, stagger = 0.025 } = {}) {
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS.maj;
  const baseMidi = midiOf({ noteIndex: rootIdx, octave: baseOctave });
  intervals.forEach((iv, i) => {
    setTimeout(() => {
      playNote(frequencyOf(baseMidi + iv), { gain, duration });
    }, i * stagger * 1000);
  });
}

export function mountProgressions(host) {
  const saved = loadPref('progressions', {
    progId: 'pop-1564',
    rootIdx: 0,
    bpm: DEFAULT_BPM,
    beatsPerChord: 4,
  });

  const state = {
    progId: PROGRESSIONS.some((p) => p.id === saved.progId) ? saved.progId : 'pop-1564',
    rootIdx: Number.isInteger(saved.rootIdx) && saved.rootIdx >= 0 && saved.rootIdx < 12 ? saved.rootIdx : 0,
    bpm: Math.max(MIN_BPM, Math.min(MAX_BPM, saved.bpm ?? DEFAULT_BPM)),
    beatsPerChord: [2, 4, 8].includes(saved.beatsPerChord) ? saved.beatsPerChord : 4,
    playing: false,
    cursor: 0,
    beat: 0,
  };

  function persist() {
    savePref('progressions', {
      progId: state.progId, rootIdx: state.rootIdx,
      bpm: state.bpm, beatsPerChord: state.beatsPerChord,
    });
  }

  const wrap = document.createElement('section');
  wrap.className = 'progressions-view';
  wrap.innerHTML = `
    <h2 class="progressions-title">Progressions d'accords</h2>
    <p class="progressions-subtitle">Choisis une progression, une tonalité, un tempo&nbsp;— et joue par-dessus.</p>

    <div class="progressions-controls">
      <div class="progressions-control-row">
        <span class="progressions-control-label">Progression</span>
        <div class="chip-row" data-progs role="radiogroup" aria-label="Progression"></div>
      </div>
      <div class="progressions-control-row">
        <span class="progressions-control-label">Tonalité</span>
        <div class="note-buttons" data-keys role="radiogroup" aria-label="Tonalité"></div>
      </div>
      <div class="progressions-control-row">
        <span class="progressions-control-label">Mesure</span>
        <div class="chip-row" data-bpc role="radiogroup" aria-label="Battements par accord">
          <button class="chip" data-bpc-id="2">2 temps</button>
          <button class="chip" data-bpc-id="4">4 temps</button>
          <button class="chip" data-bpc-id="8">8 temps</button>
        </div>
      </div>
    </div>

    <div class="progressions-stage">
      <div class="progressions-now">
        <span class="progressions-now-roman" data-roman>—</span>
        <span class="progressions-now-chord" data-chord>—</span>
        <span class="progressions-now-hint" data-hint></span>
      </div>
      <div class="progressions-steps" data-steps></div>
    </div>

    <div class="progressions-player">
      <button type="button" class="progressions-toggle" data-toggle aria-pressed="false">
        <span class="play-icon" aria-hidden="true"></span>
        <span class="progressions-toggle-label">Lancer</span>
      </button>
      <div class="progressions-bpm">
        <button type="button" class="bpm-step" data-delta="-5" aria-label="Diminuer de 5">−5</button>
        <div class="progressions-bpm-value">
          <span data-bpm>${state.bpm}</span>
          <span class="progressions-bpm-unit">BPM</span>
        </div>
        <button type="button" class="bpm-step" data-delta="5" aria-label="Augmenter de 5">+5</button>
      </div>
      <input type="range" class="progressions-slider" min="${MIN_BPM}" max="${MAX_BPM}" value="${state.bpm}" aria-label="Tempo">
    </div>
  `;
  host.appendChild(wrap);

  const elProgs   = wrap.querySelector('[data-progs]');
  const elKeys    = wrap.querySelector('[data-keys]');
  const elBpc     = wrap.querySelector('[data-bpc]');
  const elSteps   = wrap.querySelector('[data-steps]');
  const elRoman   = wrap.querySelector('[data-roman]');
  const elChord   = wrap.querySelector('[data-chord]');
  const elHint    = wrap.querySelector('[data-hint]');
  const elToggle  = wrap.querySelector('[data-toggle]');
  const elToggleLabel = elToggle.querySelector('.progressions-toggle-label');
  const elBpm     = wrap.querySelector('[data-bpm]');
  const elSlider  = wrap.querySelector('.progressions-slider');

  function currentProg() {
    return PROGRESSIONS.find((p) => p.id === state.progId) || PROGRESSIONS[0];
  }

  function buildProgChips() {
    elProgs.innerHTML = '';
    PROGRESSIONS.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (p.id === state.progId ? ' active' : '');
      b.textContent = p.label;
      b.title = p.hint || '';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(p.id === state.progId));
      b.addEventListener('click', () => {
        if (p.id === state.progId) return;
        state.progId = p.id;
        persist();
        stopPlayer();
        elProgs.querySelectorAll('.chip').forEach((c) => {
          const on = c.textContent === p.label;
          c.classList.toggle('active', on);
          c.setAttribute('aria-checked', String(on));
        });
        renderSteps();
        updateNow();
      });
      elProgs.appendChild(b);
    });
  }

  function buildKeyButtons() {
    elKeys.innerHTML = NOTES_FR.map((name, i) =>
      `<button class="note-btn${i === state.rootIdx ? ' active' : ''}" data-idx="${i}">${name}</button>`
    ).join('');
    elKeys.addEventListener('click', (e) => {
      const btn = e.target.closest('.note-btn');
      if (!btn) return;
      state.rootIdx = Number(btn.dataset.idx);
      persist();
      stopPlayer();
      elKeys.querySelectorAll('.note-btn').forEach((b) =>
        b.classList.toggle('active', Number(b.dataset.idx) === state.rootIdx));
      renderSteps();
      updateNow();
    });
  }

  function buildBpcChips() {
    elBpc.querySelectorAll('.chip').forEach((c) => {
      const id = Number(c.dataset.bpcId);
      c.classList.toggle('active', id === state.beatsPerChord);
      c.setAttribute('role', 'radio');
      c.setAttribute('aria-checked', String(id === state.beatsPerChord));
      c.addEventListener('click', () => {
        state.beatsPerChord = id;
        persist();
        elBpc.querySelectorAll('.chip').forEach((cc) => {
          const on = Number(cc.dataset.bpcId) === id;
          cc.classList.toggle('active', on);
          cc.setAttribute('aria-checked', String(on));
        });
      });
    });
  }

  function renderSteps() {
    const prog = currentProg();
    elSteps.innerHTML = '';
    prog.steps.forEach((step, i) => {
      const resolved = resolveStep(step, state.rootIdx, noteLabel);
      const cell = document.createElement('div');
      cell.className = 'progressions-step';
      cell.dataset.idx = String(i);
      cell.innerHTML = `
        <span class="progressions-step-roman">${romanFor(step)}</span>
        <span class="progressions-step-chord">${resolved.label}</span>
      `;
      cell.addEventListener('click', () => {
        strumChord(resolved.rootIdx, resolved.quality);
        elRoman.textContent = romanFor(step);
        elChord.textContent = resolved.label;
      });
      elSteps.appendChild(cell);
    });
    refreshActiveStep();
  }

  function refreshActiveStep() {
    elSteps.querySelectorAll('.progressions-step').forEach((c, i) => {
      c.classList.toggle('is-active', state.playing && i === state.cursor);
    });
  }

  function updateNow() {
    const prog = currentProg();
    const step = prog.steps[state.cursor] || prog.steps[0];
    const resolved = resolveStep(step, state.rootIdx, noteLabel);
    elRoman.textContent = romanFor(step);
    elChord.textContent = resolved.label;
    elHint.textContent = prog.hint || '';
  }

  function setBpm(v) {
    const n = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
    if (n === state.bpm) return;
    state.bpm = n;
    elBpm.textContent = String(n);
    if (Number(elSlider.value) !== n) elSlider.value = String(n);
    persist();
  }

  // ── Player ──
  let timer = null;

  function startPlayer() {
    if (state.playing) return;
    state.playing = true;
    state.cursor = 0;
    state.beat = 0;
    elToggle.setAttribute('aria-pressed', 'true');
    elToggle.classList.add('is-playing');
    elToggleLabel.textContent = 'Arrêter';

    function tick() {
      if (!state.playing) return;
      const prog = currentProg();
      const step = prog.steps[state.cursor];
      const resolved = resolveStep(step, state.rootIdx, noteLabel);
      // Sur le 1er temps : strum complet. Sur les autres : note grave seule (rythme).
      if (state.beat === 0) {
        strumChord(resolved.rootIdx, resolved.quality, 3, { gain: 0.5, duration: (60 / state.bpm) * state.beatsPerChord * 0.95 });
        elRoman.textContent = romanFor(step);
        elChord.textContent = resolved.label;
        refreshActiveStep();
      } else {
        // pulse rythmique discret sur la racine (octave grave)
        playNote(frequencyOf(midiOf({ noteIndex: resolved.rootIdx, octave: 2 })), { gain: 0.18, duration: 0.18 });
      }
      state.beat = (state.beat + 1) % state.beatsPerChord;
      if (state.beat === 0) {
        state.cursor = (state.cursor + 1) % prog.steps.length;
      }
      timer = setTimeout(tick, 60000 / state.bpm);
    }
    tick();
  }

  function stopPlayer() {
    if (!state.playing && !timer) return;
    state.playing = false;
    if (timer) { clearTimeout(timer); timer = null; }
    state.cursor = 0;
    state.beat = 0;
    elToggle.setAttribute('aria-pressed', 'false');
    elToggle.classList.remove('is-playing');
    elToggleLabel.textContent = 'Lancer';
    refreshActiveStep();
  }

  // ── Wiring ──
  buildProgChips();
  buildKeyButtons();
  buildBpcChips();
  renderSteps();
  updateNow();

  elToggle.addEventListener('click', () => state.playing ? stopPlayer() : startPlayer());
  wrap.querySelectorAll('[data-delta]').forEach((b) => {
    b.addEventListener('click', () => setBpm(state.bpm + Number(b.dataset.delta)));
  });
  elSlider.addEventListener('input', () => setBpm(Number(elSlider.value)));

  return () => stopPlayer();
}
