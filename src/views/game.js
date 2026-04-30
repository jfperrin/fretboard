import { NOTES_FR } from '../notes.js';
import { createFretboard } from '../fretboard.js';
import { openMic, freqToNoteIndex } from '../pitch.js';
import { playNote, preloadSamples } from '../audio.js';
import { getLevel, recordResult, MAX_LEVEL } from '../progression.js';

const STABLE_FRAMES = 4; // # de frames consécutives pour valider une détection micro

export function mountGame(host, levelId) {
  const level = getLevel(levelId);
  if (!level) {
    location.hash = '#/game';
    return null;
  }

  preloadSamples(); // idempotent : si déjà chargé via #/manche, no-op

  const wrap = document.createElement('section');
  wrap.className = 'card game-card';
  wrap.innerHTML = `
    <div class="game-header">
      <div class="game-progress">
        <div class="game-progress-info">
          <span class="game-level-tag">Niveau ${level.id}</span>
          Question <strong class="js-q-idx">0</strong> / ${level.count}
        </div>
        <div class="progress-bar"><div class="progress-fill js-progress"></div></div>
      </div>
      <div class="game-score">Score : <strong class="js-score">0</strong></div>
    </div>
    <div class="game-stage js-stage"></div>
  `;
  host.appendChild(wrap);

  const stage = wrap.querySelector('.js-stage');
  const qIdxEl = wrap.querySelector('.js-q-idx');
  const scoreEl = wrap.querySelector('.js-score');
  const progressEl = wrap.querySelector('.js-progress');

  let mic = null;
  let aborted = false;

  function vocabLabel() {
    return level.vocab.map((i) => NOTES_FR[i]).join(' · ');
  }

  function makeSequence(n, vocab) {
    const shuffled = [...vocab];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const seq = n >= vocab.length ? shuffled.slice(0, vocab.length) : [];
    while (seq.length < n) {
      let idx;
      do { idx = vocab[Math.floor(Math.random() * vocab.length)]; }
      while (vocab.length > 1 && idx === seq[seq.length - 1]);
      seq.push(idx);
    }
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] === seq[i - 1] && vocab.length > 1) {
        const swap = seq.findIndex((v, k) => k > i && v !== seq[i - 1] && v !== (seq[i + 1] ?? -1));
        if (swap > -1) [seq[i], seq[swap]] = [seq[swap], seq[i]];
      }
    }
    return seq;
  }

  function showIntro() {
    stage.innerHTML = `
      <p class="game-instruction">
        Niveau ${level.id} — vocabulaire : <strong>${vocabLabel()}</strong>
      </p>
      <p class="game-instruction">
        ${level.count} notes, ${(level.durationMs / 1000).toFixed(0)} s par note. Seuil de réussite : ${level.threshold}/${level.count}.
      </p>
      <p class="game-hint">
        Réponds en cliquant la position sur le manche, ou en jouant la note à la guitare (micro).
      </p>
      <div class="game-actions">
        <button class="btn-primary js-start">Démarrer</button>
        <a class="btn-secondary" href="#/game">Retour aux niveaux</a>
      </div>
    `;
    stage.querySelector('.js-start').addEventListener('click', startSession);
  }

  async function startSession() {
    qIdxEl.textContent = '0';
    scoreEl.textContent = '0';
    progressEl.style.width = '0%';

    stage.innerHTML = `<p class="game-instruction">Demande d'accès au micro… (refuse si tu préfères jouer uniquement à la souris)</p>`;
    try {
      mic = await openMic();
    } catch {
      mic = null; // fallback : mode clic-only
    }

    const seq = makeSequence(level.count, level.vocab);
    let score = 0;
    for (let i = 0; i < seq.length; i++) {
      if (aborted) break;
      qIdxEl.textContent = String(i + 1);
      const ok = await runRound(seq[i]);
      if (ok) score++;
      scoreEl.textContent = String(score);
    }

    if (mic) { mic.close(); mic = null; }
    if (!aborted) showFinal(score);
  }

  function runRound(expected) {
    return new Promise((resolve) => {
      const micRow = mic
        ? `<div class="game-listen">
             <span class="game-listen-label">Micro</span>
             <div class="mic-indicator"><div class="mic-level js-level"></div></div>
             <span class="game-timer js-timer">${(level.durationMs / 1000).toFixed(1)} s</span>
           </div>`
        : `<div class="game-listen game-listen-noMic">
             <span class="game-timer js-timer">${(level.durationMs / 1000).toFixed(1)} s</span>
           </div>`;

      stage.innerHTML = `
        <p class="game-instruction">Joue ou clique cette note :</p>
        <div class="game-note game-note-compact">${NOTES_FR[expected]}</div>
        <div class="game-fretboard"></div>
        ${micRow}
        <p class="game-hint">
          ${mic
            ? `Clique la bonne position sur le manche, ou joue la note à la guitare (n'importe quelle octave).`
            : `Clique la bonne position sur le manche.`}
        </p>
      `;

      const fbEl = stage.querySelector('.game-fretboard');
      const board = createFretboard(fbEl, { frets: 24 });
      const levelEl = stage.querySelector('.js-level');
      const timerEl = stage.querySelector('.js-timer');

      let resolved = false;
      let rafId = 0;

      const finish = (ok) => {
        if (resolved) return;
        resolved = true;
        cancelAnimationFrame(rafId);
        showRoundResult(ok, expected).then(() => resolve(ok));
      };

      board.onPositionClick(({ stringIdx, fret, noteIndex, frequency }) => {
        if (resolved) return;
        playNote(frequency);
        if (noteIndex === expected) {
          board.flashPosition({ stringIdx, fret, kind: 'success' });
          setTimeout(() => finish(true), 350);
        } else {
          board.flashPosition({ stringIdx, fret, kind: 'error' });
        }
      });

      let lastClass = -1;
      let consec = 0;
      const start = performance.now();

      function tick() {
        if (resolved || aborted) return;
        const elapsed = performance.now() - start;

        if (mic) {
          const { freq, rms } = mic.sample();
          if (levelEl) levelEl.style.width = Math.min(100, rms * 600) + '%';
          if (freq > 0) {
            const cls = freqToNoteIndex(freq);
            if (cls === lastClass) {
              consec++;
              if (consec >= STABLE_FRAMES && cls === expected) {
                finish(true);
                return;
              }
            } else {
              lastClass = cls;
              consec = 1;
            }
          } else {
            consec = 0;
            lastClass = -1;
          }
        }

        progressEl.style.width = Math.min(100, (elapsed / level.durationMs) * 100) + '%';
        timerEl.textContent = Math.max(0, (level.durationMs - elapsed) / 1000).toFixed(1) + ' s';

        if (elapsed >= level.durationMs) {
          finish(false);
          return;
        }
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    });
  }

  function showRoundResult(success, expected) {
    return new Promise((resolve) => {
      if (success) {
        stage.innerHTML = `
          <div class="result success">
            <div class="result-icon">✓</div>
            <div class="result-text">Bravo&nbsp;! <strong>${NOTES_FR[expected]}</strong> correctement joué.</div>
          </div>
        `;
        setTimeout(resolve, 1200);
        return;
      }

      stage.innerHTML = `
        <div class="result failure">
          <div class="result-icon">✗</div>
          <div class="result-text">
            Note attendue : <strong>${NOTES_FR[expected]}</strong>. Voici toutes ses positions sur le manche :
          </div>
          <div class="result-fretboard"></div>
          <button class="btn-secondary js-next">Suivante</button>
        </div>
      `;
      const fbEl = stage.querySelector('.result-fretboard');
      const board = createFretboard(fbEl, { frets: 24 });
      board.highlightNote(expected);

      let done = false;
      const advance = () => { if (done) return; done = true; resolve(); };
      stage.querySelector('.js-next').addEventListener('click', advance);
      setTimeout(advance, 5000);
    });
  }

  function showFinal(score) {
    progressEl.style.width = '100%';
    const passed = score >= level.threshold;
    const before = recordResult(level.id, score);
    const justUnlocked = passed && level.id < MAX_LEVEL && before.unlockedLevel === level.id + 1;

    const headline = passed
      ? (justUnlocked
          ? `Niveau ${level.id + 1} débloqué&nbsp;!`
          : `Niveau réussi.`)
      : `Seuil non atteint (${level.threshold}/${level.count} requis).`;

    const nextBtn = passed && level.id < MAX_LEVEL
      ? `<a class="btn-primary" href="#/game/${level.id + 1}">Niveau suivant</a>`
      : '';
    const retryBtn = `<button class="btn-secondary js-retry">Rejouer ce niveau</button>`;
    const backBtn = `<a class="btn-secondary" href="#/game">Retour aux niveaux</a>`;

    stage.innerHTML = `
      <div class="result final">
        <div class="result-text">${headline}</div>
        <div class="final-score">${score}<span> / ${level.count}</span></div>
        <div class="game-actions">
          ${nextBtn}
          ${retryBtn}
          ${backBtn}
        </div>
      </div>
    `;
    stage.querySelector('.js-retry').addEventListener('click', showIntro);
  }

  showIntro();

  return () => {
    aborted = true;
    if (mic) { mic.close(); mic = null; }
  };
}
