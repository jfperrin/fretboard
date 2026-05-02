import { midiOf, frequencyOf } from '../notes.js';
import { playNote } from '../audio.js';
import { TRIAD_INTERVALS, CYCLE_OF_FIFTHS } from '../theory.js';
import { SVG_NS, polar, annularSectorPath, keyMaskPath } from '../svg/svg-utils.js';

const { majIndex: MAJ_NOTE_IDX, majLabels: MAJ_LABELS, minLabels: MIN_LABELS, dimLabels: DIM_LABELS } = CYCLE_OF_FIFTHS;

const SECTOR_DEG = 30;
const R_DIM_OUT = 175, R_DIM_IN = 138;
const R_MAJ_OUT = 138, R_MAJ_IN = 95;
const R_MIN_OUT = 95,  R_MIN_IN = 50;

function rootMidi(noteIdx) {
  return midiOf({ noteIndex: noteIdx, octave: 3 });
}

function playTriad(rootIdx, quality) {
  for (const d of TRIAD_INTERVALS[quality]) {
    playNote(frequencyOf(rootMidi(rootIdx) + d), { duration: 1.4, gain: 0.55 });
  }
}

function sectorFill(quality, i) {
  const hue = (i * 30) % 360;
  if (quality === 'dim') return `hsl(${hue}, 62%, 70%)`;
  if (quality === 'maj') return `hsl(${hue}, 58%, 56%)`;
  return                        `hsl(${hue}, 42%, 38%)`;
}

function setAttrs(node, attrs) {
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
}
function svgEl(name, attrs = {}, text) {
  const n = document.createElementNS(SVG_NS, name);
  setAttrs(n, attrs);
  if (text !== undefined) n.textContent = text;
  return n;
}

