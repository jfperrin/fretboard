import { NOTES_FR, noteAtFret, midiOf, frequencyOf, noteLabel, STRING_LABELS } from '../notes.js';
import { playNote } from '../audio.js';
import { CAGED_SHAPES } from '../theory.js';
import { loadPref, savePref } from '../storage.js';

const ROLE_STYLE = {
  root:  { fill: '#f5b14a',               stroke: '#c07010', text: '#1a0f00' },
  third: { fill: '#56c2ff',               stroke: '#2b8fd6', text: '#001a2a' },
  fifth: { fill: 'rgba(224,224,224,0.92)', stroke: '#aaa',    text: '#1a1a1a' },
};

const STRING_WIDTHS = [3.4, 2.8, 2.2, 1.7, 1.3, 1.0]; // grave -> aiguë

function shapeAnchorNote(shape) {
  return noteAtFret(shape.anchorString, shape.anchorOffset).noteIndex;
}

// Transpose une forme CAGED pour que sa racine ancrée tombe sur targetRoot.
// Retourne { frets, shift } où frets[s] est la frette absolue (ou -1).
function transposeShape(shape, targetRoot) {
  const anchor = shapeAnchorNote(shape);
  const shift = ((targetRoot - anchor) % 12 + 12) % 12;
  const frets = shape.frets.map((f) => (f === -1 ? -1 : f + shift));
  return { frets, shift };
}

