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
