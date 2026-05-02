// Renderer SVG mutualisé pour les illustrations de manche (landing).
// Génère cordes + frettes + sillet + inlays selon une géométrie paramétrable ;
// les markers / overlays propres à chaque vue sont passés en SVG brut.

export function fretXs(frets, padX, w) {
  const span = 1 - Math.pow(2, -frets / 12);
  const xs = [];
  for (let n = 0; n <= frets; n++) {
    xs.push(padX + (w - 2 * padX) * (1 - Math.pow(2, -n / 12)) / span);
  }
  return xs;
}

export function stringYs(strings, stringTop, stringSpan) {
  const step = stringSpan / (strings - 1);
  return Array.from({ length: strings }, (_, i) => stringTop + i * step);
}

export function renderMiniFretboard({
  w, h, frets,
  strings = 6,
  padX,
  stringTop,
  stringSpan,
  fretTop,
  fretBottom,
  className = '',
  preserveAspectRatio,
  background = null,         // { id, from, to, rx }
  fretStroke,                // { nut: {color,width}, fret: {color,width} }
  stringStroke,              // { color, base, step }
  inlays = { single: [], double: [] },
  inlayColor = 'rgba(255,255,255,0.18)',
  inlayRadius = 4,
  doubleInlayYs = null,      // [y1, y2] requis si inlays.double non vide
  markers = '',              // SVG brut inséré au-dessus des cordes
  overlay = '',              // SVG brut inséré tout en haut (au-dessus des markers)
} = {}) {
  const xs = fretXs(frets, padX, w);
  const ys = stringYs(strings, stringTop, stringSpan);

  const fretLines = xs.map((x, i) => {
    const isNut = i === 0;
    const sk = isNut ? fretStroke.nut : fretStroke.fret;
    return `<line x1="${x}" y1="${fretTop}" x2="${x}" y2="${fretBottom}" stroke="${sk.color}" stroke-width="${sk.width}" />`;
  }).join('');

  const stringLines = ys.map((y, i) =>
    `<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="${stringStroke.color}" stroke-width="${(stringStroke.base + (strings - 1 - i) * stringStroke.step).toFixed(2)}" />`
  ).join('');

  const single = (inlays.single || []).map((f) => {
    if (f >= xs.length) return '';
    const cx = (xs[f - 1] + xs[f]) / 2;
    return `<circle cx="${cx}" cy="${(stringTop + stringSpan / 2).toFixed(2)}" r="${inlayRadius}" fill="${inlayColor}" />`;
  }).join('');

  const double = (inlays.double || []).map((f) => {
    if (f >= xs.length || !doubleInlayYs) return '';
    const cx = (xs[f - 1] + xs[f]) / 2;
    return `<circle cx="${cx}" cy="${doubleInlayYs[0]}" r="${inlayRadius}" fill="${inlayColor}" />` +
           `<circle cx="${cx}" cy="${doubleInlayYs[1]}" r="${inlayRadius}" fill="${inlayColor}" />`;
  }).join('');

  let bg = '';
  let defs = '';
  if (background) {
    const m = 14;
    bg = `<rect x="${m}" y="6" width="${w - 2 * m}" height="${h - 12}" rx="${background.rx ?? 6}" fill="url(#${background.id})" stroke="rgba(255,255,255,0.06)" />`;
    defs = `<defs><linearGradient id="${background.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${background.from}"/><stop offset="1" stop-color="${background.to}"/></linearGradient></defs>`;
  }

  const pa = preserveAspectRatio ? ` preserveAspectRatio="${preserveAspectRatio}"` : '';

  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="${className}" aria-hidden="true"${pa}>
      ${bg}
      ${defs}
      ${fretLines}
      ${stringLines}
      ${single}${double}
      ${markers}
      ${overlay}
    </svg>
  `;
}
