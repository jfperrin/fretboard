import { NOTES_FR, noteLabel } from '../notes.js';
import { CHORD_SUFFIX, resolveStep } from '../theory.js';
import { createBackingEngine, STYLES } from '../backing.js';
import { loadPref, savePref } from '../storage.js';

const MIN_BPM = 50;
const MAX_BPM = 200;

const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

function romanFor(step) {
  let r = ROMAN[step.d - 1];
  const q = step.q || 'maj';
  if (q === 'min' || q === 'min7' || q === 'min7b5') r = r.toLowerCase();
  else if (q === 'maj' || q === 'maj7' || q === 'dom7') r = r.toUpperCase();
  if (q === 'dom7' || q === 'min7' || q === 'maj7') r += '7';
  if (q === 'min7b5') r += 'ø';
  return r;
}

export function mountBacking(host) {
  const saved = loadPref('backing', {
    styleId: 'shuffle',
    keyRoot: 9, // La
    bpm: null,  // null = utilise defaultBpm du style
  });

  const initialStyleId = STYLES[saved.styleId] ? saved.styleId : 'shuffle';
  const initialStyle = STYLES[initialStyleId];

  const state = {
    styleId: initialStyleId,
    keyRoot: Number.isInteger(saved.keyRoot) && saved.keyRoot >= 0 && saved.keyRoot < 12 ? saved.keyRoot : 9,
    bpm: Math.max(MIN_BPM, Math.min(MAX_BPM, saved.bpm ?? initialStyle.defaultBpm)),
    playing: false,
  };

  function persist() {
    savePref('backing', { styleId: state.styleId, keyRoot: state.keyRoot, bpm: state.bpm });
  }

  const engine = createBackingEngine();
  engine.setStyle(state.styleId);
  engine.setKey(state.keyRoot);
  engine.setBpm(state.bpm);

  const wrap = document.createElement('section');
  wrap.className = 'backing-view';
  wrap.innerHTML = `
    <h2 class="backing-title">Backing tracks</h2>
    <p class="backing-subtitle">Cinq grooves blues — basse électrique et stabs guitare électrique échantillonnés, batterie synthétisée. Choisis ton style, ta tonalité, ton tempo. Joue par-dessus.</p>

    <div class="backing-controls">
      <div class="backing-control-row">
        <span class="backing-control-label">Style</span>
        <div class="chip-row" data-styles role="radiogroup" aria-label="Style"></div>
      </div>
      <div class="backing-control-row">
        <span class="backing-control-label">Tonalité</span>
        <div class="note-buttons" data-keys role="radiogroup" aria-label="Tonalité"></div>
      </div>
    </div>

    <div class="backing-stage">
      <div class="backing-now">
        <span class="backing-now-label" data-now-label>Mesure 1 / 12</span>
        <span class="backing-now-roman" data-now-roman>—</span>
        <span class="backing-now-chord" data-now-chord>—</span>
        <span class="backing-now-hint" data-now-hint></span>
      </div>
      <div class="backing-bars" data-bars></div>
    </div>

    <div class="backing-player">
      <button type="button" class="backing-toggle" data-toggle aria-pressed="false">
        <span class="play-icon" aria-hidden="true"></span>
        <span class="backing-toggle-label">Lancer</span>
      </button>
      <div class="backing-bpm">
        <button type="button" class="bpm-step" data-delta="-5" aria-label="Diminuer de 5">−5</button>
        <div class="backing-bpm-value">
          <span data-bpm>${state.bpm}</span>
          <span class="backing-bpm-unit">BPM</span>
        </div>
        <button type="button" class="bpm-step" data-delta="5" aria-label="Augmenter de 5">+5</button>
      </div>
      <input type="range" class="backing-slider" min="${MIN_BPM}" max="${MAX_BPM}" value="${state.bpm}" aria-label="Tempo">
    </div>
  `;
  host.appendChild(wrap);

  const elStyles = wrap.querySelector('[data-styles]');
  const elKeys   = wrap.querySelector('[data-keys]');
  const elBars   = wrap.querySelector('[data-bars]');
  const elNowLabel = wrap.querySelector('[data-now-label]');
  const elNowRoman = wrap.querySelector('[data-now-roman]');
  const elNowChord = wrap.querySelector('[data-now-chord]');
  const elNowHint  = wrap.querySelector('[data-now-hint]');
  const elToggle = wrap.querySelector('[data-toggle]');
  const elToggleLabel = elToggle.querySelector('.backing-toggle-label');
  const elBpm = wrap.querySelector('[data-bpm]');
  const elSlider = wrap.querySelector('.backing-slider');

  function buildStyleChips() {
    elStyles.innerHTML = '';
    Object.values(STYLES).forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (s.id === state.styleId ? ' active' : '');
      b.textContent = s.label;
      b.title = s.hint || '';
      b.dataset.id = s.id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(s.id === state.styleId));
      b.addEventListener('click', () => selectStyle(s.id));
      elStyles.appendChild(b);
    });
  }

  function selectStyle(styleId) {
    if (styleId === state.styleId) return;
    state.styleId = styleId;
    engine.setStyle(styleId);
    // Adapte le BPM par défaut si l'utilisateur n'a pas dévié récemment
    const defaultBpm = STYLES[styleId].defaultBpm;
    state.bpm = defaultBpm;
    engine.setBpm(defaultBpm);
    elBpm.textContent = String(defaultBpm);
    elSlider.value = String(defaultBpm);
    persist();
    elStyles.querySelectorAll('.chip').forEach((c) => {
      const on = c.dataset.id === styleId;
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', String(on));
    });
    stopPlayer();
    renderBars();
    updateNow(0);
  }

  function buildKeys() {
    elKeys.innerHTML = NOTES_FR.map((name, i) =>
      `<button class="note-btn${i === state.keyRoot ? ' active' : ''}" data-idx="${i}">${name}</button>`
    ).join('');
    elKeys.addEventListener('click', (e) => {
      const btn = e.target.closest('.note-btn');
      if (!btn) return;
      state.keyRoot = Number(btn.dataset.idx);
      engine.setKey(state.keyRoot);
      persist();
      elKeys.querySelectorAll('.note-btn').forEach((b) =>
        b.classList.toggle('active', Number(b.dataset.idx) === state.keyRoot));
      renderBars();
      updateNow(0);
    });
  }

  function currentStyle() { return STYLES[state.styleId]; }

  function renderBars() {
    elBars.innerHTML = '';
    currentStyle().progression.forEach((step, i) => {
      const resolved = resolveStep(step, state.keyRoot, noteLabel);
      const cell = document.createElement('div');
      cell.className = 'backing-bar';
      cell.dataset.idx = String(i);
      cell.innerHTML = `
        <span class="backing-bar-num">${i + 1}</span>
        <span class="backing-bar-roman">${romanFor(step)}</span>
        <span class="backing-bar-chord">${resolved.label}</span>
      `;
      elBars.appendChild(cell);
    });
  }

  function highlightBar(idx) {
    elBars.querySelectorAll('.backing-bar').forEach((c, i) => {
      c.classList.toggle('is-active', state.playing && i === idx);
    });
  }

  function updateNow(barIdx) {
    const s = currentStyle();
    const step = s.progression[barIdx];
    const resolved = resolveStep(step, state.keyRoot, noteLabel);
    elNowLabel.textContent = `Mesure ${barIdx + 1} / ${s.progression.length}`;
    elNowRoman.textContent = romanFor(step);
    elNowChord.textContent = resolved.label;
    elNowHint.textContent = s.hint || '';
  }

  function setBpm(v) {
    const n = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
    if (n === state.bpm) return;
    state.bpm = n;
    engine.setBpm(n);
    elBpm.textContent = String(n);
    if (Number(elSlider.value) !== n) elSlider.value = String(n);
    persist();
  }

  function startPlayer() {
    if (state.playing) return;
    state.playing = true;
    elToggle.setAttribute('aria-pressed', 'true');
    elToggle.classList.add('is-playing');
    elToggleLabel.textContent = 'Arrêter';
    engine.setOnBarChange((idx) => {
      highlightBar(idx);
      updateNow(idx);
    });
    engine.start();
  }

  function stopPlayer() {
    if (!state.playing) return;
    state.playing = false;
    engine.stop();
    elToggle.setAttribute('aria-pressed', 'false');
    elToggle.classList.remove('is-playing');
    elToggleLabel.textContent = 'Lancer';
    highlightBar(-1);
  }

  // ── Wiring ──
  buildStyleChips();
  buildKeys();
  renderBars();
  updateNow(0);

  elToggle.addEventListener('click', () => state.playing ? stopPlayer() : startPlayer());
  wrap.querySelectorAll('[data-delta]').forEach((b) => {
    b.addEventListener('click', () => setBpm(state.bpm + Number(b.dataset.delta)));
  });
  elSlider.addEventListener('input', () => setBpm(Number(elSlider.value)));

  return () => stopPlayer();
}
