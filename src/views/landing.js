// Landing page : hero parallaxe + bento d'outils + pitch.

import { renderMiniFretboard, fretXs, stringYs } from '../svg/mini-fretboard.js';
import { polar, annularSectorPath, keyMaskPath } from '../svg/svg-utils.js';
import { CYCLE_OF_FIFTHS } from '../theory.js';
import { buildHeadstock, attachHeadstockHandlers } from './headstock.js';

const NATURALS = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

// Géométrie commune aux mini-manches du bento.
const MINI = {
  w: 280, h: 110,
  padX: 20, stringTop: 15, stringSpan: 80,
  fretTop: 10, fretBottom: 95,
  fretStroke: {
    nut:  { color: 'rgba(255,255,255,0.85)', width: 3   },
    fret: { color: 'rgba(255,255,255,0.18)', width: 1.2 },
  },
  stringStroke: { color: 'rgba(255,255,255,0.32)', base: 0.6, step: 0.18 },
};
const WOOD = { from: '#3a2917', to: '#1d130a' };

function buildMiniFretboard() {
  const xs = fretXs(6, MINI.padX, MINI.w);
  const ys = stringYs(6, MINI.stringTop, MINI.stringSpan);
  const placements = [
    { s: 1, f: 2, c: 'var(--accent)'   },
    { s: 3, f: 4, c: 'var(--accent-2)' },
    { s: 4, f: 1, c: 'var(--accent)'   },
  ];
  const markers = placements.map(({ s, f, c }) =>
    `<circle cx="${(xs[f - 1] + xs[f]) / 2}" cy="${ys[s]}" r="7" fill="${c}" opacity="0.95" />`
  ).join('');
  return renderMiniFretboard({
    ...MINI, frets: 6,
    background: { id: 'wood', ...WOOD },
    inlays: { single: [3, 5] },
    inlayRadius: 3.4,
    markers,
  });
}

function buildTriadsIllu() {
  // Voicing typique Do majeur sur cordes 3-4-5 (Sol/Si/Mi aigu).
  const xs = fretXs(5, MINI.padX, MINI.w);
  const ys = stringYs(6, MINI.stringTop, MINI.stringSpan);
  const triad = [
    { string: 3, fret: 5, color: 'var(--accent)',   label: '1' },
    { string: 4, fret: 5, color: '#ffd28a',         label: '3' },
    { string: 5, fret: 3, color: 'var(--accent-2)', label: '5' },
  ];
  const pts = triad.map(({ string, fret }) => ({
    cx: ((xs[fret - 1] + xs[fret]) / 2).toFixed(1),
    cy: ys[string].toFixed(1),
  }));
  const polygon = `<polygon points="${pts.map(p => `${p.cx},${p.cy}`).join(' ')}"
    fill="rgba(245,177,74,0.16)" stroke="rgba(245,177,74,0.55)"
    stroke-width="1.3" stroke-linejoin="round" />`;
  const dots = triad.map(({ color, label }, i) => {
    const { cx, cy } = pts[i];
    return `
      <circle cx="${cx}" cy="${cy}" r="9.5" fill="${color}" stroke="rgba(0,0,0,0.45)" stroke-width="1" />
      <text x="${cx}" y="${(+cy + 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="central"
            font-family="JetBrains Mono, monospace" font-weight="700" font-size="9"
            fill="rgba(10,13,18,0.92)">${label}</text>
    `;
  }).join('');
  return renderMiniFretboard({
    ...MINI, frets: 5,
    background: { id: 'triadWood', ...WOOD },
    markers: polygon + dots,
  });
}

function buildHeroFretboardSVG() {
  return renderMiniFretboard({
    w: 1400, h: 360, frets: 14,
    padX: 40, stringTop: 30, stringSpan: 300,
    fretTop: 20, fretBottom: 320,
    className: 'hero-fretboard-svg',
    preserveAspectRatio: 'xMidYMid slice',
    fretStroke: {
      nut:  { color: 'rgba(255,255,255,0.18)', width: 4   },
      fret: { color: 'rgba(255,255,255,0.06)', width: 1.3 },
    },
    stringStroke: { color: 'rgba(255,255,255,0.10)', base: 0.7, step: 0.2 },
    inlays: { single: [3, 5, 7, 9], double: [12] },
    inlayColor: 'rgba(255,255,255,0.10)',
    doubleInlayYs: [90, 270],
  });
}

