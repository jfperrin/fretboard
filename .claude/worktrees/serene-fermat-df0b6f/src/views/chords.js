import { midiOf, frequencyOf } from '../notes.js';
import { playNote, preloadSamples } from '../audio.js';

// Cycle des quintes (12h, 1h, ..., 11h). Indices NOTES_FR (0..11, Do=0).
const MAJ_NOTE_IDX = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
// Étiquettes affichées : ♯ pour le côté ascendant (1..6), ♭ pour le descendant (7..11).
const MAJ_LABELS = ['Do', 'Sol', 'Ré', 'La', 'Mi', 'Si', 'Fa♯', 'Ré♭', 'La♭', 'Mi♭', 'Si♭', 'Fa'];
// Tonique mineure relative à chaque majeur (3 demi-tons sous = +9 mod 12).
const MIN_LABELS = ['La', 'Mi', 'Si', 'Fa♯', 'Do♯', 'Sol♯', 'Ré♯', 'Si♭', 'Fa', 'Do', 'Sol', 'Ré'];
// Septième degré diminué (vii°) : un demi-ton sous la tonique majeure (+11 mod 12).
const DIM_LABELS = ['Si', 'Fa♯', 'Do♯', 'Sol♯', 'Ré♯', 'La♯', 'Mi♯', 'Do', 'Sol', 'Ré', 'La', 'Mi'];

const SECTOR_DEG = 30;
const R_DIM_OUT = 175, R_DIM_IN = 138;
const R_MAJ_OUT = 138, R_MAJ_IN = 95;
const R_MIN_OUT = 95,  R_MIN_IN = 50;

const TRIAD_INTERVALS = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6] };
const SVG_NS = 'http://www.w3.org/2000/svg';

function polar(r, deg) {
  // Convention : 0° = 12h, sens horaire visuellement (compatible y-down SVG).
  const rad = (deg - 90) * Math.PI / 180;
  return [Math.cos(rad) * r, Math.sin(rad) * r];
}

