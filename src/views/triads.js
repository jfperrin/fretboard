import { createFretboard } from '../fretboard.js';
import { noteAtFret, midiOf, frequencyOf, noteLabel, NOTES_FR } from '../notes.js';
import { playNote } from '../audio.js';
import { TRIAD_INTERVALS } from '../theory.js';

const STRING_GROUPS = [
  { indices: [3, 4, 5], label: 'Cordes 1 · 2 · 3', openNotes: 'Sol · Si · Mi' },
  { indices: [2, 3, 4], label: 'Cordes 2 · 3 · 4', openNotes: 'Ré · Sol · Si' },
  { indices: [0, 1, 2], label: 'Cordes 4 · 5 · 6', openNotes: 'Mi · La · Ré' },
];

const ROLE_BY_INTERVAL_IDX = ['root', 'third', 'fifth'];

function findVoicings(stringGroup, root, intervals) {
  const [sA, sB, sC] = stringGroup;
  const noteToRole = new Map(intervals.map((iv, i) => [(root + iv) % 12, ROLE_BY_INTERVAL_IDX[i]]));
  const has = (n) => noteToRole.has(n);

  const out = [];
  const seen = new Set();

  for (let fA = 0; fA <= 12; fA++) {
    const nA = noteAtFret(sA, fA).noteIndex;
    if (!has(nA)) continue;
    const lo = Math.max(0, fA - 4), hi = fA + 4;
    for (let fB = lo; fB <= hi; fB++) {
      const nB = noteAtFret(sB, fB).noteIndex;
      if (!has(nB) || nB === nA) continue;
      for (let fC = lo; fC <= hi; fC++) {
        const nC = noteAtFret(sC, fC).noteIndex;
        if (!has(nC) || nC === nA || nC === nB) continue;
        if (Math.max(fA, fB, fC) - Math.min(fA, fB, fC) > 4) continue;
        const key = `${fA},${fB},${fC}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push([
          { stringIdx: sA, fret: fA, role: noteToRole.get(nA), label: noteLabel(nA) },
          { stringIdx: sB, fret: fB, role: noteToRole.get(nB), label: noteLabel(nB) },
          { stringIdx: sC, fret: fC, role: noteToRole.get(nC), label: noteLabel(nC) },
        ]);
      }
    }
  }
  return out;
}

function setActive(container, btn) {
  container.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

export function mountTriads(host) {
  host.innerHTML = `
    <div class="triads-view">
      <h2 class="triads-title">Triades d'accord</h2>
      <p class="triads-subtitle">Positions sur chaque groupe de 3 cordes</p>
      <div class="triads-controls">
        <div class="triads-control-row">
          <span class="triads-control-label">Note</span>
          <div class="note-buttons triads-notes" role="group" aria-label="Tonique"></div>
        </div>
        <div class="triads-control-row">
          <span class="triads-control-label">Qualité</span>
          <div class="triads-quality" role="group" aria-label="Qualité">
            <button class="quality-btn active" data-quality="maj">Majeure</button>
            <button class="quality-btn" data-quality="min">Mineure</button>
            <button class="quality-btn" data-quality="dim">Diminuée</button>
          </div>
        </div>
      </div>
      <div class="triads-legend">
        <span class="legend-dot legend-root"></span>Racine
        <span class="legend-dot legend-third"></span>Tierce
        <span class="legend-dot legend-fifth"></span>Quinte
      </div>
      <div class="triads-groups"></div>
    </div>
  `;

  let selectedRoot = 0;
  let selectedQuality = 'maj';

  const noteContainer = host.querySelector('.triads-notes');
  noteContainer.innerHTML = NOTES_FR.map((name, i) =>
    `<button class="note-btn${i === 0 ? ' active' : ''}" data-idx="${i}">${name}</button>`
  ).join('');
  noteContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.note-btn');
    if (!btn) return;
    selectedRoot = +btn.dataset.idx;
    setActive(noteContainer, btn);
    renderAll();
  });

  const qualityContainer = host.querySelector('.triads-quality');
  qualityContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.quality-btn');
    if (!btn) return;
    selectedQuality = btn.dataset.quality;
    setActive(qualityContainer, btn);
    renderAll();
  });

  const groupsContainer = host.querySelector('.triads-groups');
  const boards = STRING_GROUPS.map(group => {
    const wrapper = document.createElement('div');
    wrapper.className = 'triad-group';
    wrapper.innerHTML = `
      <div class="triad-group-header">${group.label} <span class="triad-open-notes">— ${group.openNotes}</span></div>
      <div class="triad-board-container"></div>
    `;
    groupsContainer.appendChild(wrapper);
    const board = createFretboard(wrapper.querySelector('.triad-board-container'), { frets: 15 });
    board.onPositionClick(({ stringIdx, fret }) => {
      const voicings = findVoicings(group.indices, selectedRoot, TRIAD_INTERVALS[selectedQuality]);
      const v = voicings.find(voicing => voicing.some(p => p.stringIdx === stringIdx && p.fret === fret));
      if (!v) return;
      for (const p of v) playNote(frequencyOf(midiOf(noteAtFret(p.stringIdx, p.fret))));
    });
    return board;
  });

  function renderAll() {
    const intervals = TRIAD_INTERVALS[selectedQuality];
    STRING_GROUPS.forEach((group, i) => {
      boards[i].highlightTriads(findVoicings(group.indices, selectedRoot, intervals));
    });
  }

  renderAll();
  return () => {};
}
