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

export function createFretboard(container, { frets = 15, stringIndices = [0, 1, 2, 3, 4, 5] } = {}) {
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
  const stringCount = stringIndices.length;
  const stringY = (localIdx) =>
    padTop + ((stringCount - 1 - localIdx) * boardH) / (stringCount - 1);

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
    const tuningIdx = stringIndices[s];
    const y = stringY(s);
    svg.appendChild(el('line', {
      x1: padLeft - 8, y1: y, x2: VB_W - padRight, y2: y,
      stroke: '#d8dde6', 'stroke-width': STRING_WIDTHS[tuningIdx],
      'stroke-linecap': 'round',
      opacity: 0.92,
      filter: 'url(#softShadow)',
    }));
    svg.appendChild(el('text', {
      x: padLeft - 22, y: y + 4,
      'text-anchor': 'middle',
      'font-family': 'JetBrains Mono, monospace',
      'font-size': 13,
      'font-weight': 700,
      fill: '#f5b14a',
    })).textContent = STRING_LABELS[tuningIdx];
  }

  // Couche de markers (au-dessus)
  const markersLayer = el('g', { class: 'markers-layer' });
  svg.appendChild(markersLayer);

  // Couche de feedback ponctuel (succès / erreur sur une position cliquée)
  const feedbackLayer = el('g', { class: 'feedback-layer' });
  svg.appendChild(feedbackLayer);

  function positionXY(localIdx, f) {
    const cx = f === 0 ? padLeft - 24 : (fretX(f - 1) + fretX(f)) / 2;
    const cy = stringY(localIdx);
    return { cx, cy };
  }

  // Hit zones cliquables : un cercle invisible par position
  const hitLayer = el('g', { class: 'hit-layer' });
  for (let local = 0; local < stringCount; local++) {
    const tuningIdx = stringIndices[local];
    for (let f = 0; f <= frets; f++) {
      const cx = f === 0 ? padLeft - 24 : (fretX(f - 1) + fretX(f)) / 2;
      const cy = stringY(local);
      const hit = el('circle', {
        cx, cy, r: 14,
        fill: 'transparent',
        class: 'fret-hit',
        'data-string': tuningIdx,
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
      for (let local = 0; local < stringCount; local++) {
        const s = stringIndices[local];
        for (let f = 0; f <= frets; f++) {
          const n = noteAtFret(s, f);
          if (n.noteIndex !== noteIndex) continue;
          const { cx, cy } = positionXY(local, f);
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
      const localIdx = stringIndices.indexOf(stringIdx);
      if (localIdx === -1) return;
      const { cx, cy } = positionXY(localIdx, fret);
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
    highlightTriads(voicings) {
      markersLayer.innerHTML = '';
      const ROLE_STYLE = {
        root:  { fill: '#f5b14a',               stroke: '#c07010', textFill: '#1a0f00' },
        third: { fill: '#56c2ff',               stroke: '#2b8fd6', textFill: '#001a2a' },
        fifth: { fill: 'rgba(224,224,224,0.9)', stroke: '#aaaaaa', textFill: '#1a1a1a' },
      };
      for (const voicing of voicings) {
        const pts = voicing.map(({ stringIdx, fret }) => {
          const localIdx = stringIndices.indexOf(stringIdx);
          return localIdx === -1 ? null : positionXY(localIdx, fret);
        }).filter(Boolean);
        if (pts.length === 0) continue;

        const fretGap = 8;
        const minFret = Math.min(...voicing.map(p => p.fret));
        const maxFret = Math.max(...voicing.map(p => p.fret));
        // Ancrage sur les fils de frette pour garantir le gap quelle que soit la densité
        const xLeft  = minFret === 0
          ? Math.min(...pts.map(p => p.cx)) - 18
          : fretX(minFret - 1) + fretGap;
        const xRight = fretX(maxFret) - fretGap;
        const yPad = 20;
        const yTop    = Math.min(...pts.map(p => p.cy)) - yPad;
        const yBottom = Math.max(...pts.map(p => p.cy)) + yPad;
        markersLayer.appendChild(el('rect', {
          x: xLeft, y: yTop,
          width: xRight - xLeft,
          height: yBottom - yTop,
          rx: 8,
          fill: 'none',
          stroke: 'rgba(255, 255, 255, 0.45)',
          'stroke-width': 2.5,
        }));

        for (const { stringIdx, fret, role, label } of voicing) {
          const localIdx = stringIndices.indexOf(stringIdx);
          if (localIdx === -1) continue;
          const { cx, cy } = positionXY(localIdx, fret);
          const s = ROLE_STYLE[role];
          const g = el('g', { class: 'marker', transform: `translate(${cx} ${cy})` });
          g.appendChild(el('circle', {
            r: 14, fill: s.fill, stroke: s.stroke, 'stroke-width': 1.5,
            filter: 'url(#softShadow)',
          }));
          const txt = el('text', {
            'text-anchor': 'middle', y: 4,
            'font-family': 'JetBrains Mono, monospace',
            'font-size': 11, 'font-weight': 700,
            fill: s.textFill,
          });
          txt.textContent = label;
          g.appendChild(txt);
          markersLayer.appendChild(g);
        }
      }
    },
  };

  return api;
}
