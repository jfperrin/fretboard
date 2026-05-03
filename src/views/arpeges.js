import { createFretboard } from '../fretboard.js';
import { noteAtFret, midiOf, frequencyOf, noteLabel, NOTES_FR } from '../notes.js';
import { playNote } from '../audio.js';
import { ARPEGGIO_INTERVALS, ARPEGGIO_LABELS } from '../theory.js';
import { loadPref, savePref } from '../storage.js';

const FRETS = 15;
const MIN_BPM = 40;
const MAX_BPM = 240;

// Séquence montante puis descendante des notes de l'arpège sur tout le manche.
function arpeggioSequence(root, intervals) {
  const noteSet = new Set(intervals.map((iv) => ((root + iv) % 12 + 12) % 12));
  const positions = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= FRETS; f++) {
      const n = noteAtFret(s, f);
      if (noteSet.has(n.noteIndex)) {
        positions.push({ stringIdx: s, fret: f, midi: midiOf(n) });
      }
    }
  }
  positions.sort((a, b) => a.midi - b.midi);
  // Aller-retour
  const back = positions.slice(0, -1).reverse();
  return [...positions, ...back];
}

function setActive(container, btn) {
  container.querySelectorAll('.active').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
}

export function mountArpeges(host) {
  const saved = loadPref('arpeges', { root: 0, type: 'maj', bpm: 110 });

  const state = {
    root: Number.isInteger(saved.root) && saved.root >= 0 && saved.root < 12 ? saved.root : 0,
    type: ARPEGGIO_INTERVALS[saved.type] ? saved.type : 'maj',
    bpm: Math.max(MIN_BPM, Math.min(MAX_BPM, saved.bpm ?? 110)),
    playing: false,
  };

  function persist() {
    savePref('arpeges', { root: state.root, type: state.type, bpm: state.bpm });
  }

  host.innerHTML = `
    <div class="scales-view arpeges-view">
      <h2 class="scales-title">Arpèges</h2>
      <p class="scales-subtitle">Notes constitutives d'un accord, étalées sur tout le manche. Écoute monter puis descendre.</p>

      <div class="scales-controls">
        <div class="scales-control-row">
          <span class="scales-control-label">Type</span>
          <div class="arpeges-types chip-row" role="radiogroup" aria-label="Type d'arpège"></div>
        </div>
        <div class="scales-control-row">
          <span class="scales-control-label">Tonique</span>
          <div class="note-buttons arpeges-notes" role="radiogroup" aria-label="Tonique"></div>
        </div>
      </div>

      <div class="scales-board-container"></div>

      <div class="scales-player">
        <button type="button" class="scales-toggle" data-toggle aria-pressed="false">
          <span class="play-icon" aria-hidden="true"></span>
          <span class="scales-toggle-label">Jouer l'arpège</span>
        </button>
        <div class="scales-bpm">
          <button type="button" class="bpm-step" data-delta="-5" aria-label="Diminuer de 5">−5</button>
          <div class="scales-bpm-value">
            <span data-bpm>${state.bpm}</span>
            <span class="scales-bpm-unit">BPM</span>
          </div>
          <button type="button" class="bpm-step" data-delta="5" aria-label="Augmenter de 5">+5</button>
        </div>
        <input type="range" class="scales-slider" min="${MIN_BPM}" max="${MAX_BPM}" value="${state.bpm}" aria-label="Tempo">
        <div class="scales-now" data-now>—</div>
      </div>
    </div>
  `;

  const elTypes  = host.querySelector('.arpeges-types');
  const elNotes  = host.querySelector('.arpeges-notes');
  const elBoard  = host.querySelector('.scales-board-container');
  const elToggle = host.querySelector('[data-toggle]');
  const elToggleLabel = elToggle.querySelector('.scales-toggle-label');
  const elBpm    = host.querySelector('[data-bpm]');
  const elSlider = host.querySelector('.scales-slider');
  const elNow    = host.querySelector('[data-now]');

  // Chips de type d'arpège
  Object.entries(ARPEGGIO_LABELS).forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (id === state.type ? ' active' : '');
    b.textContent = label;
    b.dataset.id = id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === state.type));
    b.addEventListener('click', () => {
      state.type = id;
      persist();
      setActive(elTypes, b);
      stopPlayer();
      render();
    });
    elTypes.appendChild(b);
  });

  // Boutons de tonique
  elNotes.innerHTML = NOTES_FR.map((name, i) =>
    `<button class="note-btn${i === state.root ? ' active' : ''}" data-idx="${i}">${name}</button>`
  ).join('');
  elNotes.addEventListener('click', (e) => {
    const btn = e.target.closest('.note-btn');
    if (!btn) return;
    state.root = Number(btn.dataset.idx);
    persist();
    setActive(elNotes, btn);
    stopPlayer();
    render();
  });

  const board = createFretboard(elBoard, { frets: FRETS });
  board.onPositionClick(({ frequency }) => playNote(frequency));

  function render() {
    board.highlightScale({ root: state.root, intervals: ARPEGGIO_INTERVALS[state.type] });
  }

  // Player
  let timer = null;
  let cursor = 0;
  let sequence = [];

  function setBpm(v) {
    const n = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
    if (n === state.bpm) return;
    state.bpm = n;
    elBpm.textContent = String(n);
    if (Number(elSlider.value) !== n) elSlider.value = String(n);
    persist();
  }

  function startPlayer() {
    if (state.playing) return;
    sequence = arpeggioSequence(state.root, ARPEGGIO_INTERVALS[state.type]);
    if (sequence.length === 0) return;
    state.playing = true;
    cursor = 0;
    elToggle.setAttribute('aria-pressed', 'true');
    elToggle.classList.add('is-playing');
    elToggleLabel.textContent = 'Arrêter';

    function tick() {
      if (!state.playing) return;
      const p = sequence[cursor];
      const n = noteAtFret(p.stringIdx, p.fret);
      playNote(frequencyOf(midiOf(n)));
      board.setPlayhead(p);
      elNow.textContent = `${noteLabel(n.noteIndex)} · corde ${p.stringIdx + 1} · case ${p.fret}`;
      cursor = (cursor + 1) % sequence.length;
      timer = setTimeout(tick, 60000 / state.bpm);
    }
    tick();
  }

  function stopPlayer() {
    if (!state.playing && !timer) return;
    state.playing = false;
    if (timer) { clearTimeout(timer); timer = null; }
    sequence = [];
    cursor = 0;
    board.setPlayhead(null);
    elToggle.setAttribute('aria-pressed', 'false');
    elToggle.classList.remove('is-playing');
    elToggleLabel.textContent = "Jouer l'arpège";
    elNow.textContent = '—';
  }

  elToggle.addEventListener('click', () => state.playing ? stopPlayer() : startPlayer());
  host.querySelectorAll('[data-delta]').forEach((b) => {
    b.addEventListener('click', () => setBpm(state.bpm + Number(b.dataset.delta)));
  });
  elSlider.addEventListener('input', () => setBpm(Number(elSlider.value)));

  render();

  return () => stopPlayer();
}
