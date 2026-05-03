import { playNote } from '../audio.js';
import { openMic } from '../pitch.js';
import { midiOf, frequencyOf, noteLabel } from '../notes.js';

// Accordages : 6 cordes, de la plus grave (corde 6) à la plus aiguë (corde 1).
// note = index 0..11 dans NOTES_FR ; octave = convention scientifique (Do central = C4).
const TUNINGS = [
  { id: 'standard', label: 'Standard', strings: [
    { note: 4,  octave: 2 }, { note: 9,  octave: 2 }, { note: 2, octave: 3 },
    { note: 7,  octave: 3 }, { note: 11, octave: 3 }, { note: 4, octave: 4 },
  ]},
  { id: 'drop-d', label: 'Drop D', strings: [
    { note: 2,  octave: 2 }, { note: 9,  octave: 2 }, { note: 2, octave: 3 },
    { note: 7,  octave: 3 }, { note: 11, octave: 3 }, { note: 4, octave: 4 },
  ]},
  { id: 'drop-c', label: 'Drop C', strings: [
    { note: 0,  octave: 2 }, { note: 7,  octave: 2 }, { note: 0, octave: 3 },
    { note: 5,  octave: 3 }, { note: 9,  octave: 3 }, { note: 2, octave: 4 },
  ]},
  { id: 'drop-b', label: 'Drop B', strings: [
    { note: 11, octave: 1 }, { note: 6,  octave: 2 }, { note: 11, octave: 2 },
    { note: 4,  octave: 3 }, { note: 8,  octave: 3 }, { note: 1,  octave: 4 },
  ]},
  { id: 'eb', label: 'Demi-ton bas (E♭)', strings: [
    { note: 3,  octave: 2 }, { note: 8,  octave: 2 }, { note: 1, octave: 3 },
    { note: 6,  octave: 3 }, { note: 10, octave: 3 }, { note: 3, octave: 4 },
  ]},
  { id: 'd', label: 'Un ton bas (D)', strings: [
    { note: 2,  octave: 2 }, { note: 7,  octave: 2 }, { note: 0, octave: 3 },
    { note: 5,  octave: 3 }, { note: 9,  octave: 3 }, { note: 2, octave: 4 },
  ]},
  { id: 'dadgad', label: 'DADGAD', strings: [
    { note: 2,  octave: 2 }, { note: 9,  octave: 2 }, { note: 2, octave: 3 },
    { note: 7,  octave: 3 }, { note: 9,  octave: 3 }, { note: 2, octave: 4 },
  ]},
  { id: 'open-g', label: 'Open G', strings: [
    { note: 2,  octave: 2 }, { note: 7,  octave: 2 }, { note: 2, octave: 3 },
    { note: 7,  octave: 3 }, { note: 11, octave: 3 }, { note: 2, octave: 4 },
  ]},
  { id: 'open-d', label: 'Open D', strings: [
    { note: 2,  octave: 2 }, { note: 9,  octave: 2 }, { note: 2, octave: 3 },
    { note: 6,  octave: 3 }, { note: 9,  octave: 3 }, { note: 2, octave: 4 },
  ]},
  { id: 'open-e', label: 'Open E', strings: [
    { note: 4,  octave: 2 }, { note: 11, octave: 2 }, { note: 4, octave: 3 },
    { note: 8,  octave: 3 }, { note: 11, octave: 3 }, { note: 4, octave: 4 },
  ]},
  { id: 'open-c', label: 'Open C', strings: [
    { note: 0,  octave: 2 }, { note: 7,  octave: 2 }, { note: 0, octave: 3 },
    { note: 7,  octave: 3 }, { note: 0,  octave: 4 }, { note: 4, octave: 4 },
  ]},
  { id: 'double-drop-d', label: 'Double Drop D', strings: [
    { note: 2,  octave: 2 }, { note: 9,  octave: 2 }, { note: 2, octave: 3 },
    { note: 7,  octave: 3 }, { note: 11, octave: 3 }, { note: 2, octave: 4 },
  ]},
];

const LOOP_INTERVAL_MS = 1800;
const NOTE_DURATION = 1.7;
const CENTS_IN_TUNE = 5;
const CENTS_RANGE = 50;

