// Métronome : scheduler "lookahead" (Chris Wilson) pour timing stable.
// On planifie les clics dans l'AudioContext (sample-accurate), et on
// désynchronise l'UI via requestAnimationFrame en consommant une file
// d'événements horodatés.

const SIGNATURES = [
  { id: 2, label: '2/4' },
  { id: 3, label: '3/4' },
  { id: 4, label: '4/4' },
  { id: 6, label: '6/8' },
];

const CLICK_TYPES = [
  { id: 'wood',    label: 'Wood'    },
  { id: 'click',   label: 'Click'   },
  { id: 'cowbell', label: 'Cowbell' },
  { id: 'beep',    label: 'Beep'    },
];

const TEMPO_LABELS = [
  { max: 60,  name: 'Largo'    },
  { max: 76,  name: 'Adagio'   },
  { max: 108, name: 'Andante'  },
  { max: 120, name: 'Moderato' },
  { max: 156, name: 'Allegro'  },
  { max: 176, name: 'Vivace'   },
  { max: 999, name: 'Presto'   },
];

const MIN_BPM = 30;
const MAX_BPM = 280;

function tempoNameFor(bpm) {
  return TEMPO_LABELS.find((t) => bpm < t.max).name;
}

let audioCtx = null;
let noiseBuffer = null;

function getCtx() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 0.05);
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6);
  }
  return noiseBuffer;
}

