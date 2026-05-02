// Tête Les Paul stylisée (3+3) accolée à gauche du menu-manche.
// Les pegs portent data-string=0..5 (grave→aigu) et sont activables au clic/clavier
// par le handler attaché par mountLanding.

import { TUNING, midiOf, frequencyOf, STRING_LABELS } from '../notes.js';
import { playNote } from '../audio.js';

const W = 260;
const H = 130;

// Pegs sur les cases 3, 5, 7 d'une grille interne 8 cases (260/8 = 32.5),
// rentrés près des bords (haut y=30, bas y=100).
const PEGS = [
  { x: 211.25, y: 100 }, // Mi grave (bas droite)
  { x: 146.25, y: 100 }, // La
  { x: 81.25,  y: 100 }, // Ré
  { x: 81.25,  y: 30  }, // Sol
  { x: 146.25, y: 30  }, // Si
  { x: 211.25, y: 30  }, // Mi aigu
];

// Sillet : Mi grave en bas (y=98), Mi aigu en haut (y=32) — mêmes y que les
// cordes du menu-manche pour une continuité visuelle.
const NUT_Y = [98, 84, 70, 60, 46, 32];
const STRING_WIDTHS = [1.05, 0.9, 0.78, 0.68, 0.58, 0.48];

function pegMark(p, i) {
  return `
    <g class="peg" data-string="${i}" tabindex="0" role="button"
       aria-label="Jouer ${STRING_LABELS[i]} à vide">
      <circle cx="${p.x + 0.6}" cy="${p.y + 1.8}" r="9" fill="rgba(0,0,0,0.45)" />
      <circle cx="${p.x}" cy="${p.y}" r="9" fill="url(#pegBushing)" stroke="#16181b" stroke-width="0.6" />
      <circle cx="${p.x}" cy="${p.y}" r="6.4" fill="url(#pegPost)" stroke="rgba(18,20,24,0.55)" stroke-width="0.4" />
      <circle cx="${p.x}" cy="${p.y}" r="1.7" fill="#08090b" />
      <ellipse cx="${p.x - 2.1}" cy="${p.y - 2.6}" rx="2.4" ry="1.5" fill="rgba(255,255,255,0.62)" />
      <circle class="peg-hit" cx="${p.x}" cy="${p.y}" r="14" fill="transparent" />
    </g>
  `;
}

// Manettes (style keystone Kluson) : trapèzes qui dépassent du body, dessinés
// AVANT la silhouette pour que la partie intérieure soit masquée.
function knob(p) {
  const isTop = p.y < H / 2;
  const innerHW = 5;
  const outerHW = 7.5;
  const outerY = isTop ? -10 : 140;
  const midY   = isTop ? -1  : 131;
  return `
    <polygon points="${p.x - innerHW},${p.y} ${p.x + innerHW},${p.y} ${p.x + outerHW},${outerY} ${p.x - outerHW},${outerY}"
             fill="url(#knobMetal)" stroke="#0d0f12" stroke-width="0.7" stroke-linejoin="round" />
    <line x1="${p.x - outerHW + 1.5}" y1="${midY}" x2="${p.x + outerHW - 1.5}" y2="${midY}"
          stroke="rgba(0,0,0,0.35)" stroke-width="0.5" />
  `;
}

function string(p, i) {
  return `<line x1="${p.x}" y1="${p.y}" x2="${W - 4}" y2="${NUT_Y[i]}"
                stroke="rgba(220,210,180,0.72)" stroke-width="${STRING_WIDTHS[i]}" stroke-linecap="round" />`;
}

// Silhouette : tête plus large que le manche. Flares en courbes Q pour garder le
// body large jusque près du joint (78px = hauteur du menu).
const SILHOUETTE = `
  M ${W} 26
  L ${W} 104
  Q ${W} 126 60 126
  Q 16 126 8 100
  L 8 78
  Q 36 65 8 52
  L 8 30
  Q 16 4 60 4
  Q ${W} 4 ${W} 26 Z
`;

const DEFS = `
  <defs>
    <linearGradient id="headWood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a230f"/>
      <stop offset="0.5" stop-color="#22120a"/>
      <stop offset="1" stop-color="#3a230f"/>
    </linearGradient>
    <radialGradient id="pegBushing" cx="0.35" cy="0.30" r="0.90">
      <stop offset="0"    stop-color="#dcdee1"/>
      <stop offset="0.45" stop-color="#9d9fa3"/>
      <stop offset="0.85" stop-color="#4d4f53"/>
      <stop offset="1"    stop-color="#1f2125"/>
    </radialGradient>
    <radialGradient id="pegPost" cx="0.35" cy="0.30" r="0.85">
      <stop offset="0"    stop-color="#f4f5f7"/>
      <stop offset="0.5"  stop-color="#b6b9bd"/>
      <stop offset="1"    stop-color="#5a5c60"/>
    </radialGradient>
    <linearGradient id="nutBone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4ecd8"/>
      <stop offset="1" stop-color="#c8bd9a"/>
    </linearGradient>
    <linearGradient id="knobMetal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"    stop-color="#3a3c40"/>
      <stop offset="0.30" stop-color="#b6b9bc"/>
      <stop offset="0.55" stop-color="#eef0f2"/>
      <stop offset="0.78" stop-color="#9c9ea2"/>
      <stop offset="1"    stop-color="#3a3c40"/>
    </linearGradient>
  </defs>
`;

export function buildHeadstock() {
  return `
    <svg viewBox="0 -16 ${W} 162" xmlns="http://www.w3.org/2000/svg"
         class="headstock-svg" role="img" aria-label="Tête de guitare — clique une mécanique pour entendre la corde à vide">
      ${DEFS}
      ${PEGS.map(knob).join('')}
      <path d="${SILHOUETTE}" fill="url(#headWood)" stroke="rgba(0,0,0,0.55)" stroke-width="0.8" />
      <text x="${(W - 4) / 2}" y="${H / 2 + 7}" text-anchor="middle"
            font-family="Allura, cursive" font-size="38"
            fill="rgba(245,177,74,0.82)"
            style="paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 0.7">Fretboard</text>
      ${PEGS.map(string).join('')}
      ${PEGS.map(pegMark).join('')}
      <rect x="${W - 4}" y="24" width="4" height="82" fill="url(#nutBone)" />
    </svg>
  `;
}

// Branche les pegs : clic / Enter / Espace joue la corde à vide.
// Retourne une fonction de cleanup.
export function attachHeadstockHandlers(rootEl) {
  function pluck(idx) {
    const t = TUNING[idx];
    if (!t) return;
    playNote(frequencyOf(midiOf({ noteIndex: t.note, octave: t.octave })));
  }
  function activate(e) {
    const peg = e.target.closest('[data-string]');
    if (!peg) return;
    e.preventDefault();
    peg.classList.add('peg-active');
    setTimeout(() => peg.classList.remove('peg-active'), 320);
    pluck(+peg.dataset.string);
  }
  function onKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    activate(e);
  }
  rootEl.addEventListener('click', activate);
  rootEl.addEventListener('keydown', onKey);
  return () => {
    rootEl.removeEventListener('click', activate);
    rootEl.removeEventListener('keydown', onKey);
  };
}