function stringMidi(s) {
  return midiOf({ noteIndex: s.note, octave: s.octave });
}

function centsBetween(detected, target) {
  return 1200 * Math.log2(detected / target);
}

function nearestStringIdx(strings, freq) {
  const detectedMidi = 69 + 12 * Math.log2(freq / 440);
  let bestIdx = 0;
  let bestDist = Infinity;
  strings.forEach((s, i) => {
    const d = Math.abs(stringMidi(s) - detectedMidi);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  });
  return bestIdx;
}

export function mountTuner(host) {
  const wrap = document.createElement('section');
  wrap.className = 'tuner-view';
  wrap.innerHTML = `
    <h2 class="tuner-title">Accordeur</h2>
    <p class="tuner-subtitle">Choisis un accordage, écoute la référence, et utilise le micro pour vérifier la justesse.</p>

    <div class="tuner-tunings chip-row" role="radiogroup" aria-label="Accordage"></div>

    <div class="tuner-mic">
      <button type="button" class="tuner-mic-toggle" data-mic aria-pressed="false">
        <span class="tuner-mic-dot" aria-hidden="true"></span>
        <span data-mic-label>Activer le micro</span>
      </button>
      <div class="tuner-mic-readout" data-readout>
        <span class="tuner-readout-note" data-detected-note>—</span>
        <span class="tuner-readout-freq" data-detected-freq></span>
      </div>
    </div>

    <ol class="tuner-strings" data-strings></ol>
  `;
  host.appendChild(wrap);

  const elTunings = wrap.querySelector('.tuner-tunings');
  const elStrings = wrap.querySelector('[data-strings]');
  const elMicBtn  = wrap.querySelector('[data-mic]');
  const elMicLabel = wrap.querySelector('[data-mic-label]');
  const elDetectedNote = wrap.querySelector('[data-detected-note]');
  const elDetectedFreq = wrap.querySelector('[data-detected-freq]');
  const elReadout = wrap.querySelector('[data-readout]');

  const state = {
    tuning: TUNINGS[0],
    playingString: null,
    micActive: false,
  };

  let loopTimer = null;
  let mic = null;
  let micRaf = null;
  let stringRows = [];

  function buildTuningChips() {
    elTunings.innerHTML = '';
    TUNINGS.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (t.id === state.tuning.id ? ' active' : '');
      b.textContent = t.label;
      b.dataset.id = t.id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(t.id === state.tuning.id));
      b.addEventListener('click', () => selectTuning(t));
      elTunings.appendChild(b);
    });
  }

  function selectTuning(t) {
    if (t.id === state.tuning.id) return;
    state.tuning = t;
    stopLoop();
    elTunings.querySelectorAll('.chip').forEach((c) => {
      const on = c.dataset.id === t.id;
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', String(on));
    });
    renderStrings();
  }

  function renderStrings() {
    elStrings.innerHTML = '';
    stringRows = [];
    // Affichage : corde 6 (grave) en haut, corde 1 (aiguë) en bas.
    for (let i = state.tuning.strings.length - 1; i >= 0; i--) {
      const s = state.tuning.strings[i];
      const midi = stringMidi(s);
      const freq = frequencyOf(midi);
      const li = document.createElement('li');
      li.className = 'tuner-string';
      li.dataset.idx = String(i);
      li.innerHTML = `
        <button type="button" class="tuner-string-btn" data-play>
          <span class="tuner-string-num">${i + 1}</span>
          <span class="tuner-string-note">${noteLabel(s.note)}<sub>${s.octave}</sub></span>
          <span class="tuner-string-freq">${freq.toFixed(2)} Hz</span>
          <span class="tuner-play-icon" aria-hidden="true"></span>
        </button>
        <div class="tuner-meter" data-meter>
          <div class="tuner-meter-track">
            <div class="tuner-meter-zone"></div>
            <div class="tuner-meter-needle" data-needle></div>
          </div>
          <div class="tuner-meter-cents" data-cents>—</div>
        </div>
      `;
      const btn = li.querySelector('[data-play]');
      btn.addEventListener('click', () => toggleString(i));
      stringRows.push({
        idx: i,
        el: li,
        meter: li.querySelector('[data-meter]'),
        needle: li.querySelector('[data-needle]'),
        cents: li.querySelector('[data-cents]'),
      });
      elStrings.appendChild(li);
    }
    refreshActiveString();
  }

  function refreshActiveString() {
    stringRows.forEach((r) => {
      r.el.classList.toggle('is-playing', r.idx === state.playingString);
    });
  }

  function playOnce(idx) {
    const s = state.tuning.strings[idx];
    playNote(frequencyOf(stringMidi(s)), { duration: NOTE_DURATION, gain: 0.85 });
  }

  function toggleString(idx) {
    if (state.playingString === idx) {
      stopLoop();
    } else {
      startLoop(idx);
    }
  }

  function startLoop(idx) {
    if (loopTimer) clearInterval(loopTimer);
    state.playingString = idx;
    refreshActiveString();
    playOnce(idx);
    loopTimer = setInterval(() => playOnce(idx), LOOP_INTERVAL_MS);
  }

  function stopLoop() {
    if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
    state.playingString = null;
    refreshActiveString();
  }

  // ── Micro ──
  async function startMic() {
    try {
      mic = await openMic();
    } catch (e) {
      console.warn('[tuner] micro indisponible :', e);
      elMicLabel.textContent = 'Micro refusé';
      return;
    }
    state.micActive = true;
    elMicBtn.classList.add('is-on');
    elMicBtn.setAttribute('aria-pressed', 'true');
    elMicLabel.textContent = 'Couper le micro';
    elReadout.classList.add('is-active');
    micTick();
  }

  function stopMic() {
    if (mic) { mic.close(); mic = null; }
    if (micRaf) { cancelAnimationFrame(micRaf); micRaf = null; }
    state.micActive = false;
    elMicBtn.classList.remove('is-on');
    elMicBtn.setAttribute('aria-pressed', 'false');
    elMicLabel.textContent = 'Activer le micro';
    elReadout.classList.remove('is-active');
    elDetectedNote.textContent = '—';
    elDetectedFreq.textContent = '';
    stringRows.forEach((r) => {
      r.el.classList.remove('is-target', 'is-in-tune');
      r.needle.style.setProperty('--pos', '50%');
      r.cents.textContent = '—';
    });
  }

  function micTick() {
    if (!mic) return;
    const { freq } = mic.sample();
    if (freq > 0) {
      const midi = 69 + 12 * Math.log2(freq / 440);
      const noteIdx = ((Math.round(midi) % 12) + 12) % 12;
      elDetectedNote.textContent = noteLabel(noteIdx);
      elDetectedFreq.textContent = `${freq.toFixed(1)} Hz`;

      const nearest = nearestStringIdx(state.tuning.strings, freq);
      const target = frequencyOf(stringMidi(state.tuning.strings[nearest]));
      const cents = centsBetween(freq, target);
      const clamped = Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, cents));
      const pos = ((clamped + CENTS_RANGE) / (2 * CENTS_RANGE)) * 100;

      stringRows.forEach((r) => {
        const isTarget = r.idx === nearest;
        r.el.classList.toggle('is-target', isTarget);
        r.el.classList.toggle('is-in-tune', isTarget && Math.abs(cents) <= CENTS_IN_TUNE);
        if (isTarget) {
          r.needle.style.setProperty('--pos', `${pos}%`);
          const sign = cents > 0 ? '+' : '';
          r.cents.textContent = `${sign}${cents.toFixed(0)} cents`;
        } else {
          r.needle.style.setProperty('--pos', '50%');
          r.cents.textContent = '—';
        }
      });
    } else {
      elDetectedNote.textContent = '—';
      elDetectedFreq.textContent = '';
      stringRows.forEach((r) => {
        r.el.classList.remove('is-target', 'is-in-tune');
        r.needle.style.setProperty('--pos', '50%');
        r.cents.textContent = '—';
      });
    }
    micRaf = requestAnimationFrame(micTick);
  }

  elMicBtn.addEventListener('click', () => {
    if (state.micActive) stopMic(); else startMic();
  });

  buildTuningChips();
  renderStrings();

  return () => {
    stopLoop();
    stopMic();
  };
}
