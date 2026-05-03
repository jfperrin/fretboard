import { createFretboard } from '../fretboard.js';
import { noteAtFret, midiOf, frequencyOf, noteLabel, NOTES_FR } from '../notes.js';
import { playNote } from '../audio.js';
import { SCALE_INTERVALS, SCALE_LABELS } from '../theory.js';

const FRETS = 15;
const MIN_BPM = 40;
const MAX_BPM = 240;

function buildScalePositions(root, intervals) {
  const noteSet = new Set(intervals.map(iv => ((root + iv) % 12 + 12) % 12));
  const positions = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= FRETS; f++) {
      const n = noteAtFret(s, f);
      if (!noteSet.has(n.noteIndex)) continue;
      positions.push({ stringIdx: s, fret: f, midi: midiOf(n) });
    }
  }
  // Trier par hauteur ascendante. Pour un même MIDI (même note sur cordes différentes),
  // on garde la corde la plus grave — joue toujours sur la position la plus économique.
  positions.sort((a, b) => a.midi - b.midi || a.stringIdx - b.stringIdx);
  const seen = new Set();
  return positions.filter(p => {
    if (seen.has(p.midi)) return false;
    seen.add(p.midi);
    return true;
  });
}

function setActive(container, btn) {
  container.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

export function mountScales(host) {
  host.innerHTML = `
    <div class="scales-view">
      <h2 class="scales-title">Gammes</h2>
      <p class="scales-subtitle">Visualise une gamme sur le manche, écoute-la en boucle au tempo de ton choix.</p>

      <div class="scales-controls">
        <div class="scales-control-row">
          <span class="scales-control-label">Gamme</span>
          <div class="scales-types" role="radiogroup" aria-label="Type de gamme"></div>
        </div>
        <div class="scales-control-row">
          <span class="scales-control-label">Tonique</span>
          <div class="note-buttons scales-notes" role="radiogroup" aria-label="Tonique"></div>
        </div>
      </div>

      <div class="scales-board-container"></div>

      <div class="scales-player">
        <button type="button" class="scales-toggle" data-toggle aria-pressed="false">
          <span class="play-icon" aria-hidden="true"></span>
          <span class="scales-toggle-label">Jouer la gamme</span>
        </button>
        <div class="scales-bpm">
          <button type="button" class="bpm-step" data-delta="-5" aria-label="Diminuer de 5">−5</button>
          <div class="scales-bpm-value">
            <span data-bpm>120</span>
            <span class="scales-bpm-unit">BPM</span>
          </div>
          <button type="button" class="bpm-step" data-delta="5" aria-label="Augmenter de 5">+5</button>
        </div>
        <input type="range" class="scales-slider" min="${MIN_BPM}" max="${MAX_BPM}" value="120" aria-label="Tempo">
        <div class="scales-now" data-now>—</div>
      </div>
    </div>
  `;

  const state = {
    root: 9,           // La par défaut (penta mineure de La : pratique guitare)
    scale: 'penta-min',
    bpm: 120,
    playing: false,
  };

  const elTypes  = host.querySelector('.scales-types');
  const elNotes  = host.querySelector('.scales-notes');
  const elBoard  = host.querySelector('.scales-board-container');
  const elToggle = host.querySelector('[data-toggle]');
  const elToggleLabel = elToggle.querySelector('.scales-toggle-label');
  const elBpm    = host.querySelector('[data-bpm]');
  const elSlider = host.querySelector('.scales-slider');
  const elNow    = host.querySelector('[data-now]');

  // Chips type de gamme
  Object.entries(SCALE_LABELS).forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (id === state.scale ? ' active' : '');
    b.dataset.id = id;
    b.textContent = label;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === state.scale));
    b.addEventListener('click', () => {
      state.scale = id;
      setActive(elTypes, b);
      stopPlayer();
      render();
    });
    elTypes.appendChild(b);
  });

  // Boutons tonique
  elNotes.innerHTML = NOTES_FR.map((name, i) =>
    `<button class="note-btn${i === state.root ? ' active' : ''}" data-idx="${i}">${name}</button>`
  ).join('');
  elNotes.addEventListener('click', (e) => {
    const btn = e.target.closest('.note-btn');
    if (!btn) return;
    state.root = +btn.dataset.idx;
    setActive(elNotes, btn);
    stopPlayer();
    render();
  });

  const board = createFretboard(elBoard, { frets: FRETS });
  board.onPositionClick(({ frequency }) => playNote(frequency));

  function render() {
    board.highlightScale({ root: state.root, intervals: SCALE_INTERVALS[state.scale] });
  }

  // ── Player ──
  let timer = null;
  let cursor = 0;

  function setBpm(v) {
    const n = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
    if (n === state.bpm) return;
    state.bpm = n;
    elBpm.textContent = String(n);
    if (Number(elSlider.value) !== n) elSlider.value = String(n);
  }

  function startPlayer() {
    if (state.playing) return;
    const positions = buildScalePositions(state.root, SCALE_INTERVALS[state.scale]);
    if (positions.length === 0) return;
    state.playing = true;
    cursor = 0;
    elToggle.setAttribute('aria-pressed', 'true');
    elToggle.classList.add('is-playing');
    elToggleLabel.textContent = 'Arrêter';

    function tick() {
      if (!state.playing) return;
      const p = positions[cursor];
      const n = noteAtFret(p.stringIdx, p.fret);
      playNote(frequencyOf(midiOf(n)));
      board.setPlayhead(p);
      elNow.textContent = `${noteLabel(n.noteIndex)} · corde ${p.stringIdx + 1} · case ${p.fret}`;
      cursor = (cursor + 1) % positions.length;
      timer = setTimeout(tick, 60000 / state.bpm);
    }
    tick();
  }

  function stopPlayer() {
    if (!state.playing && !timer) return;
    state.playing = false;
    if (timer) { clearTimeout(timer); timer = null; }
    board.setPlayhead(null);
    elToggle.setAttribute('aria-pressed', 'false');
    elToggle.classList.remove('is-playing');
    elToggleLabel.textContent = 'Jouer la gamme';
    elNow.textContent = '—';
  }

  elToggle.addEventListener('click', () => state.playing ? stopPlayer() : startPlayer());
  host.querySelectorAll('[data-delta]').forEach(b => {
    b.addEventListener('click', () => setBpm(state.bpm + Number(b.dataset.delta)));
  });
  elSlider.addEventListener('input', () => setBpm(Number(elSlider.value)));

  render();

  return () => stopPlayer();
}