// Roue d'accords détaillée (tile principal du bento). Ne rend pas le masque
// interactif : c'est une illustration.
function buildFeaturedWheelIllu() {
  const size = 260;
  const rOut = 118, rMid = 86, rIn = 54, rCenter = 36;
  const NAMES = CYCLE_OF_FIFTHS.majLabels;

  let body = '';
  for (let i = 0; i < 12; i++) {
    const start = i * 30 - 15;
    const end   = i * 30 + 15;
    const hue   = (i * 30) % 360;
    body += `<path d="${annularSectorPath(rIn, rMid, start, end)}" fill="hsl(${hue},42%,38%)" stroke="rgba(10,13,18,0.4)" stroke-width="0.6" />`;
    body += `<path d="${annularSectorPath(rMid, rOut, start, end)}" fill="hsl(${hue},58%,56%)" stroke="rgba(10,13,18,0.4)" stroke-width="0.6" />`;
    const [xL, yL] = polar((rMid + rOut) / 2, i * 30);
    body += `<text x="${xL.toFixed(1)}" y="${yL.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="rgba(10,13,18,0.92)" font-family="JetBrains Mono, monospace" font-weight="700" font-size="12">${NAMES[i]}</text>`;
  }

  const mask = `
    <path d="${keyMaskPath({ rDimOut: rOut, rMajOut: rMid, rInner: rIn })}"
      fill="rgba(245,177,74,0.10)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"
      style="filter: drop-shadow(0 0 6px rgba(245,177,74,0.4))" />
  `;

  return `
    <svg viewBox="${-size / 2} ${-size / 2} ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${body}
      <circle cx="0" cy="0" r="${rCenter}" fill="var(--bg-1)" stroke="var(--accent)" stroke-width="1.5" />
      <text x="0" y="-4" text-anchor="middle" dominant-baseline="central"
            fill="var(--fg)" font-family="JetBrains Mono, monospace" font-weight="700" font-size="22">Do</text>
      <text x="0" y="16" text-anchor="middle" dominant-baseline="central"
            fill="var(--fg-dim)" font-family="Inter, sans-serif" font-weight="500" font-size="9" letter-spacing="0.12em">MAJEUR</text>
      ${mask}
    </svg>
  `;
}

