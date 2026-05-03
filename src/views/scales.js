import { createFretboard } from '../fretboard.js';
import { noteAtFret, midiOf, frequencyOf, noteLabel, NOTES_FR } from '../notes.js';
import { playNote } from '../audio.js';
import { SCALE_INTERVALS, SCALE_LABELS } from '../theory.js';

const FRETS = 15;
const MIN_BPM = 40;
const MAX_BPM = 240;

const PATTERNS = [
  { id: 'asc-2nds', label: 'Secondes',         hint: '1-2, 2-3, 3-4…'   },
  { id: 'pairs',    label: 'Pairs',            hint: '1-2, 3-4, 5-6…'   },
  { id: 'broken',   label: 'Tierces brisées',  hint: '1-2, 1-3, 2-4…'   },
  { id: 'snake',    label: 'Snake',            hint: 'Par cordes ↑↓'    },
];

const VISUALS = [
  { id: 'none',    label: 'Aucun'  },
  { id: 'group',   label: 'Groupes' },
  { id: 'preview', label: 'Aperçu 4' },
];

// Liste de positions (1 par hauteur unique, sur la corde la plus grave possible),
// triées par MIDI ascendant.
function buildBasePositions(root, intervals) {
  const noteSet = new Set(intervals.map(iv => ((root + iv) % 12 + 12) % 12));
  const all = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= FRETS; f++) {
      const n = noteAtFret(s, f);
      if (!noteSet.has(n.noteIndex)) continue;
      all.push({ stringIdx: s, fret: f, midi: midiOf(n) });
    }
  }
  all.sort((a, b) => a.midi - b.midi || a.stringIdx - b.stringIdx);
  const seen = new Set();
  return all.filter(p => {
    if (seen.has(p.midi)) return false;
    seen.add(p.midi);
    return true;
  });
}

// Pattern A — sequencing en secondes : (n0,n1)(n1,n2)… ascendant + miroir descendant.
function ascSecondsSequence(positions) {
  const seq = [];
  for (let i = 0; i < positions.length - 1; i++) {
    seq.push(positions[i], positions[i + 1]);
  }
  for (let i = positions.length - 1; i > 0; i--) {
    seq.push(positions[i], positions[i - 1]);
  }
  return seq;
}

// Pattern B — pairs disjointes ascendant puis descendant.
function disjointPairsSequence(positions) {
  const seq = [];
  for (let i = 0; i + 1 < positions.length; i += 2) {
    seq.push(positions[i], positions[i + 1]);
  }
  for (let i = positions.length - 1; i - 1 >= 0; i -= 2) {
    seq.push(positions[i], positions[i - 1]);
  }
  return seq;
}

// Pattern C — tierces brisées : 1-2, puis (n-2,n) glissant ascendant + miroir.
function brokenThirdsSequence(positions) {
  const seq = [];
  if (positions.length >= 2) seq.push(positions[0], positions[1]);
  for (let i = 2; i < positions.length; i++) {
    seq.push(positions[i - 2], positions[i]);
  }
  if (positions.length >= 2) {
    seq.push(positions[positions.length - 1], positions[positions.length - 2]);
  }
  for (let i = positions.length - 3; i >= 0; i--) {
    seq.push(positions[i + 2], positions[i]);
  }
  return seq;
}

// Pattern D — snake : sur chaque corde 2 notes ascendantes, traversée 6→1 puis 1→6,
// en avançant de 2 notes par corde à chaque passe, jusqu'à épuisement.
function snakeSequence(root, intervals) {
  const noteSet = new Set(intervals.map(iv => ((root + iv) % 12 + 12) % 12));
  const perString = [];
  for (let s = 0; s < 6; s++) {
    const positions = [];
    for (let f = 0; f <= FRETS; f++) {
      const n = noteAtFret(s, f);
      if (noteSet.has(n.noteIndex)) positions.push({ stringIdx: s, fret: f });
    }
    perString.push(positions);
  }
  const cursor = [0, 0, 0, 0, 0, 0];
  const seq = [];
  let ascending = true;
  let safety = 200;
  while (safety-- > 0) {
    const order = ascending ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
    let advanced = false;
    for (const s of order) {
      if (cursor[s] + 2 <= perString[s].length) {
        seq.push(perString[s][cursor[s]], perString[s][cursor[s] + 1]);
        cursor[s] += 2;
        advanced = true;
      }
    }
    if (!advanced) break;
    ascending = !ascending;
  }
  return seq;
}

function buildSequence(pattern, root, intervals) {
  if (pattern === 'snake') return snakeSequence(root, intervals);
  const base = buildBasePositions(root, intervals);
  if (pattern === 'asc-2nds') return ascSecondsSequence(base);
  if (pattern === 'pairs')    return disjointPairsSequence(base);
  if (pattern === 'broken')   return brokenThirdsSequence(base);
  return base;
}

