// Landing page : hero parallaxe à plusieurs couches + CTA + pitch.

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
        <span class="landing-eyebrow">Visualiseur · Jeu d'oreille</span>
        <h1 class="landing-title">Fretboard</h1>
        <p class="landing-lede">
          Apprends les notes du manche en notation française.
          Visualise, écoute, joue&nbsp;— directement dans le navigateur.
        </p>
        <div class="landing-cta-row">
          <a class="btn-primary" href="#/manche">Ouvrir le visualiseur</a>
          <a class="btn-ghost" href="#/game">Jouer au jeu d'oreille</a>
        </div>
        <div class="landing-scroll-hint" aria-hidden="true">
          <span>Découvrir</span>
          <span class="landing-scroll-arrow"></span>
        </div>
      </div>
    </div>

    <section class="landing-section landing-modes">
      <header class="section-header">
        <span class="section-eyebrow">02 · Modes</span>
        <h2>Choisis ton terrain de jeu</h2>
        <p class="section-sub">Deux entrées, une seule application sans dépendances.</p>
      </header>

      <div class="cta-grid">
        <a class="cta-card cta-visualiser" href="#/manche">
          <div class="cta-illu">${buildMiniFretboard()}</div>
          <div class="cta-body">
            <span class="cta-tag">Exploration</span>
            <h3>Visualiseur de manche</h3>
            <p>
              Toutes les positions de chaque note sur 24 frettes, jouées au sampler de guitare.
              Idéal pour mémoriser le manche et travailler à l'oreille.
            </p>
            <span class="cta-arrow" aria-hidden="true">→</span>
          </div>
        </a>

        <a class="cta-card cta-jeu" href="#/game">
          <div class="cta-illu">${buildEarIllu()}</div>
          <div class="cta-body">
            <span class="cta-tag">Entraînement</span>
            <h3>Jeu d'oreille — 10 niveaux</h3>
            <p>
              Reconnais et joue les notes au micro. Progression des 7 naturelles vers les 12 demi-tons,
              avec déblocage palier par palier.
            </p>
            <span class="cta-arrow" aria-hidden="true">→</span>
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

  return () => {
    window.removeEventListener('scroll', onScroll);
    document.body.classList.remove('topbar-revealed');
    window.scrollTo({ top: 0 });
  };
}
