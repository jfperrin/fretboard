import { createFretboard } from '../fretboard.js';
import { noteAtFret, midiOf, frequencyOf, noteLabel, NOTES_FR } from '../notes.js';
import { playNote } from '../audio.js';

const TRIAD_INTERVALS = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6] };

const STRING_GROUPS = [
  { indices: [3, 4, 5], label: 'Cordes 1 · 2 · 3', openNotes: 'Sol · Si · Mi' },
  { indices: [2, 3, 4], label: 'Cordes 2 · 3 · 4', openNotes: 'Ré · Sol · Si' },
  { indices: [0, 1, 2], label: 'Cordes 4 · 5 · 6', openNotes: 'Mi · La · Ré' },
];

function findVoicings(stringGroup, root, intervals) {
  const [sA, sB, sC] = stringGroup;
  const noteSet = new Set(intervals.map(iv => (root + iv) % 12));
  const roleOf = (ni) => {
    if (ni === (root + intervals[0]) % 12) return 'root';
    if (ni === (root + intervals[1]) % 12) return 'third';
    return 'fifth';
  };

  const voicings = [];
  for (let fA = 0; fA <= 12; fA++) {
    const nA = noteAtFret(sA, fA).noteIndex;
    if (!noteSet.has(nA)) continue;
    const lo = Math.max(0, fA - 4);
    const hi = fA + 4;
    for (let fB = lo; fB <= hi; fB++) {
      const nB = noteAtFret(sB, fB).noteIndex;
      if (!noteSet.has(nB) || nB === nA) continue;
      for (let fC = lo; fC <= hi; fC++) {
        const nC = noteAtFret(sC, fC).noteIndex;
        if (!noteSet.has(nC) || nC === nA || nC === nB) continue;
        const span = Math.max(fA, fB, fC) - Math.min(fA, fB, fC);
        if (span > 4) continue;
        voicings.push([
          { stringIdx: sA, fret: fA, role: roleOf(nA), label: noteLabel(nA) },
          { stringIdx: sB, fret: fB, role: roleOf(nB), label: noteLabel(nB) },
          { stringIdx: sC, fret: fC, role: roleOf(nC), label: noteLabel(nC) },
        ]);
      }
    }
  }
  const seen = new Set();
  return voicings.filter(v => {
    const key = v.map(p => p.fret).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  NOTES_FR.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'note-btn' + (i === 0 ? ' active' : '');
    btn.textContent = name;
    btn.addEventListener('click', () => {
      selectedRoot = i;
      noteContainer.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAll();
    });
    noteContainer.appendChild(btn);
  });

  const qualityContainer = host.querySelector('.triads-quality');
  qualityContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.quality-btn');
    if (!btn) return;
    selectedQuality = btn.dataset.quality;
    qualityContainer.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAll();
  });

  const groupsContainer = host.querySelector('.triads-groups');
  const boards = STRING_GROUPS.map(group => {
    const wrapper = document.createElement('div');
    wrapper.className = 'triad-group';
    wrapper.innerHTML = `<div class="triad-group-header">${group.label} <span class="triad-open-notes">— ${group.openNotes}</span></div>`;
    const boardContainer = document.createElement('div');
    boardContainer.className = 'triad-board-container';
    wrapper.appendChild(boardContainer);
    groupsContainer.appendChild(wrapper);
    const board = createFretboard(boardContainer, { frets: 15, stringIndices: group.indices });
    board.onPositionClick(({ stringIdx, fret }) => {
      const voicings = findVoicings(group.indices, selectedRoot, TRIAD_INTERVALS[selectedQuality]);
      for (const voicing of voicings) {
        const match = voicing.find(p => p.stringIdx === stringIdx && p.fret === fret);
        if (match) {
          voicing.forEach(p => {
            const n = noteAtFret(p.stringIdx, p.fret);
            playNote(frequencyOf(midiOf(n)));
          });
          break;
        }
      }
    });
    return board;
  });

  function renderAll() {
    const intervals = TRIAD_INTERVALS[selectedQuality];
    STRING_GROUPS.forEach((group, i) => {
      const voicings = findVoicings(group.indices, selectedRoot, intervals);
      const seen = new Set();
      const positions = [];
      for (const v of voicings) {
        for (const p of v) {
          const key = `${p.stringIdx}-${p.fret}`;
          if (!seen.has(key)) { seen.add(key); positions.push(p); }
        }
      }
      boards[i].highlightTriad(positions);
    });
  }

  renderAll();
  return () => {};
}
