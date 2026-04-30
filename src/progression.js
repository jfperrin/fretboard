// Progression sur 10 niveaux. Source unique pour la définition des niveaux
// et la persistance dans localStorage.

// Indices NOTES_FR : Do=0, Do♯=1, Ré=2, Ré♯=3, Mi=4, Fa=5, Fa♯=6,
// Sol=7, Sol♯=8, La=9, La♯=10, Si=11.

const NATURALS_3   = [0, 2, 4];
const NATURALS_5   = [0, 2, 4, 5, 7];
const NATURALS_7   = [0, 2, 4, 5, 7, 9, 11];
const PLUS_DO_FA_S = [0, 1, 2, 4, 5, 6, 7, 9, 11];
const PLUS_SOL_S   = [0, 1, 2, 4, 5, 6, 7, 8, 9, 11];
const ALL_12       = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const LEVELS = [
  { id: 1,  vocab: NATURALS_3,   count: 5,  durationMs: 10_000, threshold: 4  },
  { id: 2,  vocab: NATURALS_5,   count: 7,  durationMs: 10_000, threshold: 5  },
  { id: 3,  vocab: NATURALS_7,   count: 10, durationMs: 10_000, threshold: 7  },
  { id: 4,  vocab: NATURALS_7,   count: 12, durationMs: 8_000,  threshold: 9  },
  { id: 5,  vocab: NATURALS_7,   count: 15, durationMs: 6_000,  threshold: 11 },
  { id: 6,  vocab: PLUS_DO_FA_S, count: 12, durationMs: 8_000,  threshold: 9  },
  { id: 7,  vocab: PLUS_SOL_S,   count: 14, durationMs: 8_000,  threshold: 10 },
  { id: 8,  vocab: ALL_12,       count: 15, durationMs: 7_000,  threshold: 11 },
  { id: 9,  vocab: ALL_12,       count: 18, durationMs: 6_000,  threshold: 13 },
  { id: 10, vocab: ALL_12,       count: 20, durationMs: 5_000,  threshold: 16 },
];

export const MAX_LEVEL = LEVELS.length;

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || null;
}

const STORAGE_KEY = 'fretboard.progress';

function defaultProgress() {
  return { unlockedLevel: 1, bestScores: {} };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw);
    const unlocked = Math.max(1, Math.min(MAX_LEVEL, Number(p.unlockedLevel) || 1));
    const bestScores = (p.bestScores && typeof p.bestScores === 'object') ? p.bestScores : {};
    return { unlockedLevel: unlocked, bestScores };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* quota / mode privé : on ignore */ }
}

export function isUnlocked(levelId) {
  return levelId <= loadProgress().unlockedLevel;
}

// Met à jour le best score et, si seuil atteint sur le niveau courant,
// débloque le suivant. Retourne le nouvel état.
export function recordResult(levelId, score) {
  const level = getLevel(levelId);
  if (!level) return loadProgress();
  const p = loadProgress();
  const prev = p.bestScores[levelId] ?? 0;
  if (score > prev) p.bestScores[levelId] = score;
  if (score >= level.threshold && levelId === p.unlockedLevel && p.unlockedLevel < MAX_LEVEL) {
    p.unlockedLevel = levelId + 1;
  }
  saveProgress(p);
  return p;
}
