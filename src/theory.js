// Théorie musicale partagée : triades + gammes + cycle des quintes.
// Indices NOTES_FR (Do = 0).

export const TRIAD_INTERVALS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
};

// Demi-tons depuis la tonique. Le premier élément est toujours 0 (la racine).
export const SCALE_INTERVALS = {
  'penta-min':  [0, 3, 5, 7, 10],
  'penta-maj':  [0, 2, 4, 7, 9],
  'blues':      [0, 3, 5, 6, 7, 10],
  'major':      [0, 2, 4, 5, 7, 9, 11],
  'minor-nat':  [0, 2, 3, 5, 7, 8, 10],
  'dorian':     [0, 2, 3, 5, 7, 9, 10],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'minor-harm': [0, 2, 3, 5, 7, 8, 11],
};

export const SCALE_LABELS = {
  'penta-min':  'Pentatonique mineure',
  'penta-maj':  'Pentatonique majeure',
  'blues':      'Blues',
  'major':      'Majeure (Ionienne)',
  'minor-nat':  'Mineure naturelle',
  'dorian':     'Dorienne',
  'mixolydian': 'Mixolydienne',
  'minor-harm': 'Mineure harmonique',
};

// Cycle des quintes, sens horaire à partir de Do (12h).
// Tonique majeure de chaque secteur, son indice NOTES_FR, et les libellés
// de l'accord relatif mineur (vi) et du septième degré diminué (vii°).
export const CYCLE_OF_FIFTHS = {
  majIndex: [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5],
  majLabels: ['Do', 'Sol', 'Ré', 'La', 'Mi', 'Si', 'Fa♯', 'Ré♭', 'La♭', 'Mi♭', 'Si♭', 'Fa'],
  minLabels: ['La', 'Mi', 'Si', 'Fa♯', 'Do♯', 'Sol♯', 'Ré♯', 'Si♭', 'Fa', 'Do', 'Sol', 'Ré'],
  dimLabels: ['Si', 'Fa♯', 'Do♯', 'Sol♯', 'Ré♯', 'La♯', 'Mi♯', 'Do', 'Sol', 'Ré', 'La', 'Mi'],
};

// Arpèges : intervalles depuis la racine (en demi-tons).
// Par convention, on monte d'une octave (12) en fin pour boucler proprement.
export const ARPEGGIO_INTERVALS = {
  'maj':       [0, 4, 7],
  'min':       [0, 3, 7],
  'dim':       [0, 3, 6],
  'aug':       [0, 4, 8],
  'maj7':      [0, 4, 7, 11],
  'min7':      [0, 3, 7, 10],
  'dom7':      [0, 4, 7, 10],
  'min7b5':    [0, 3, 6, 10],
};

export const ARPEGGIO_LABELS = {
  'maj':    'Majeur',
  'min':    'Mineur',
  'dim':    'Diminué',
  'aug':    'Augmenté',
  'maj7':   'Maj7',
  'min7':   'min7',
  'dom7':   '7 (dom)',
  'min7b5': 'ø (m7♭5)',
};

// Progressions d'accords classiques. Chaque degré : { degree, quality }.
// degree = 1..7 (I, ii, iii, IV, V, vi, vii°). quality forcée pour overrides.
// Les degrés majeurs/mineurs/diminués sont déduits de la tonalité majeure :
// I maj, ii min, iii min, IV maj, V maj, vi min, vii dim.
export const DIATONIC_QUALITY = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
export const DIATONIC_INTERVAL = [0, 2, 4, 5, 7, 9, 11]; // demi-tons depuis la tonique majeure

