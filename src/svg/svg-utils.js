// Helpers SVG partagés (roue d'accords, illustrations).
// Convention angulaire : 0° = 12h, sens horaire (y-down).

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function polar(r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return [Math.cos(rad) * r, Math.sin(rad) * r];
}

export function annularSectorPath(rIn, rOut, deg1, deg2) {
  const [x1, y1] = polar(rIn,  deg1);
  const [x2, y2] = polar(rOut, deg1);
  const [x3, y3] = polar(rOut, deg2);
  const [x4, y4] = polar(rIn,  deg2);
  const large = (deg2 - deg1) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${rOut} ${rOut} 0 ${large} 1 ${x3.toFixed(2)} ${y3.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} A ${rIn} ${rIn} 0 ${large} 0 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

// Contour d'une "clé" diatonique : 1 case dim au-dessus, 3 majeures, et un
// retour vers `rInner` (rayon où la clé se referme à ±45°). Centré sur 0°.
export function keyMaskPath({ rDimOut, rMajOut, rInner }) {
  const fmt = (r, a) => polar(r, a).map(v => v.toFixed(2)).join(' ');
  return [
    `M ${fmt(rMajOut, -45)}`,
    `A ${rMajOut} ${rMajOut} 0 0 1 ${fmt(rMajOut, -15)}`,
    `L ${fmt(rDimOut, -15)}`,
    `A ${rDimOut} ${rDimOut} 0 0 1 ${fmt(rDimOut, 15)}`,
    `L ${fmt(rMajOut, 15)}`,
    `A ${rMajOut} ${rMajOut} 0 0 1 ${fmt(rMajOut, 45)}`,
    `L ${fmt(rInner, 45)}`,
    `A ${rInner} ${rInner} 0 0 0 ${fmt(rInner, -45)}`,
    'Z',
  ].join(' ');
}
