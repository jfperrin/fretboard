// Landing page : hero parallaxe à plusieurs couches + CTA + pitch.

import { TUNING, STRING_LABELS, midiOf, frequencyOf } from '../notes.js';
import { playNote } from '../audio.js';

const NATURALS = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

function buildMiniFretboard() {
  // Petit manche stylisé (5 frettes, 6 cordes) pour la carte Visualiseur.
  // Logique d'espacement logarithmique simplifiée.
  const w = 280, h = 110, frets = 6, strings = 6;
  const xs = [];
  for (let n = 0; n <= frets; n++) {
    xs.push(20 + (w - 40) * (1 - Math.pow(2, -n / 12)) / (1 - Math.pow(2, -frets / 12)));
  }
  const yStep = (h - 30) / (strings - 1);
  const stringLines = Array.from({ length: strings }, (_, i) =>
    `<line x1="20" y1="${15 + i * yStep}" x2="${w - 20}" y2="${15 + i * yStep}" stroke="rgba(255,255,255,0.32)" stroke-width="${0.6 + (strings - 1 - i) * 0.18}" />`
  ).join('');
  const fretLines = xs.map((x, i) =>
    `<line x1="${x}" y1="10" x2="${x}" y2="${h - 15}" stroke="${i === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)'}" stroke-width="${i === 0 ? 3 : 1.2}" />`
  ).join('');
  const dots = [3, 5].map((f) => {
    const cx = (xs[f - 1] + xs[f]) / 2;
    return `<circle cx="${cx}" cy="${h / 2}" r="3.4" fill="rgba(255,255,255,0.18)" />`;
  }).join('');
  // Quelques markers colorés
  const markers = [
    { s: 1, f: 2, c: 'var(--accent)' },
    { s: 3, f: 4, c: 'var(--accent-2)' },
    { s: 4, f: 1, c: 'var(--accent)' },
  ].map(({ s, f, c }) => {
    const cx = (xs[f - 1] + xs[f]) / 2;
    const cy = 15 + s * yStep;
    return `<circle cx="${cx}" cy="${cy}" r="7" fill="${c}" opacity="0.95" />`;
  }).join('');
  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="14" y="6" width="${w - 28}" height="${h - 12}" rx="6"
            fill="url(#wood)" stroke="rgba(255,255,255,0.06)" />
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3a2917"/>
          <stop offset="1" stop-color="#1d130a"/>
        </linearGradient>
      </defs>
      ${fretLines}
      ${stringLines}
      ${dots}
      ${markers}
    </svg>
  `;
}

function buildFeaturedWheelIllu() {
  // Roue carrée détaillée pour le tile principal du bento.
  const size = 260;
  const cx = size / 2, cy = size / 2;
  const rOut = 118, rMid = 86, rIn = 54, rCenter = 36;
  const NAMES = ['Do', 'Sol', 'Ré', 'La', 'Mi', 'Si', 'Fa♯', 'Ré♭', 'La♭', 'Mi♭', 'Si♭', 'Fa'];

  const minSectors = [], majSectors = [], labels = [];
  const annular = (a1, a2, r1, r2) =>
    `M ${(cx + Math.cos(a1) * r1).toFixed(1)} ${(cy + Math.sin(a1) * r1).toFixed(1)} ` +
    `L ${(cx + Math.cos(a1) * r2).toFixed(1)} ${(cy + Math.sin(a1) * r2).toFixed(1)} ` +
    `A ${r2} ${r2} 0 0 1 ${(cx + Math.cos(a2) * r2).toFixed(1)} ${(cy + Math.sin(a2) * r2).toFixed(1)} ` +
    `L ${(cx + Math.cos(a2) * r1).toFixed(1)} ${(cy + Math.sin(a2) * r1).toFixed(1)} ` +
    `A ${r1} ${r1} 0 0 0 ${(cx + Math.cos(a1) * r1).toFixed(1)} ${(cy + Math.sin(a1) * r1).toFixed(1)} Z`;

  for (let i = 0; i < 12; i++) {
    const aMid = (i * 30 - 90) * Math.PI / 180;
    const a1   = (i * 30 - 15 - 90) * Math.PI / 180;
    const a2   = (i * 30 + 15 - 90) * Math.PI / 180;
    const hue  = (i * 30) % 360;
    minSectors.push(`<path d="${annular(a1, a2, rIn, rMid)}" fill="hsl(${hue},42%,38%)" stroke="rgba(10,13,18,0.4)" stroke-width="0.6" />`);
    majSectors.push(`<path d="${annular(a1, a2, rMid, rOut)}" fill="hsl(${hue},58%,56%)" stroke="rgba(10,13,18,0.4)" stroke-width="0.6" />`);
    const xL = cx + Math.cos(aMid) * ((rMid + rOut) / 2);
    const yL = cy + Math.sin(aMid) * ((rMid + rOut) / 2);
    labels.push(`<text x="${xL.toFixed(1)}" y="${yL.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="rgba(10,13,18,0.92)" font-family="JetBrains Mono, monospace" font-weight="700" font-size="12">${NAMES[i]}</text>`);
  }

  const fmt = (r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  };
  const mask = `
    <path d="M ${fmt(rMid, -45)}
      A ${rMid} ${rMid} 0 0 1 ${fmt(rMid, -15)}
      L ${fmt(rOut, -15)}
      A ${rOut} ${rOut} 0 0 1 ${fmt(rOut, 15)}
      L ${fmt(rMid, 15)}
      A ${rMid} ${rMid} 0 0 1 ${fmt(rMid, 45)}
      L ${fmt(rIn, 45)}
      A ${rIn} ${rIn} 0 0 0 ${fmt(rIn, -45)} Z"
      fill="rgba(245,177,74,0.10)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"
      style="filter: drop-shadow(0 0 6px rgba(245,177,74,0.4))" />
  `;

  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${minSectors.join('')}
      ${majSectors.join('')}
      ${labels.join('')}
      <circle cx="${cx}" cy="${cy}" r="${rCenter}" fill="var(--bg-1)" stroke="var(--accent)" stroke-width="1.5" />
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" dominant-baseline="central"
            fill="var(--fg)" font-family="JetBrains Mono, monospace" font-weight="700" font-size="22">Do</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" dominant-baseline="central"
            fill="var(--fg-dim)" font-family="Inter, sans-serif" font-weight="500" font-size="9" letter-spacing="0.12em">MAJEUR</text>
      ${mask}
    </svg>
  `;
}

function buildChordWheelIllu() {
  // Mini roue : 3 anneaux x 12 secteurs + masque ambré au sommet.
  const cx = 140, cy = 55;
  const rOut = 50, rMid = 38, rIn = 24, rCenter = 12;
  const sectors = [];
  for (let i = 0; i < 12; i++) {
    const a1 = (i * 30 - 15 - 90) * Math.PI / 180;
    const a2 = (i * 30 + 15 - 90) * Math.PI / 180;
    const hue = (i * 30) % 360;
    const ringR = [
      { rIn: rMid, rOut, sat: 56, lum: 60 },
      { rIn,       rOut: rMid, sat: 50, lum: 50 },
    ];
    for (const { rIn: ri, rOut: ro, sat, lum } of ringR) {
      const x1 = cx + Math.cos(a1) * ri,  y1 = cy + Math.sin(a1) * ri;
      const x2 = cx + Math.cos(a1) * ro,  y2 = cy + Math.sin(a1) * ro;
      const x3 = cx + Math.cos(a2) * ro,  y3 = cy + Math.sin(a2) * ro;
      const x4 = cx + Math.cos(a2) * ri,  y4 = cy + Math.sin(a2) * ri;
      sectors.push(
        `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${ro} ${ro} 0 0 1 ${x3.toFixed(1)} ${y3.toFixed(1)} L ${x4.toFixed(1)} ${y4.toFixed(1)} A ${ri} ${ri} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="hsl(${hue}, ${sat}%, ${lum}%)" stroke="rgba(10,13,18,0.35)" stroke-width="0.6" />`
      );
    }
  }
  // Masque clé : 3 cases majeures (11h, 12h, 1h) + 3 mineures + 1 vii° au sommet.
  // Polygone unifié pour simplicité visuelle.
  const fmt = (r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  };
  const mask = `
    <path d="
      M ${fmt(rMid, -45)}
      A ${rMid} ${rMid} 0 0 1 ${fmt(rMid, -15)}
      L ${fmt(rOut, -15)}
      A ${rOut} ${rOut} 0 0 1 ${fmt(rOut, 15)}
      L ${fmt(rMid, 15)}
      A ${rMid} ${rMid} 0 0 1 ${fmt(rMid, 45)}
      L ${fmt(rCenter, 45)}
      A ${rCenter} ${rCenter} 0 0 0 ${fmt(rCenter, -45)}
      Z"
      fill="rgba(245,177,74,0.16)" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" />
  `;
  return `
    <svg viewBox="0 0 280 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${sectors.join('')}
      <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="var(--bg-1)" stroke="rgba(255,255,255,0.08)" />
      ${mask}
      <text x="${cx}" y="${cy + 3}" text-anchor="middle" fill="var(--fg)"
            font-family="JetBrains Mono, monospace" font-weight="700" font-size="11">Do</text>
    </svg>
  `;
}

function buildEarIllu() {
  // Illustration "jeu d'oreille" : grosse note + onde
  return `
    <svg viewBox="0 0 280 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <text x="32" y="78" font-family="JetBrains Mono, monospace" font-weight="700"
            font-size="64" fill="url(#noteg)">Sol</text>
      <defs>
        <linearGradient id="noteg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="var(--accent)"/>
        </linearGradient>
        <linearGradient id="waveg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="var(--accent-2)" stop-opacity="0.2"/>
          <stop offset="0.5" stop-color="var(--accent-2)"/>
          <stop offset="1" stop-color="var(--accent-2)" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <path d="M 160 55 Q 175 30 190 55 T 220 55 T 250 55 T 270 55"
            fill="none" stroke="url(#waveg)" stroke-width="2.4" stroke-linecap="round" />
      <path d="M 160 65 Q 175 80 190 65 T 220 65 T 250 65 T 270 65"
            fill="none" stroke="url(#waveg)" stroke-width="1.6" stroke-linecap="round" opacity="0.6" />
    </svg>
  `;
}

function buildHeadstock() {
  // Tête Les Paul stylisée (3+3) accolée à gauche du menu-manche.
  // viewBox 260×110 : silhouette + 6 mécaniques + 6 cordes vers le sillet.
  const w = 260, h = 110;
  const silhouette = `
    M ${w} 16
    L ${w} 94
    L 60 102
    Q 16 102 8 84
    L 8 64
    Q 36 55 8 46
    L 8 26
    Q 16 8 60 8
    L ${w} 16 Z
  `;
  // Grille interne : 8 cases de largeur égale (260/8 = 32.5).
  // Mécaniques sur les cases 3, 5, 7 (centres x = 81.25, 146.25, 211.25),
  // rentrées à ~25 px des bords haut/bas (top y=35, bottom y=75).
  // Mi grave en bas-droite, Mi aigu en haut-droite, encoches comptées depuis le bas.
  const pegs = [
    { x: 211.25, y: 75 },  // Mi grave (bas droite)
    { x: 146.25, y: 75 },  // La       (bas milieu)
    { x: 81.25,  y: 75 },  // Ré       (bas gauche)
    { x: 81.25,  y: 35 },  // Sol      (haut gauche)
    { x: 146.25, y: 35 },  // Si       (haut milieu)
    { x: 211.25, y: 35 },  // Mi aigu  (haut droite)
  ];
  // Sillet : Mi grave en bas (1re encoche depuis le bas) → Mi aigu en haut (6e).
  const nutY = [88, 74, 60, 50, 36, 22];
  const stringWidths = [1.05, 0.9, 0.78, 0.68, 0.58, 0.48];

  const strings = pegs.map((p, i) =>
    `<line x1="${p.x}" y1="${p.y}" x2="${w - 4}" y2="${nutY[i]}"
           stroke="rgba(220,210,180,0.72)" stroke-width="${stringWidths[i]}" stroke-linecap="round" />`
  ).join('');

  const pegMarks = pegs.map((p, i) => `
    <g class="peg" data-string="${i}" tabindex="0" role="button"
       aria-label="Jouer ${STRING_LABELS[i]} à vide">
      <circle cx="${p.x}" cy="${p.y}" r="7.2" fill="url(#pegMetal)" stroke="#0c0805" stroke-width="0.9" />
      <circle cx="${p.x}" cy="${p.y}" r="2.6" fill="#0a0604" />
      <circle cx="${p.x - 1.6}" cy="${p.y - 1.8}" r="1.2" fill="rgba(255,255,255,0.55)" />
      <circle class="peg-hit" cx="${p.x}" cy="${p.y}" r="12" fill="transparent" />
    </g>
  `).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"
         class="headstock-svg" role="img" aria-label="Tête de guitare — clique une mécanique pour entendre la corde à vide">
      <defs>
        <linearGradient id="headWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3a230f"/>
          <stop offset="0.5" stop-color="#22120a"/>
          <stop offset="1" stop-color="#3a230f"/>
        </linearGradient>
        <radialGradient id="pegMetal" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0"   stop-color="#f3efe6"/>
          <stop offset="0.55" stop-color="#a8a299"/>
          <stop offset="1"   stop-color="#3a342c"/>
        </radialGradient>
        <linearGradient id="nutBone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f4ecd8"/>
          <stop offset="1" stop-color="#c8bd9a"/>
        </linearGradient>
      </defs>
      <path d="${silhouette}" fill="url(#headWood)" stroke="rgba(0,0,0,0.55)" stroke-width="0.8" />
      <text x="${(w - 4) / 2}" y="${h / 2 + 3}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="11" font-weight="700"
            fill="rgba(245,177,74,0.42)" letter-spacing="0.25em">FB</text>
      ${strings}
      ${pegMarks}
      <rect x="${w - 4}" y="14" width="4" height="82" fill="url(#nutBone)" />
    </svg>
  `;
}