function renderShapeSVG(shape, targetRoot) {
  const { frets } = transposeShape(shape, targetRoot);

  const playable = frets.map((f, s) => ({ f, s })).filter((p) => p.f !== -1);
  const minFret = Math.min(...playable.map((p) => p.f));
  const maxFret = Math.max(...playable.map((p) => p.f));
  // Affiche au minimum 4 frettes, démarre 1 frette avant le minimum jouable (si > 0).
  const startFret = Math.max(0, minFret - 1);
  const span = Math.max(4, maxFret - startFret + 1);
  const endFret = startFret + span;

  const W = 280;
  const H = 180;
  const padL = 28;
  const padR = 14;
  const padT = 22;
  const padB = 22;
  const boardW = W - padL - padR;
  const boardH = H - padT - padB;
  const fretWidth = boardW / span;

  // x du centre de la frette n (par rapport au début de la zone affichée)
  const fretCenterX = (n) => padL + ((n - startFret) - 0.5) * fretWidth;
  const stringY = (s) => padT + ((5 - s) * boardH) / 5;

  // Background
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="caged-board" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Forme ${shape.label}">`;

  svg += `<rect x="${padL - 2}" y="${padT - 6}" width="${boardW + 4}" height="${boardH + 12}" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)"/>`;

  // Sillet (uniquement si on commence à 0)
  if (startFret === 0) {
    svg += `<rect x="${padL - 4}" y="${padT - 8}" width="6" height="${boardH + 16}" fill="#f4ead2" rx="1"/>`;
  } else {
    // Numéro de frette de départ
    svg += `<text x="${padL - 8}" y="${padT - 8}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="rgba(255,255,255,0.55)">${startFret + 1}</text>`;
  }

  // Frettes
  for (let n = startFret; n <= endFret; n++) {
    const x = padL + (n - startFret) * fretWidth;
    if (n === startFret && startFret > 0) continue;
    svg += `<line x1="${x}" y1="${padT - 4}" x2="${x}" y2="${padT + boardH + 4}" stroke="rgba(220,220,220,0.5)" stroke-width="1.5"/>`;
  }

  // Cordes
  for (let s = 0; s < 6; s++) {
    const y = stringY(s);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#d8dde6" stroke-width="${STRING_WIDTHS[s]}" opacity="0.85" stroke-linecap="round"/>`;
    svg += `<text x="${padL - 10}" y="${y + 3}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="#f5b14a">${STRING_LABELS[s]}</text>`;
  }

  // Markers (positions jouées) ou X (cordes muettes)
  for (let s = 0; s < 6; s++) {
    const f = frets[s];
    const role = shape.roles[s];
    const y = stringY(s);
    if (f === -1) {
      svg += `<text x="${padL - 18}" y="${y + 4}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="rgba(255,90,90,0.75)">×</text>`;
      continue;
    }
    if (f === 0) {
      svg += `<circle cx="${padL - 18}" cy="${y}" r="5.5" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>`;
      // Affiche en plus le rôle dans la zone "frette 0" virtuelle (à gauche du sillet)
      continue;
    }
    const cx = fretCenterX(f);
    const st = ROLE_STYLE[role] || ROLE_STYLE.fifth;
    svg += `<circle cx="${cx}" cy="${y}" r="11" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.4"/>`;
    const lbl = role === 'root' ? 'R' : role === 'third' ? '3' : '5';
    svg += `<text x="${cx}" y="${y + 3.5}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="${st.text}">${lbl}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

function strumShape(shape, targetRoot) {
  const { frets } = transposeShape(shape, targetRoot);
  let i = 0;
  for (let s = 0; s < 6; s++) {
    const f = frets[s];
    if (f === -1) continue;
    const n = noteAtFret(s, f);
    const freq = frequencyOf(midiOf(n));
    setTimeout(() => playNote(freq, { gain: 0.4, duration: 1.4 }), i * 30);
    i++;
  }
}

export function mountCaged(host) {
  const saved = loadPref('caged.root', 0);
  const initialRoot = Number.isInteger(saved) && saved >= 0 && saved < 12 ? saved : 0;

  const state = { root: initialRoot };

  const wrap = document.createElement('section');
  wrap.className = 'caged-view';
  wrap.innerHTML = `
    <h2 class="caged-title">Système CAGED</h2>
    <p class="caged-subtitle">Cinq formes mobiles d'accord majeur, dérivées des accords ouverts <strong>C, A, G, E, D</strong>. Glisse-les sur le manche pour transposer.</p>

    <div class="caged-controls">
      <span class="caged-control-label">Tonique</span>
      <div class="note-buttons" data-keys role="radiogroup" aria-label="Tonique"></div>
    </div>

    <div class="caged-legend">
      <span class="legend-dot legend-root"></span>Racine
      <span class="legend-dot legend-third"></span>Tierce
      <span class="legend-dot legend-fifth"></span>Quinte
      <span class="caged-legend-sep">·</span>
      <span class="caged-muted-mark">×</span>&nbsp;corde muette
    </div>

    <div class="caged-grid" data-grid></div>
  `;
  host.appendChild(wrap);

  const elKeys = wrap.querySelector('[data-keys]');
  const elGrid = wrap.querySelector('[data-grid]');

  function buildKeys() {
    elKeys.innerHTML = NOTES_FR.map((name, i) =>
      `<button class="note-btn${i === state.root ? ' active' : ''}" data-idx="${i}">${name}</button>`
    ).join('');
    elKeys.addEventListener('click', (e) => {
      const btn = e.target.closest('.note-btn');
      if (!btn) return;
      state.root = Number(btn.dataset.idx);
      savePref('caged.root', state.root);
      elKeys.querySelectorAll('.note-btn').forEach((b) =>
        b.classList.toggle('active', Number(b.dataset.idx) === state.root));
      renderGrid();
    });
  }

  function renderGrid() {
    elGrid.innerHTML = '';
    CAGED_SHAPES.forEach((shape) => {
      const cell = document.createElement('div');
      cell.className = 'caged-cell';
      cell.innerHTML = `
        <header class="caged-cell-head">
          <span class="caged-shape-letter">${shape.label}</span>
          <span class="caged-shape-name">Forme · ${noteLabel(state.root)}</span>
        </header>
        <div class="caged-cell-board">${renderShapeSVG(shape, state.root)}</div>
        <button type="button" class="caged-play" aria-label="Jouer la forme ${shape.label}">
          <span class="play-icon" aria-hidden="true"></span>
          <span>Jouer</span>
        </button>
      `;
      cell.querySelector('.caged-play').addEventListener('click', () => strumShape(shape, state.root));
      elGrid.appendChild(cell);
    });
  }

  buildKeys();
  renderGrid();
  return () => {};
}