function buildEarIllu() {
  return `
    <svg viewBox="0 0 280 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="noteg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="var(--accent)"/>
        </linearGradient>
        <linearGradient id="waveg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0"   stop-color="var(--accent-2)" stop-opacity="0.2"/>
          <stop offset="0.5" stop-color="var(--accent-2)"/>
          <stop offset="1"   stop-color="var(--accent-2)" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <text x="32" y="78" font-family="JetBrains Mono, monospace" font-weight="700"
            font-size="64" fill="url(#noteg)">Sol</text>
      <path d="M 160 55 Q 175 30 190 55 T 220 55 T 250 55 T 270 55"
            fill="none" stroke="url(#waveg)" stroke-width="2.4" stroke-linecap="round" />
      <path d="M 160 65 Q 175 80 190 65 T 220 65 T 250 65 T 270 65"
            fill="none" stroke="url(#waveg)" stroke-width="1.6" stroke-linecap="round" opacity="0.6" />
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
        ${NATURALS.map((n, i) => `<span class="floating-note" style="--i:${i}">${n}</span>`).join('')}
      </div>
      <div class="landing-hero-content parallax-layer" data-speed="0.85">
        <h1 class="landing-title">Fretboard</h1>
        <p class="landing-lede">
          Mémorise le manche, construis tes accords, joue à l'oreille.<br>
          Quatre outils interactifs en notation française&nbsp;— tout dans ton navigateur, sans installation.
        </p>
        <div class="landing-neck">
          <div class="headstock">${buildHeadstock()}</div>
          <nav class="landing-nav" aria-label="Navigation rapide">
            <a href="#/manche">Visualiseur<br>de manche</a>
            <a href="#/accords">Roue<br>d'accords</a>
            <span class="neck-inlay" aria-hidden="true"></span>
            <a href="#/game">Jeu<br>d'oreille</a>
            <span class="neck-inlay" aria-hidden="true"></span>
            <a href="#/triades">Triades<br>d'accord</a>
            <span class="neck-inlay" aria-hidden="true"></span>
          </nav>
        </div>
        <nav class="landing-nav-mobile" aria-label="Navigation rapide">
          <a href="#/manche"><span class="lnm-label">Visualiseur de manche</span><span class="lnm-arrow" aria-hidden="true">→</span></a>
          <a href="#/accords"><span class="lnm-label">Roue d'accords</span><span class="lnm-arrow" aria-hidden="true">→</span></a>
          <a href="#/game"><span class="lnm-label">Jeu d'oreille</span><span class="lnm-arrow" aria-hidden="true">→</span></a>
          <a href="#/triades"><span class="lnm-label">Triades d'accord</span><span class="lnm-arrow" aria-hidden="true">→</span></a>
        </nav>
        <div class="landing-scroll-hint" aria-hidden="true">
          <span>Découvrir</span>
          <span class="landing-scroll-arrow"></span>
        </div>
      </div>
    </div>

    <section class="landing-section landing-modes">
      <header class="section-header">
        <span class="section-eyebrow">02 · Outils</span>
        <h2>Visualise. Comprends. Construis. Joue.</h2>
        <p class="section-sub">Quatre outils complémentaires&nbsp;— mémoriser le manche, théoriser les progressions, construire les voicings et s'entraîner à l'oreille.</p>
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
            <span class="bento-tag">Exploration · 24 frettes</span>
            <h3>Visualiseur de manche</h3>
            <p>Affiche toutes les positions d'une note sur le manche, jouées au sampler de guitare. Clique sur n'importe quel marker pour entendre la note exacte.</p>
            <span class="bento-arrow" aria-hidden="true">→</span>
          </div>
        </a>

        <a class="bento-tile cta-triades" href="#/triades">
          <div class="bento-illu">${buildTriadsIllu()}</div>
          <div class="bento-body">
            <span class="bento-tag">Voicings · 3 cordes</span>
            <h3>Triades d'accord</h3>
            <p>Toutes les positions des accords majeur, mineur et diminué sur chaque groupe de 3 cordes adjacentes. Repère root, tierce et quinte d'un coup d'œil.</p>
            <span class="bento-arrow" aria-hidden="true">→</span>
          </div>
        </a>

        <a class="bento-tile cta-jeu" href="#/game">
          <div class="bento-illu">${buildEarIllu()}</div>
          <div class="bento-body">
            <span class="bento-tag">Entraînement · 10 niveaux</span>
            <h3>Jeu d'oreille</h3>
            <p>Reconnais une note jouée et reproduis-la au micro. Progression des 7 naturelles vers les 12 demi-tons, avec détection de hauteur en temps réel.</p>
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

  // Parallaxe : translateY proportionnel au scroll, throttle rAF.
  const layers = [...wrap.querySelectorAll('.parallax-layer')].map((el) => ({
    el,
    speed: parseFloat(el.dataset.speed || '0'),
  }));
  const heroContent = wrap.querySelector('.landing-hero-content');
  let ticking = false;
  function apply() {
    const y = window.scrollY;
    for (const { el, speed } of layers) {
      el.style.transform = `translate3d(0, ${(-y * speed).toFixed(2)}px, 0)`;
    }
    if (heroContent) heroContent.style.opacity = String(Math.max(0, 1 - y / 500));
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

  const detachHeadstock = attachHeadstockHandlers(wrap.querySelector('.headstock'));

  return () => {
    window.removeEventListener('scroll', onScroll);
    detachHeadstock();
    document.body.classList.remove('topbar-revealed');
    window.scrollTo({ top: 0 });
  };
}
