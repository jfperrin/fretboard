// Détection de hauteur (pitch) par autocorrélation (ACF2+).
// Sans dépendance externe. Conçu pour des signaux de guitare ou voix.

const RMS_THRESHOLD = 0.015;
const MIN_FREQ = 70;   // un peu en dessous de E2 (≈82 Hz)
const MAX_FREQ = 1100; // suffisant pour 24 frettes sur la corde de Mi aiguë

function autoCorrelate(buf, sampleRate) {
  const N = buf.length;
  let rms = 0;
  for (let i = 0; i < N; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / N);
  if (rms < RMS_THRESHOLD) return -1;

  // Tronquer les bords silencieux pour stabiliser le calcul.
  let r1 = 0, r2 = N - 1;
  const thres = 0.2;
  for (let i = 0; i < N / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < N / 2; i++) {
    if (Math.abs(buf[N - i]) < thres) { r2 = N - i; break; }
  }
  const trimmed = buf.subarray(r1, r2);
  const M = trimmed.length;
  if (M < 64) return -1;

  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.min(M - 1, Math.floor(sampleRate / MIN_FREQ));

  // Autocorrélation O(N²) ; suffisamment rapide pour fftSize=2048 à 60 fps.
  const c = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let s = 0;
    for (let j = 0; j < M - lag; j++) s += trimmed[j] * trimmed[j + lag];
    c[lag] = s;
  }

  // Première vallée puis premier pic significatif.
  let d = 0;
  while (d < maxLag && c[d] > c[d + 1]) d++;
  let bestLag = -1;
  let bestVal = -Infinity;
  for (let i = Math.max(d, minLag); i <= maxLag; i++) {
    if (c[i] > bestVal) { bestVal = c[i]; bestLag = i; }
  }
  if (bestLag <= 0) return -1;

  // Interpolation parabolique pour affiner le pic.
  let T0 = bestLag;
  if (bestLag > 0 && bestLag < maxLag) {
    const x1 = c[bestLag - 1], x2 = c[bestLag], x3 = c[bestLag + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = bestLag - b / (2 * a);
  }
  return sampleRate / T0;
}

export function freqToNoteIndex(freq) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  return ((midi % 12) + 12) % 12;
}

/**
 * Ouvre le micro et expose une méthode `sample()` pour analyser une fenêtre courante.
 * À fermer via `close()` à la fin de la session.
 */
export async function openMic() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  const Ctor = window.AudioContext || window.webkitAudioContext;
  const ac = new Ctor();
  const src = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  return {
    ac,
    sample() {
      analyser.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      const freq = autoCorrelate(buf, ac.sampleRate);
      return { freq, rms };
    },
    close() {
      stream.getTracks().forEach((t) => t.stop());
      ac.close().catch(() => {});
    },
  };
}