function playClick(ctx, type, t, accent) {
  if (type === 'wood') {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = accent ? 2400 : 1700;
    filter.Q.value = 6;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(accent ? 0.55 : 0.38, t + 0.001);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(filter).connect(env).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.06);
  } else if (type === 'click') {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4500;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(accent ? 0.55 : 0.38, t + 0.001);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    src.connect(filter).connect(env).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.04);
  } else if (type === 'cowbell') {
    [800, 540].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = accent ? f * 1.06 : f;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(accent ? 0.16 : 0.11, t + 0.001);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(env).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  } else {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1320 : 880;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(accent ? 0.34 : 0.24, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}

export function mountMetronome(host) {
  const state = {
    bpm: 120,
    beats: 4,
    click: 'wood',
    playing: false,
  };

  const wrap = document.createElement('section');
  wrap.className = 'metronome-view';
  wrap.innerHTML = `
    <div class="card metronome-card">
      <header class="metronome-head">
        <h2 class="metronome-title">Métronome</h2>
        <p class="metronome-sub">Molette sur le tempo, boutons fins, ou curseur — au choix.</p>
      </header>

      <div class="metronome-stage">
        <div class="metronome-display" tabindex="0" role="spinbutton"
             aria-valuemin="${MIN_BPM}" aria-valuemax="${MAX_BPM}" aria-valuenow="${state.bpm}" aria-label="Tempo en BPM">
          <span class="metronome-bpm" data-bpm>${state.bpm}</span>
          <span class="metronome-bpm-unit">BPM</span>
          <div class="metronome-pulse" data-pulse aria-hidden="true"></div>
        </div>
        <div class="metronome-tempo" data-tempo>${tempoNameFor(state.bpm)}</div>
        <div class="metronome-beats" data-beats role="presentation"></div>
      </div>

      <div class="metronome-controls">
        <button type="button" class="bpm-step" data-delta="-10" aria-label="Diminuer de 10">−10</button>
        <button type="button" class="bpm-step" data-delta="-1"  aria-label="Diminuer de 1">−1</button>
        <button type="button" class="metronome-toggle" data-toggle aria-pressed="false">
          <span class="play-icon" aria-hidden="true"></span>
          <span class="metronome-toggle-label">Démarrer</span>
        </button>
        <button type="button" class="bpm-step" data-delta="1"  aria-label="Augmenter de 1">+1</button>
        <button type="button" class="bpm-step" data-delta="10" aria-label="Augmenter de 10">+10</button>
      </div>

      <div class="metronome-slider-wrap">
        <input type="range" class="metronome-slider" min="${MIN_BPM}" max="${MAX_BPM}" value="${state.bpm}" aria-label="Tempo (curseur)">
      </div>

      <div class="metronome-options">
        <div class="metronome-option">
          <span class="metronome-option-label">Mesure</span>
          <div class="chip-row" data-sigs role="radiogroup" aria-label="Signature rythmique"></div>
        </div>
        <div class="metronome-option">
          <span class="metronome-option-label">Son</span>
          <div class="chip-row" data-clicks role="radiogroup" aria-label="Type de clic"></div>
        </div>
      </div>
    </div>
  `;
  host.appendChild(wrap);

  const elBpm     = wrap.querySelector('[data-bpm]');
  const elTempo   = wrap.querySelector('[data-tempo]');
  const elBeats   = wrap.querySelector('[data-beats]');
  const elPulse   = wrap.querySelector('[data-pulse]');
  const elDisplay = wrap.querySelector('.metronome-display');
  const elToggle  = wrap.querySelector('[data-toggle]');
  const elToggleLabel = elToggle.querySelector('.metronome-toggle-label');
  const elSlider  = wrap.querySelector('.metronome-slider');
  const elSigs    = wrap.querySelector('[data-sigs]');
  const elClicks  = wrap.querySelector('[data-clicks]');

  function setBpm(v) {
    const n = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
    if (n === state.bpm) return;
    state.bpm = n;
    elBpm.textContent = String(n);
    elDisplay.setAttribute('aria-valuenow', String(n));
    elTempo.textContent = tempoNameFor(n);
    if (Number(elSlider.value) !== n) elSlider.value = String(n);
  }

  function renderBeats() {
    elBeats.innerHTML = '';
    for (let i = 0; i < state.beats; i++) {
      const dot = document.createElement('span');
      dot.className = 'beat-dot' + (i === 0 ? ' beat-dot-accent' : '');
      elBeats.appendChild(dot);
    }
  }

  function flashBeat(i) {
    const dots = elBeats.querySelectorAll('.beat-dot');
    dots.forEach((d, idx) => d.classList.toggle('is-on', idx === i));
    elPulse.classList.remove('pulsing', 'pulsing-accent');
    void elPulse.offsetWidth;
    elPulse.classList.add('pulsing');
    if (i === 0) elPulse.classList.add('pulsing-accent');
  }

  // ── Chips ──
  function buildChips(container, items, isActive, onPick) {
    container.innerHTML = '';
    items.forEach((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (isActive(item) ? ' active' : '');
      b.textContent = item.label;
      b.dataset.id = String(item.id);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(isActive(item)));
      b.addEventListener('click', () => onPick(item));
      container.appendChild(b);
    });
  }
  function refreshChips(container, isActive) {
    container.querySelectorAll('.chip').forEach((c) => {
      const on = isActive(c.dataset.id);
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', String(on));
    });
  }

  buildChips(elSigs, SIGNATURES, (s) => s.id === state.beats, (s) => {
    state.beats = s.id;
    renderBeats();
    beatNum = 0;
    refreshChips(elSigs, (id) => Number(id) === state.beats);
  });
  buildChips(elClicks, CLICK_TYPES, (c) => c.id === state.click, (c) => {
    state.click = c.id;
    refreshChips(elClicks, (id) => id === state.click);
  });
  renderBeats();

  // ── Scheduler ──
  let nextTime = 0;
  let beatNum = 0;
  let timer = null;
  let raf = null;
  const upcoming = [];

  function schedule() {
    const ctx = audioCtx;
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.1) {
      const accent = beatNum === 0;
      playClick(ctx, state.click, nextTime, accent);
      upcoming.push({ beat: beatNum, time: nextTime });
      nextTime += 60 / state.bpm;
      beatNum = (beatNum + 1) % state.beats;
    }
  }

  function uiTick() {
    const ctx = audioCtx;
    if (!ctx || !state.playing) { raf = null; return; }
    const now = ctx.currentTime;
    while (upcoming.length && upcoming[0].time <= now) {
      flashBeat(upcoming.shift().beat);
    }
    raf = requestAnimationFrame(uiTick);
  }

  function start() {
    if (state.playing) return;
    const ctx = getCtx();
    state.playing = true;
    beatNum = 0;
    upcoming.length = 0;
    nextTime = ctx.currentTime + 0.06;
    schedule();
    timer = setInterval(schedule, 25);
    raf = requestAnimationFrame(uiTick);
    elToggle.setAttribute('aria-pressed', 'true');
    elToggle.classList.add('is-playing');
    elToggleLabel.textContent = 'Arrêter';
  }

  function stop() {
    if (!state.playing) return;
    state.playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (raf)   { cancelAnimationFrame(raf); raf = null; }
    upcoming.length = 0;
    elToggle.setAttribute('aria-pressed', 'false');
    elToggle.classList.remove('is-playing');
    elToggleLabel.textContent = 'Démarrer';
    elBeats.querySelectorAll('.beat-dot').forEach((d) => d.classList.remove('is-on'));
    elPulse.classList.remove('pulsing', 'pulsing-accent');
  }

  // ── Wiring ──
  elToggle.addEventListener('click', () => state.playing ? stop() : start());
  wrap.querySelectorAll('[data-delta]').forEach((b) => {
    b.addEventListener('click', () => setBpm(state.bpm + Number(b.dataset.delta)));
  });
  elSlider.addEventListener('input', () => setBpm(Number(elSlider.value)));

  elDisplay.addEventListener('wheel', (e) => {
    e.preventDefault();
    const step = (Math.abs(e.deltaY) > 40 || e.shiftKey) ? 5 : 1;
    setBpm(state.bpm + (e.deltaY < 0 ? step : -step));
  }, { passive: false });

  elDisplay.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp')   { setBpm(state.bpm + (e.shiftKey ? 5 : 1)); e.preventDefault(); }
    if (e.key === 'ArrowDown') { setBpm(state.bpm - (e.shiftKey ? 5 : 1)); e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter') {
      state.playing ? stop() : start();
      e.preventDefault();
    }
  });

  return () => stop();
}
