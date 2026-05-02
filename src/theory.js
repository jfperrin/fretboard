// Théorie musicale partagée : triades + cycle des quintes.
// Indices NOTES_FR (Do = 0).

export const TRIAD_INTERVALS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
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