function buildHeroFretboardSVG() {
  // Grand manche en filigrane pour le fond du hero.
  const w = 1400, h = 360, frets = 14, strings = 6;
  const xs = [];
  for (let n = 0; n <= frets; n++) {
    xs.push(40 + (w - 80) * (1 - Math.pow(2, -n / 12)) / (1 - Math.pow(2, -frets / 12)));
  }
  const yStep = (h - 60) / (strings - 1);
  const fretLines = xs.map((x, i) =>
    `<line x1="${x}" y1="20" x2="${x}" y2="${h - 40}" stroke="rgba(255,255,255,${i === 0 ? 0.18 : 0.06})" stroke-width="${i === 0 ? 4 : 1.3}" />`
  ).join('');
  const stringLines = Array.from({ length: strings }, (_, i) =>
    `<line x1="40" y1="${30 + i * yStep}" x2="${w - 40}" y2="${30 + i * yStep}" stroke="rgba(255,255,255,0.10)" stroke-width="${0.7 + (strings - 1 - i) * 0.2}" />`
  ).join('');
  const inlays = [3, 5, 7, 9, 12].map((f) => {
    if (f >= xs.length) return '';
    const cx = (xs[f - 1] + xs[f]) / 2;
    if (f === 12) {
      return `<circle cx="${cx}" cy="${30 + yStep * 1}" r="4" fill="rgba(255,255,255,0.10)"/>
              <circle cx="${cx}" cy="${30 + yStep * 4}" r="4" fill="rgba(255,255,255,0.10)"/>`;
    }
    return `<circle cx="${cx}" cy="${h / 2}" r="4" fill="rgba(255,255,255,0.10)"/>`;
  }).join('');
  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"
         class="hero-fretboard-svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      ${fretLines}
      ${stringLines}
      ${inlays}
    </svg>
  `;
}

export function mountLanding(host) {
  const wrap = document.createElement('section');
  wrap.className = 'landing';
  wrap.innerHTML = `
    <div class="landing-hero">
      <div class="parallax-layer parallax-blob" data-speed="0.15"></div>
      <div class="parallax-layer parallax-fretboard" data-speed="0.35">
        ${buildHeroFretboardSVG()}
      </div>
      <div class="parallax-layer parallax-notes" data-speed="0.55" aria-hidden="true">
        ${NATURALS.map((n, i) =>
          `<span class="floating-note" style="--i:${i}">${n}</span>`
        ).join('')}
      </div>
      <div class="landing-hero-content parallax-layer" data-speed="0.85">
        <span class="landing-eyebrow">Visualiseur · Roue d'accords · Jeu d'oreille</span>
        <h1 class="landing-title">Fretboard</h1>
        <p class="landing-lede">
          Apprends les notes du manche en notation française.
          Visualise, écoute, joue&nbsp;— directement dans le navigateur.
        </p>
        <div class="landing-neck">
          <div class="headstock">${buildHeadstock()}</div>
          <nav class="landing-nav" aria-label="Navigation rapide">
            <a href="#/manche">Visualiseur<br>de manche</a>
            <span class="neck-inlay" aria-hidden="true"></span>
            <a href="#/accords">Roue<br>d'accords</a>
            <span class="neck-inlay" aria-hidden="true"></span>
            <a href="#/game">Jeu<br>d'oreille</a>
            <span class="neck-inlay" aria-hidden="true"></span>
            <a href="#/triades">Triades<br>d'accord</a>
          </nav>
        </div>
        <div class="landing-scroll-hint" aria-hidden="true">
          <span>Découvrir</span>
          <span class="landing-scroll-arrow"></span>
        </div>
      </div>
    </div>

    <section class="landing-section landing-modes">
      <header class="section-header">
        <span class="section-eyebrow">02 · Outils</span>
        <h2>Visualise. Comprends. Joue.</h2>
        <p class="section-sub">Trois entrées qui se complètent — pour mémoriser le manche, théoriser les progressions et s'entraîner à l'oreille.</p>
      </header>

      <div class="bento-grid">
        <a class="bento-tile bento-feature cta-accords" href="#/accords">
          <span class="bento-badge">Nouveau</span>
          <div class="bento-illu bento-illu-feature">${buildFeaturedWheelIllu()}</div>
          <div class="bento-body">
            <span class="bento-tag">Harmonie · Cycle des quintes</span>
            <h3>Roue d'accords</h3>
            <p>
              Aligne ta tonalité sous le masque ambré et lis directement les sept degrés diatoniques&nbsp;:
              I, ii, iii, IV, V, vi, vii°. Tourne au drag, à la molette, ou clique pour entendre la triade.
            </p>
            <span class="bento-arrow" aria-hidden="true">→</span>
          </div>
        </a>

        <a class="bento-tile cta-visualiser" href="#/manche">
          <div class="bento-illu">${buildMiniFretboard()}</div>
          <div class="bento-body">
            <span class="bento-tag">Exploration</span>
            <h3>Visualiseur de manche</h3>
            <p>Toutes les positions de chaque note sur 24 frettes, jouées au sampler de guitare.</p>
            <span class="bento-arrow" aria-hidden="true">→</span>
          </div>
        </a>

        <a class="bento-tile cta-jeu" href="#/game">
          <div class="bento-illu">${buildEarIllu()}</div>
          <div class="bento-body">
            <span class="bento-tag">Entraînement · 10 niveaux</span>
            <h3>Jeu d'oreille</h3>
            <p>Reconnais et joue les notes au micro. Progression des 7 naturelles vers les 12 demi-tons.</p>
            <span class="bento-arrow" aria-hidden="true">→</span>
          </div>
        </a>
      </div>
    </section>

    <section class="landing-section landing-pitch">
      <header class="section-header">
        <span class="section-eyebrow">03 · Pourquoi</span>
        <h2>Pensé pour la pratique</h2>
      </header>
      <ul class="pitch-grid">
        <li>
          <span class="pitch-num">01</span>
          <h4>Notation française</h4>
          <p>Do · Ré · Mi … partout dans l'interface, comme dans les solfèges.</p>
        </li>
        <li>
          <span class="pitch-num">02</span>
          <h4>Sampler de guitare</h4>
          <p>Échantillons réels via Web Audio. Pas de fichier audio à télécharger.</p>
        </li>
        <li>
          <span class="pitch-num">03</span>
          <h4>Détection au micro</h4>
          <p>Autocorrélation locale, dans le navigateur. Aucune donnée envoyée.</p>
        </li>
      </ul>
    </section>

    <section class="landing-final">
      <h2>Prêt à apprendre le manche ?</h2>
      <div class="landing-cta-row">
        <a class="btn-primary" href="#/manche">Ouvrir le visualiseur</a>
        <a class="btn-ghost" href="#/game">Lancer le jeu</a>
      </div>
    </section>
  `;
  host.appendChild(wrap);

  // Parallaxe : translate Y proportionnel au scroll, throttle rAF.
  const layers = [...wrap.querySelectorAll('.parallax-layer')].map((el) => ({
    el,
    speed: parseFloat(el.dataset.speed || '0'),
  }));
  let ticking = false;
  function apply() {
    const y = window.scrollY;
    for (const { el, speed } of layers) {
      el.style.transform = `translate3d(0, ${(-y * speed).toFixed(2)}px, 0)`;
    }
    const hero = wrap.querySelector('.landing-hero-content');
    if (hero) {
      const fade = Math.max(0, 1 - y / 500);
      hero.style.opacity = String(fade);
    }
    document.body.classList.toggle('topbar-revealed', y > 360);
    ticking = false;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  apply();

  // Mécaniques de la tête : clic / clavier joue la corde à vide correspondante.
  const headstock = wrap.querySelector('.headstock');
  function pluckString(idx) {
    const t = TUNING[idx];
    if (!t) return;
    playNote(frequencyOf(midiOf({ noteIndex: t.note, octave: t.octave })));
  }
  function onPegActivate(e) {
    const peg = e.target.closest('[data-string]');
    if (!peg) return;
    e.preventDefault();
    peg.classList.add('peg-active');
    setTimeout(() => peg.classList.remove('peg-active'), 320);
    pluckString(+peg.dataset.string);
  }
  function onPegKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    onPegActivate(e);
  }
  headstock?.addEventListener('click', onPegActivate);
  headstock?.addEventListener('keydown', onPegKey);

  return () => {
    window.removeEventListener('scroll', onScroll);
    headstock?.removeEventListener('click', onPegActivate);
    headstock?.removeEventListener('keydown', onPegKey);
    document.body.classList.remove('topbar-revealed');
    window.scrollTo({ top: 0 });
  };
}