export function mountChords(host) {
  const wrap = document.createElement('div');
  wrap.className = 'chord-wheel-wrap';
  wrap.innerHTML = `
    <section class="card chord-wheel-card">
      <header class="chord-wheel-header">
        <h2>Roue d'accords</h2>
        <p>Tourne le disque (souris ou doigt) pour aligner ta tonalité sous la fenêtre fixe en haut. Clic court sur un accord pour entendre sa triade.</p>
      </header>
      <div class="chord-wheel-stage">
        <svg class="chord-wheel-svg" viewBox="-200 -200 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Roue d'accords sur le cycle des quintes">
          <g class="wheel-disc"></g>
          <g class="wheel-labels" pointer-events="none"></g>
          <g class="wheel-mask" pointer-events="none"></g>
        </svg>
      </div>
      <div class="chord-progression-list" aria-live="polite"></div>
    </section>
  `;
  host.appendChild(wrap);

  const svg     = wrap.querySelector('.chord-wheel-svg');
  const disc    = wrap.querySelector('.wheel-disc');
  const labelsG = wrap.querySelector('.wheel-labels');
  const maskG   = wrap.querySelector('.wheel-mask');
  const list    = wrap.querySelector('.chord-progression-list');

  // --- Construction des 3 anneaux (dim, maj, min) ---
  const labelSlots = []; // { el, baseAngleDeg, radius }

  const RINGS = [
    { quality: 'dim', rIn: R_DIM_IN, rOut: R_DIM_OUT, noteIdxFor: i => (MAJ_NOTE_IDX[i] + 11) % 12, labelFor: i => DIM_LABELS[i], suffix: '°'  },
    { quality: 'maj', rIn: R_MAJ_IN, rOut: R_MAJ_OUT, noteIdxFor: i =>  MAJ_NOTE_IDX[i],            labelFor: i => MAJ_LABELS[i], suffix: ''   },
    { quality: 'min', rIn: R_MIN_IN, rOut: R_MIN_OUT, noteIdxFor: i => (MAJ_NOTE_IDX[i] + 9)  % 12, labelFor: i => MIN_LABELS[i], suffix: ' m' },
  ];
  for (const { quality, rIn, rOut, noteIdxFor, labelFor, suffix } of RINGS) {
    for (let i = 0; i < 12; i++) {
      const start = i * SECTOR_DEG - SECTOR_DEG / 2;
      const end   = start + SECTOR_DEG;

      disc.appendChild(svgEl('path', {
        d: annularSectorPath(rIn, rOut, start, end),
        class: `wheel-sector wheel-sector-${quality}`,
        'data-note-index': noteIdxFor(i),
        'data-quality': quality,
        fill: sectorFill(quality, i),
      }));

      const text = svgEl('text', {
        class: `wheel-label wheel-label-${quality}`,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
      }, labelFor(i) + suffix);
      labelsG.appendChild(text);
      labelSlots.push({ el: text, baseAngleDeg: i * SECTOR_DEG, radius: (rIn + rOut) / 2 });
    }
  }

  // --- Masque fixe ---
  maskG.appendChild(svgEl('path', { d: keyMaskPath({ rDimOut: R_DIM_OUT, rMajOut: R_MAJ_OUT, rInner: R_MIN_IN }), class: 'wheel-mask-outline' }));
  maskG.appendChild(svgEl('circle', { cx: 0, cy: 0, r: R_MIN_IN, class: 'wheel-center' }));

  const centerTitle    = svgEl('text', { class: 'wheel-center-text',    'text-anchor': 'middle', 'dominant-baseline': 'central', x: 0, y: -6 });
  const centerSubtitle = svgEl('text', { class: 'wheel-center-subtext', 'text-anchor': 'middle', 'dominant-baseline': 'central', x: 0, y: 20 }, 'majeur');
  maskG.appendChild(centerTitle);
  maskG.appendChild(centerSubtitle);

  // Degrés inline (ambre, sans pastille), un par cellule de la clé.
  const ROMAN_TAGS = [
    { label: 'vii°', angle:   0, r: R_DIM_OUT - 6, quality: 'dim' },
    { label: 'IV',   angle: -30, r: R_MAJ_OUT - 7, quality: 'maj' },
    { label: 'I',    angle:   0, r: R_MAJ_OUT - 7, quality: 'maj' },
    { label: 'V',    angle:  30, r: R_MAJ_OUT - 7, quality: 'maj' },
    { label: 'ii',   angle: -30, r: R_MIN_OUT - 7, quality: 'min' },
    { label: 'vi',   angle:   0, r: R_MIN_OUT - 7, quality: 'min' },
    { label: 'iii',  angle:  30, r: R_MIN_OUT - 7, quality: 'min' },
  ];
  for (const tag of ROMAN_TAGS) {
    const [x, y] = polar(tag.r, tag.angle);
    maskG.appendChild(svgEl('text', {
      class: `wheel-mask-degree-inline wheel-mask-degree-inline-${tag.quality}`,
      x: x.toFixed(2), y: y.toFixed(2),
      'text-anchor': 'middle', 'dominant-baseline': 'central',
    }, tag.label));
  }

  // --- État rotation + drag ---
  let angleDeg = 0;            // angle "snappé" courant (multiple de 30°)
  let currentApplied = 0;
  let animFrame = 0;
  let dragging = false;
  let lastPointerAngle = 0;
  let cumulativeDelta = 0;
  let dragStartDiscAngle = 0;
  let dragStartTime = 0;
  let dragMoved = false;
  let downSector = null;

  function applyRotation(D) {
    currentApplied = D;
    disc.setAttribute('transform', `rotate(${D.toFixed(2)})`);
    for (const slot of labelSlots) {
      const [x, y] = polar(slot.radius, slot.baseAngleDeg + D);
      slot.el.setAttribute('x', x.toFixed(2));
      slot.el.setAttribute('y', y.toFixed(2));
    }
  }

  function animateTo(target) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const start = currentApplied;
    const dist = target - start;
    if (Math.abs(dist) < 0.01) { applyRotation(target); animFrame = 0; return; }
    const duration = 280;
    const t0 = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      applyRotation(start + dist * eased);
      if (t < 1) animFrame = requestAnimationFrame(tick);
      else animFrame = 0;
    }
    animFrame = requestAnimationFrame(tick);
  }

  function pointerAngle(ev) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
  }

  function onPointerDown(ev) {
    if (!ev.isPrimary) return;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
    dragging = true;
    dragMoved = false;
    cumulativeDelta = 0;
    dragStartTime = performance.now();
    dragStartDiscAngle = currentApplied;
    lastPointerAngle = pointerAngle(ev);
    downSector = ev.target.closest('[data-note-index]');
    try { svg.setPointerCapture(ev.pointerId); } catch {}
  }

  function onPointerMove(ev) {
    if (!dragging) return;
    const a = pointerAngle(ev);
    let step = a - lastPointerAngle;
    // Désambiguïsation du saut de ±360° quand on traverse l'angle ±180°.
    if (step > 180) step -= 360;
    if (step < -180) step += 360;
    cumulativeDelta += step;
    lastPointerAngle = a;
    if (Math.abs(cumulativeDelta) > 4) dragMoved = true;
    applyRotation(dragStartDiscAngle + cumulativeDelta);
  }

  function onPointerUp(ev) {
    if (!dragging) return;
    dragging = false;
    try { svg.releasePointerCapture(ev.pointerId); } catch {}
    const elapsed = performance.now() - dragStartTime;

    if (!dragMoved && elapsed < 350 && downSector) {
      animateTo(angleDeg);
      playTriad(Number(downSector.getAttribute('data-note-index')), downSector.getAttribute('data-quality'));
      return;
    }

    angleDeg = Math.round((dragStartDiscAngle + cumulativeDelta) / SECTOR_DEG) * SECTOR_DEG;
    animateTo(angleDeg);
    renderProgression();
  }

  // Molette : un cran = un secteur (30°).
  let wheelLockUntil = 0;
  function onWheel(ev) {
    ev.preventDefault();
    const now = performance.now();
    if (now < wheelLockUntil) return;
    const dir = Math.sign(ev.deltaY);
    if (!dir) return;
    angleDeg += dir * SECTOR_DEG;
    animateTo(angleDeg);
    renderProgression();
    wheelLockUntil = now + 200;
  }

  svg.addEventListener('pointerdown',   onPointerDown);
  svg.addEventListener('pointermove',   onPointerMove);
  svg.addEventListener('pointerup',     onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);
  svg.addEventListener('wheel',         onWheel, { passive: false });

  function renderProgression() {
    const tonic = ((-Math.round(angleDeg / SECTOR_DEG) % 12) + 12) % 12;
    const idxIV = (tonic - 1 + 12) % 12;
    const idxV  = (tonic + 1) % 12;

    const items = [
      ['I',    MAJ_LABELS[tonic]],
      ['ii',   MIN_LABELS[idxIV] + ' m'],
      ['iii',  MIN_LABELS[idxV]  + ' m'],
      ['IV',   MAJ_LABELS[idxIV]],
      ['V',    MAJ_LABELS[idxV]],
      ['vi',   MIN_LABELS[tonic] + ' m'],
      ['vii°', DIM_LABELS[tonic] + '°'],
    ];
    list.innerHTML = items
      .map(([d, c]) => `<span class="degree-pair"><span class="degree">${d}</span><span class="chord">${c}</span></span>`)
      .join('');

    centerTitle.textContent = MAJ_LABELS[tonic];
  }

  applyRotation(0);
  renderProgression();

  return () => {
    if (animFrame) cancelAnimationFrame(animFrame);
    svg.removeEventListener('pointerdown',   onPointerDown);
    svg.removeEventListener('pointermove',   onPointerMove);
    svg.removeEventListener('pointerup',     onPointerUp);
    svg.removeEventListener('pointercancel', onPointerUp);
    svg.removeEventListener('wheel',         onWheel);
  };
}