export const PROGRESSIONS = [
  {
    id: 'pop-1564',
    label: 'Pop · I-V-vi-IV',
    hint: 'Le « 4 chords song » universel',
    steps: [{ d: 1 }, { d: 5 }, { d: 6 }, { d: 4 }],
  },
  {
    id: 'pop-vi-IV-I-V',
    label: 'Pop · vi-IV-I-V',
    hint: 'Variante mélancolique',
    steps: [{ d: 6 }, { d: 4 }, { d: 1 }, { d: 5 }],
  },
  {
    id: 'doo-wop',
    label: 'Doo-wop · I-vi-IV-V',
    hint: '50s, ballades',
    steps: [{ d: 1 }, { d: 6 }, { d: 4 }, { d: 5 }],
  },
  {
    id: 'anatole',
    label: 'Anatole · I-vi-ii-V',
    hint: 'Standard jazz, rhythm changes',
    steps: [{ d: 1 }, { d: 6 }, { d: 2 }, { d: 5 }],
  },
  {
    id: 'jazz-251',
    label: 'Jazz · ii-V-I',
    hint: 'Cadence parfaite jazz',
    steps: [{ d: 2, q: 'min7' }, { d: 5, q: 'dom7' }, { d: 1, q: 'maj7' }],
  },
  {
    id: 'blues-12',
    label: 'Blues · 12 mesures',
    hint: 'I7-IV7-V7 sur 12 mesures',
    steps: [
      { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' },
      { d: 4, q: 'dom7' }, { d: 4, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 1, q: 'dom7' },
      { d: 5, q: 'dom7' }, { d: 4, q: 'dom7' }, { d: 1, q: 'dom7' }, { d: 5, q: 'dom7' },
    ],
  },
  {
    id: 'andalusian',
    label: 'Andalouse · vi-V-IV-III',
    hint: 'Cadence flamenca',
    steps: [{ d: 6 }, { d: 5 }, { d: 4 }, { d: 3, q: 'maj' }],
  },
  {
    id: 'canon',
    label: 'Canon · I-V-vi-iii-IV-I-IV-V',
    hint: 'Pachelbel',
    steps: [{ d: 1 }, { d: 5 }, { d: 6 }, { d: 3 }, { d: 4 }, { d: 1 }, { d: 4 }, { d: 5 }],
  },
];

// Étend l'accord 7 si la qualité est dom7/maj7/min7/min7b5 (sinon triade).
export const CHORD_INTERVALS = {
  'maj':    [0, 4, 7],
  'min':    [0, 3, 7],
  'dim':    [0, 3, 6],
  'aug':    [0, 4, 8],
  'maj7':   [0, 4, 7, 11],
  'min7':   [0, 3, 7, 10],
  'dom7':   [0, 4, 7, 10],
  'min7b5': [0, 3, 6, 10],
};

export const CHORD_SUFFIX = {
  'maj':    '',
  'min':    'm',
  'dim':    '°',
  'aug':    '+',
  'maj7':   'Maj7',
  'min7':   'm7',
  'dom7':   '7',
  'min7b5': 'ø',
};

// Système CAGED : 5 formes mobiles d'accord majeur, dérivées des accords
// ouverts C, A, G, E, D. Chaque forme est définie par les frettes relatives
// à la racine la plus grave (root sur la corde "anchor"), pour une triade
// majeure. La racine "anchor" = corde où se situe la racine la plus basse.
// Frettes : valeur = offset depuis la racine ; -1 = corde non jouée ; 0 = à vide
// par rapport à la racine virtuelle (qui ferait office de "barré" via le sillet).
//
// Indices de cordes 0..5 = grave (Mi6) → aiguë (Mi1).
// Pour transposer : on ajoute le shift sur chaque frette > -1.
//
// Format : { id, label, anchorString, anchorOffset, frets: [s0..s5], roles: [role par corde] }
// roles : 'root' | 'third' | 'fifth' | null
export const CAGED_SHAPES = [
  {
    id: 'C',
    label: 'C',
    anchorString: 1, // racine sur la 5e corde (La) pour la forme C ancrée
    anchorOffset: 3, // C5 sur 5e corde / case 3 (référence avant transposition)
    frets: [-1, 3, 2, 0, 1, 0],
    roles: [null, 'root', 'third', 'fifth', 'root', 'third'],
  },
  {
    id: 'A',
    label: 'A',
    anchorString: 1,
    anchorOffset: 0,
    frets: [-1, 0, 2, 2, 2, 0],
    roles: [null, 'root', 'fifth', 'root', 'third', 'fifth'],
  },
  {
    id: 'G',
    label: 'G',
    anchorString: 0,
    anchorOffset: 3,
    frets: [3, 2, 0, 0, 0, 3],
    roles: ['root', 'third', 'fifth', 'root', 'third', 'root'],
  },
  {
    id: 'E',
    label: 'E',
    anchorString: 0,
    anchorOffset: 0,
    frets: [0, 2, 2, 1, 0, 0],
    roles: ['root', 'fifth', 'root', 'third', 'fifth', 'root'],
  },
  {
    id: 'D',
    label: 'D',
    anchorString: 2,
    anchorOffset: 0,
    frets: [-1, -1, 0, 2, 3, 2],
    roles: [null, null, 'root', 'fifth', 'root', 'third'],
  },
];

// Résout les degrés de progression dans une tonalité donnée.
// rootIdx = index NOTES_FR de la tonique majeure (Do = 0).
// step = { d: 1..7, q?: 'maj'|'min'|... }
// Retourne { rootIdx, quality, label }.
export function resolveStep(step, rootIdx, noteLabelFn) {
  const semitones = DIATONIC_INTERVAL[step.d - 1];
  const chordRoot = ((rootIdx + semitones) % 12 + 12) % 12;
  const quality = step.q || DIATONIC_QUALITY[step.d - 1];
  const label = noteLabelFn(chordRoot) + (CHORD_SUFFIX[quality] ?? '');
  return { rootIdx: chordRoot, quality, label };
}