function annularSectorPath(rIn, rOut, deg1, deg2) {
  const [x1, y1] = polar(rIn,  deg1);
  const [x2, y2] = polar(rOut, deg1);
  const [x3, y3] = polar(rOut, deg2);
  const [x4, y4] = polar(rIn,  deg2);
  const large = (deg2 - deg1) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${rOut} ${rOut} 0 ${large} 1 ${x3.toFixed(2)} ${y3.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} A ${rIn} ${rIn} 0 ${large} 0 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

function maskOutlinePath() {
  // Contour de la "clé" : 1 case dim au-dessus, 3 majeures au milieu, 3 mineures en dedans.
  const fmt = (r, a) => polar(r, a).map(v => v.toFixed(2)).join(' ');
  return [
    `M ${fmt(R_MAJ_OUT, -45)}`,
    `A ${R_MAJ_OUT} ${R_MAJ_OUT} 0 0 1 ${fmt(R_MAJ_OUT, -15)}`,
    `L ${fmt(R_DIM_OUT, -15)}`,
    `A ${R_DIM_OUT} ${R_DIM_OUT} 0 0 1 ${fmt(R_DIM_OUT, 15)}`,
    `L ${fmt(R_MAJ_OUT, 15)}`,
    `A ${R_MAJ_OUT} ${R_MAJ_OUT} 0 0 1 ${fmt(R_MAJ_OUT, 45)}`,
    `L ${fmt(R_MIN_IN, 45)}`,
    `A ${R_MIN_IN} ${R_MIN_IN} 0 0 0 ${fmt(R_MIN_IN, -45)}`,
    'Z',
  ].join(' ');
}

function rootMidi(noteIdx) {
  return midiOf({ noteIndex: noteIdx, octave: 3 });
}

function triadFreqs(rootIdx, quality) {
  return TRIAD_INTERVALS[quality].map(d => frequencyOf(rootMidi(rootIdx) + d));
}

function playTriad(rootIdx, quality) {
  for (const f of triadFreqs(rootIdx, quality)) {
    playNote(f, { duration: 1.4, gain: 0.55 });
  }
}

function sectorFill(quality, i) {
  const hue = (i * 30) % 360;
  if (quality === 'dim') return `hsl(${hue}, 62%, 70%)`;
  if (quality === 'maj') return `hsl(${hue}, 58%, 56%)`;
  return                        `hsl(${hue}, 42%, 38%)`;
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

  const labelSlots = []; // { el, baseAngleDeg, radius }

  function buildRing(quality, rIn, rOut, noteIdxFor, labelFor, suffix) {
    for (let i = 0; i < 12; i++) {
      const start = i * SECTOR_DEG - SECTOR_DEG / 2;
      const end   = start + SECTOR_DEG;

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', annularSectorPath(rIn, rOut, start, end));
      path.setAttribute('class', `wheel-sector wheel-sector-${quality}`);
      path.setAttribute('data-note-index', String(noteIdxFor(i)));
      path.setAttribute('data-quality', quality);
      path.setAttribute('fill', sectorFill(quality, i));
      disc.appendChild(path);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', `wheel-label wheel-label-${quality}`);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = labelFor(i) + suffix;
      labelsG.appendChild(text);

      labelSlots.push({
        el: text,
        baseAngleDeg: i * SECTOR_DEG,
        radius: (rIn + rOut) / 2,
      });
    }
  }

  buildRing('dim', R_DIM_IN, R_DIM_OUT, i => (MAJ_NOTE_IDX[i] + 11) % 12, i => DIM_LABELS[i], '°');
  buildRing('maj', R_MAJ_IN, R_MAJ_OUT, i => MAJ_NOTE_IDX[i],              i => MAJ_LABELS[i], '');
  buildRing('min', R_MIN_IN, R_MIN_OUT, i => (MAJ_NOTE_IDX[i] + 9)  % 12, i => MIN_LABELS[i], ' m');

  // --- Masque fixe ---
  const outline = document.createElementNS(SVG_NS, 'path');
  outline.setAttribute('d', maskOutlinePath());
  outline.setAttribute('class', 'wheel-mask-outline');
  maskG.appendChild(outline);

  const center = document.createElementNS(SVG_NS, 'circle');
  center.setAttribute('cx', '0');
  center.setAttribute('cy', '0');
  center.setAttribute('r', String(R_MIN_IN));
  center.setAttribute('class', 'wheel-center');
  maskG.appendChild(center);

  const centerTitle = document.createElementNS(SVG_NS, 'text');
  centerTitle.setAttribute('class', 'wheel-center-text');
  centerTitle.setAttribute('text-anchor', 'middle');
  centerTitle.setAttribute('dominant-baseline', 'central');
  centerTitle.setAttribute('x', '0');
  centerTitle.setAttribute('y', '-6');
  maskG.appendChild(centerTitle);

  const centerSubtitle = document.createElementNS(SVG_NS, 'text');
  centerSubtitle.setAttribute('class', 'wheel-center-subtext');
  centerSubtitle.setAttribute('text-anchor', 'middle');
  centerSubtitle.setAttribute('dominant-baseline', 'central');
  centerSubtitle.setAttribute('x', '0');
  centerSubtitle.setAttribute('y', '20');
  centerSubtitle.textContent = 'majeur';
  maskG.appendChild(centerSubtitle);

  // Degrés inline (ambre, sans pastille), placés en haut de chaque cellule.
  // Tailles variables : maj plus grand car ce sont les degrés primaires (I, IV, V).
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
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', `wheel-mask-degree-inline wheel-mask-degree-inline-${tag.quality}`);
    t.setAttribute('x', x.toFixed(2));
    t.setAttribute('y', y.toFixed(2));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.textContent = tag.label;
    maskG.appendChild(t);
  }

  // --- État rotation + drag ---
  let angleDeg = 0;            // angle "snappé" courant (multiple de 30°)
  let currentApplied = 0;      // angle appliqué en dernier (peut être pendant animation)
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
      const idx = Number(downSector.getAttribute('data-note-index'));
      const q   = downSector.getAttribute('data-quality');
      playTriad(idx, q);
      return;
    }

    let newAngle = dragStartDiscAngle + cumulativeDelta;
    newAngle = Math.round(newAngle / SECTOR_DEG) * SECTOR_DEG;
    angleDeg = newAngle;
    animateTo(angleDeg);
    renderProgression();
  }

  // Molette : un cran = un secteur (30°). deltaY > 0 (scroll bas) = sens horaire.
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

    const I    = MAJ_LABELS[tonic];
    const IV   = MAJ_LABELS[idxIV];
    const V    = MAJ_LABELS[idxV];
    const ii   = MIN_LABELS[idxIV] + ' m';
    const iii  = MIN_LABELS[idxV]  + ' m';
    const vi   = MIN_LABELS[tonic] + ' m';
    const viio = DIM_LABELS[tonic] + '°';

    const items = [
      ['I',    I],
      ['ii',   ii],
      ['iii',  iii],
      ['IV',   IV],
      ['V',    V],
      ['vi',   vi],
      ['vii°', viio],
    ];
    list.innerHTML = items
      .map(([d, c]) => `<span class="degree-pair"><span class="degree">${d}</span><span class="chord">${c}</span></span>`)
      .join('');

    centerTitle.textContent = I;
  }

  applyRotation(0);
  renderProgression();
  preloadSamples();

  return () => {
    if (animFrame) cancelAnimationFrame(animFrame);
    svg.removeEventListener('pointerdown',   onPointerDown);
    svg.removeEventListener('pointermove',   onPointerMove);
    svg.removeEventListener('pointerup',     onPointerUp);
    svg.removeEventListener('pointercancel', onPointerUp);
    svg.removeEventListener('wheel',         onWheel);
  };
}
