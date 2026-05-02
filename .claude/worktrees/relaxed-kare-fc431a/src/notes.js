// Notation française des 12 demi-tons (index 0..11, Do = 0)
export const NOTES_FR = [
  'Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa',
  'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si',
];

// Accordage standard 6 cordes, de la plus grave (E2) à la plus aiguë (E4).
// Indices dans NOTES_FR + octave (convention scientifique : Do central = C4).
export const TUNING = [
  { note: 4,  octave: 2 }, // Mi (E2)
  { note: 9,  octave: 2 }, // La (A2)
  { note: 2,  octave: 3 }, // Ré (D3)
  { note: 7,  octave: 3 }, // Sol (G3)
  { note: 11, octave: 3 }, // Si (B3)
  { note: 4,  octave: 4 }, // Mi (E4)
];

export const STRING_LABELS = ['Mi', 'La', 'Ré', 'Sol', 'Si', 'Mi'];

export function noteAtFret(stringIdx, fret) {
  const open = TUNING[stringIdx];
  const total = open.note + fret;
  const noteIndex = ((total % 12) + 12) % 12;
  const octave = open.octave + Math.floor(total / 12);
  return { noteIndex, octave };
}

export function midiOf({ noteIndex, octave }) {
  // MIDI : Do central (C4) = 60. Do = noteIndex 0.
  return (octave + 1) * 12 + noteIndex;
}

export function frequencyOf(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function noteLabel(noteIndex) {
  return NOTES_FR[((noteIndex % 12) + 12) % 12];
}
