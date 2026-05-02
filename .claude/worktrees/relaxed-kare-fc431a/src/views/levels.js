import { NOTES_FR } from '../notes.js';
import { LEVELS, loadProgress } from '../progression.js';

function vocabSummary(vocab) {
  return vocab.map((i) => NOTES_FR[i]).join(' · ');
}

export function mountLevels(host) {
  const { unlockedLevel, bestScores } = loadProgress();

  const wrap = document.createElement('section');
  wrap.className = 'card levels-card';
  wrap.innerHTML = `
    <header class="levels-header">
      <h2>Progression</h2>
      <p class="levels-subtitle">
        Réussis chaque niveau pour débloquer le suivant. Vocabulaire et vitesse augmentent.
      </p>
    </header>
    <div class="levels-grid"></div>
  `;
  const grid = wrap.querySelector('.levels-grid');

  for (const level of LEVELS) {
    const unlocked = level.id <= unlockedLevel;
    const best = bestScores[level.id] ?? null;
    const passed = best !== null && best >= level.threshold;

    const card = document.createElement(unlocked ? 'a' : 'div');
    card.className = 'level-card';
    if (unlocked) {
      card.href = `#/game/${level.id}`;
      card.classList.add('is-unlocked');
    } else {
      card.classList.add('is-locked');
    }
    if (passed) card.classList.add('is-passed');

    const bestLine = best === null
      ? `<span class="level-best level-best-none">Jamais joué</span>`
      : `<span class="level-best">Meilleur : <strong>${best}/${level.count}</strong></span>`;

    const badge = !unlocked
      ? `<span class="level-badge level-badge-locked">Verrouillé</span>`
      : passed
        ? `<span class="level-badge level-badge-passed">Réussi</span>`
        : `<span class="level-badge level-badge-open">Disponible</span>`;

    card.innerHTML = `
      <div class="level-card-top">
        <span class="level-num">Niveau ${level.id}</span>
        ${badge}
      </div>
      <div class="level-vocab">${vocabSummary(level.vocab)}</div>
      <div class="level-meta">
        <span>${level.count} notes</span>
        <span>·</span>
        <span>${(level.durationMs / 1000).toFixed(0)} s/note</span>
        <span>·</span>
        <span>seuil ${level.threshold}/${level.count}</span>
      </div>
      <div class="level-foot">${bestLine}</div>
    `;
    grid.appendChild(card);
  }

  host.appendChild(wrap);
  return null;
}
