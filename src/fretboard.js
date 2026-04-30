import { TUNING, STRING_LABELS, noteAtFret, midiOf, frequencyOf, noteLabel } from './notes.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    node.setAttribute(k, String(v));
  }
  for (const c of children) node.appendChild(c);
  return node;
}

const STRING_WIDTHS = [3.6, 3.0, 2.4, 1.8, 1.4, 1.1]; // grave -> aiguë

export function createFretboard(container, { frets = 15 } = {}) {
  container.innerHTML = '';

  const VB_W = 1200;
  const VB_H = 320;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 40;
  const padBottom = 40;
  const boardW = VB_W - padLeft - padRight;
  const boardH = VB_H - padTop - padBottom;

  // Espacement logarithmique des frettes (modèle 12-TET).
  // Position x de la frette n (0 = sillet, frets = dernière frette représentée).
  // On étire pour que la dernière frette soit à boardW.
  const totalShrink = 1 - Math.pow(2, -frets / 12);
  const fretX = (n) => padLeft + ((1 - Math.pow(2, -n / 12)) / totalShrink) * boardW;

  // Y des cordes : la grave en haut visuellement (convention diagramme manche).
  const stringCount = TUNING.length;
  const stringY = (i) =>
    padTop + ((stringCount - 1 - i) * boardH) / (stringCount - 1);

  const svg = el('svg', {
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    xmlns: SVG_NS,
    role: 'img',
    'aria-label': 'Manche de guitare',
    class: 'fretboard-svg',
  });

  // Définitions (gradients, filtres)
  const defs = el('defs');
  defs.innerHTML = `
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a2418" />
      <stop offset="50%" stop-color="#553521" />
      <stop offset="100%" stop-color="#2c1a10" />
    </linearGradient>
    <linearGradient id="fretMetal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e9eef5" />
      <stop offset="50%" stop-color="#9aa3b0" />
      <stop offset="100%" stop-color="#5a626d" />
    </linearGradient>
    <radialGradient id="markerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#56c2ff" stop-opacity="0.95" />
      <stop offset="60%" stop-color="#2b8fd6" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#1a5d8e" stop-opacity="0.9" />
    </radialGradient>
    <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
      <feOffset dx="0" dy="2" result="off" />
      <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;
  svg.appendChild(defs);

  // Fond bois
  svg.appendChild(el('rect', {
    x: padLeft, y: padTop - 6, width: boardW, height: boardH + 12,
    fill: 'url(#wood)', rx: 6,
    stroke: 'rgba(0,0,0,0.5)', 'stroke-width': 1,
  }));

  // Sillet (nut) — barre épaisse à la frette 0
  svg.appendChild(el('rect', {
    x: padLeft - 6, y: padTop - 8, width: 8, height: boardH + 16,
    fill: '#f4ead2', rx: 2,
    filter: 'url(#softShadow)',
  }));

  // Repères de frettes (inlays)
  const inlayFrets = [3, 5, 7, 9, 15, 17, 19];
  const doubleInlay = [12, 24];
  for (const f of inlayFrets) {
    if (f > frets) continue;
    const cx = (fretX(f - 1) + fretX(f)) / 2;
    const cy = padTop + boardH / 2;
    svg.appendChild(el('circle', {
      cx, cy, r: 7, fill: '#f4ead2', opacity: 0.65,
    }));
  }
  for (const f of doubleInlay) {
    if (f > frets) continue;
    const cx = (fretX(f - 1) + fretX(f)) / 2;
    const y1 = padTop + boardH * 0.28;
    const y2 = padTop + boardH * 0.72;
    svg.appendChild(el('circle', { cx, cy: y1, r: 7, fill: '#f4ead2', opacity: 0.7 }));
    svg.appendChild(el('circle', { cx, cy: y2, r: 7, fill: '#f4ead2', opacity: 0.7 }));
  }

  // Frettes
  for (let f = 1; f <= frets; f++) {
    svg.appendChild(el('rect', {
      x: fretX(f) - 1.5, y: padTop - 4, width: 3, height: boardH + 8,
      fill: 'url(#fretMetal)', rx: 1,
    }));
  }

  // Numéros de frettes
  for (let f = 1; f <= frets; f++) {
    const cx = (fretX(f - 1) + fretX(f)) / 2;
    svg.appendChild(el('text', {
      x: cx, y: VB_H - 12,
      'text-anchor': 'middle',
      'font-family': 'JetBrains Mono, monospace',
      'font-size': 12,
      fill: 'rgba(255,255,255,0.45)',
    })).textContent = String(f);
  }

  // Cordes + labels
  for (let s = 0; s < stringCount; s++) {
    const y = stringY(s);
    svg.appendChild(el('line', {
      x1: padLeft - 8, y1: y, x2: VB_W - padRight, y2: y,
      stroke: '#d8dde6', 'stroke-width': STRING_WIDTHS[s],
      'stroke-linecap': 'round',
      opacity: 0.92,
      filter: 'url(#softShadow)',
    }));
    // Étiquette corde
    svg.appendChild(el('text', {
      x: padLeft - 22, y: y + 4,
      'text-anchor': 'middle',
      'font-family': 'JetBrains Mono, monospace',
      'font-size': 13,
      'font-weight': 700,
      fill: '#f5b14a',
    })).textContent = STRING_LABELS[s];
  }

  // Couche de markers (au-dessus)
  const markersLayer = el('g', { class: 'markers-layer' });
  svg.appendChild(markersLayer);

  // Couche de feedback ponctuel (succès / erreur sur une position cliquée)
  const feedbackLayer = el('g', { class: 'feedback-layer' });
  svg.appendChild(feedbackLayer);

  function positionXY(s, f) {
    const cx = f === 0 ? padLeft - 24 : (fretX(f - 1) + fretX(f)) / 2;
    const cy = stringY(s);
    return { cx, cy };
  }

  // Hit zones cliquables : un cercle invisible par position
  const hitLayer = el('g', { class: 'hit-layer' });
  for (let s = 0; s < stringCount; s++) {
    for (let f = 0; f <= frets; f++) {
      const cx = f === 0 ? padLeft - 24 : (fretX(f - 1) + fretX(f)) / 2;
      const cy = stringY(s);
      const hit = el('circle', {
        cx, cy, r: 14,
        fill: 'transparent',
        class: 'fret-hit',
        'data-string': s,
        'data-fret': f,
        style: 'cursor: pointer;',
      });
      hitLayer.appendChild(hit);
    }
  }
  svg.appendChild(hitLayer);

  container.appendChild(svg);

  // API
  const api = {
    svg,
    fretX,
    stringY,
    frets,
    stringCount,
    highlightNote(noteIndex) {
      markersLayer.innerHTML = '';
      if (noteIndex === null || noteIndex === undefined) return;
      for (let s = 0; s < stringCount; s++) {
        for (let f = 0; f <= frets; f++) {
          const n = noteAtFret(s, f);
          if (n.noteIndex !== noteIndex) continue;
          const cx = f === 0 ? padLeft - 24 : (fretX(f - 1) + fretX(f)) / 2;
          const cy = stringY(s);

          const g = el('g', {
            class: 'marker',
            transform: `translate(${cx} ${cy})`,
          });
          g.appendChild(el('circle', {
            r: 14, fill: 'url(#markerGlow)',
            stroke: '#bfe6ff', 'stroke-width': 1.5,
            filter: 'url(#softShadow)',
          }));
          const label = el('text', {
            'text-anchor': 'middle',
            y: 4,
            'font-family': 'JetBrains Mono, monospace',
            'font-size': 11,
            'font-weight': 700,
            fill: '#0b1620',
          });
          label.textContent = noteLabel(n.noteIndex);
          g.appendChild(label);
          markersLayer.appendChild(g);
        }
      }
    },
    onPositionClick(cb) {
      hitLayer.addEventListener('click', (e) => {
        const target = e.target.closest('.fret-hit');
        if (!target) return;
        const s = parseInt(target.getAttribute('data-string'), 10);
        const f = parseInt(target.getAttribute('data-fret'), 10);
        const n = noteAtFret(s, f);
        cb({
          stringIdx: s,
          fret: f,
          noteIndex: n.noteIndex,
          octave: n.octave,
          frequency: frequencyOf(midiOf(n)),
        });
      });
    },
    flashPosition({ stringIdx, fret, kind }) {
      const { cx, cy } = positionXY(stringIdx, fret);
      const g = el('g', {
        class: `fretboard-feedback fretboard-feedback-${kind}`,
        transform: `translate(${cx} ${cy})`,
      });
      g.appendChild(el('circle', { r: 14, class: 'feedback-pulse' }));
      feedbackLayer.appendChild(g);
      setTimeout(() => g.remove(), 700);
    },
    clearMarkers() {
      markersLayer.innerHTML = '';
    },
  };

  return api;
}