function setActive(container, btn) {
  container.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

export function mountScales(host) {
  host.innerHTML = `
    <div class="scales-view">
      <h2 class="scales-title">Gammes</h2>
      <p class="scales-subtitle">Visualise une gamme sur le manche, écoute-la en boucle au tempo et dans le motif de ton choix.</p>

      <div class="scales-controls">
        <div class="scales-control-row">
          <span class="scales-control-label">Gamme</span>
          <div class="scales-types chip-row" role="radiogroup" aria-label="Type de gamme"></div>
        </div>
        <div class="scales-control-row">
          <span class="scales-control-label">Tonique</span>
          <div class="note-buttons scales-notes" role="radiogroup" aria-label="Tonique"></div>
        </div>
        <div class="scales-control-row">
          <span class="scales-control-label">Motif</span>
          <div class="scales-patterns chip-row" role="radiogroup" aria-label="Motif"></div>
        </div>
        <div class="scales-control-row">
          <span class="scales-control-label">Visuel</span>
          <div class="scales-visuals chip-row" role="radiogroup" aria-label="Mode visuel"></div>
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
    root: 9,
    scale: 'penta-min',
    pattern: 'snake',
    visual: 'group',
    bpm: 120,
    playing: false,
  };

  const elTypes    = host.querySelector('.scales-types');
  const elNotes    = host.querySelector('.scales-notes');
  const elPatterns = host.querySelector('.scales-patterns');
  const elVisuals  = host.querySelector('.scales-visuals');
  const elBoard    = host.querySelector('.scales-board-container');
  const elToggle   = host.querySelector('[data-toggle]');
  const elToggleLabel = elToggle.querySelector('.scales-toggle-label');
  const elBpm      = host.querySelector('[data-bpm]');
  const elSlider   = host.querySelector('.scales-slider');
  const elNow      = host.querySelector('[data-now]');

  function buildChips(container, items, currentId, onPick, getId = (it) => it.id) {
    container.innerHTML = '';
    items.forEach((item) => {
      const id = getId(item);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (id === currentId ? ' active' : '');
      b.dataset.id = id;
      b.textContent = item.label;
      if (item.hint) b.title = item.hint;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(id === currentId));
      b.addEventListener('click', () => onPick(item, b));
      container.appendChild(b);
    });
  }

  buildChips(elTypes, Object.entries(SCALE_LABELS).map(([id, label]) => ({ id, label })),
    state.scale, (item, btn) => {
      state.scale = item.id;
      setActive(elTypes, btn);
      stopPlayer();
      render();
    });

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

  buildChips(elPatterns, PATTERNS, state.pattern, (item, btn) => {
    state.pattern = item.id;
    setActive(elPatterns, btn);
    stopPlayer();
  });

  buildChips(elVisuals, VISUALS, state.visual, (item, btn) => {
    state.visual = item.id;
    setActive(elVisuals, btn);
    if (!state.playing) {
      board.setGroupOutline(null);
      board.setUpcomingHighlight(null);
    }
  });

  const board = createFretboard(elBoard, { frets: FRETS });
  board.onPositionClick(({ frequency }) => playNote(frequency));

  function render() {
    board.highlightScale({ root: state.root, intervals: SCALE_INTERVALS[state.scale] });
  }

  // ── Player ──
  let timer = null;
  let cursor = 0;
  let sequence = [];

  function setBpm(v) {
    const n = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
    if (n === state.bpm) return;
    state.bpm = n;
    elBpm.textContent = String(n);
    if (Number(elSlider.value) !== n) elSlider.value = String(n);
  }

  function applyVisuals() {
    if (!state.playing || sequence.length === 0) return;
    if (state.visual === 'group') {
      const groupStart = Math.floor(cursor / 2) * 2;
      const group = [sequence[groupStart], sequence[groupStart + 1]].filter(Boolean);
      board.setGroupOutline(group);
      board.setUpcomingHighlight(null);
    } else if (state.visual === 'preview') {
      const next = [];
      const seen = new Set();
      for (let i = 1; i <= 4; i++) {
        const p = sequence[(cursor + i) % sequence.length];
        const key = `${p.stringIdx},${p.fret}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(p);
      }
      board.setUpcomingHighlight(next);
      board.setGroupOutline(null);
    } else {
      board.setGroupOutline(null);
      board.setUpcomingHighlight(null);
    }
  }

  function startPlayer() {
    if (state.playing) return;
    sequence = buildSequence(state.pattern, state.root, SCALE_INTERVALS[state.scale]);
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
      applyVisuals();
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
    board.setGroupOutline(null);
    board.setUpcomingHighlight(null);
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
