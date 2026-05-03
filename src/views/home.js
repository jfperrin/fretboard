import { NOTES_FR, midiOf, frequencyOf, noteAtFret } from '../notes.js';
import { createFretboard } from '../fretboard.js';
import { playNote } from '../audio.js';
import { loadPref, savePref } from '../storage.js';

const CAPO_FRETS = 12; // 0 = sans capo, 1..12

export function mountHome(host) {
  const saved = loadPref('home', { note: 0, capo: 0 });
  const initialNote = Number.isInteger(saved.note) && saved.note >= 0 && saved.note < 12 ? saved.note : 0;
  const initialCapo = Number.isInteger(saved.capo) && saved.capo >= 0 && saved.capo <= CAPO_FRETS ? saved.capo : 0;

  let currentNote = initialNote;
  let currentCapo = initialCapo;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <section class="card">
      <div class="note-selector" role="tablist" aria-label="Sélecteur de notes"></div>
      <div class="home-capo">
        <span class="home-capo-label">Capodastre</span>
        <div class="home-capo-chips chip-row" role="radiogroup" aria-label="Position du capodastre"></div>
      </div>
    </section>
    <section class="card fretboard-card">
      <div class="fretboard-container"></div>
    </section>
  `;
  host.appendChild(wrap);

  const selector = wrap.querySelector('.note-selector');
  const elCapo = wrap.querySelector('.home-capo-chips');
  const fretboardEl = wrap.querySelector('.fretboard-container');
  const board = createFretboard(fretboardEl, { frets: 24 });

  const buttons = NOTES_FR.map((label, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'note-btn';
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.dataset.note = String(idx);
    btn.addEventListener('click', () => selectNote(idx, true));
    selector.appendChild(btn);
    return btn;
  });

  // Capo : "Aucun" + cases 1..12
  for (let f = 0; f <= CAPO_FRETS; f++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (f === currentCapo ? ' active' : '');
    b.textContent = f === 0 ? 'Aucun' : String(f);
    b.dataset.fret = String(f);
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(f === currentCapo));
    b.addEventListener('click', () => setCapo(f));
    elCapo.appendChild(b);
  }

  function setCapo(fret) {
    currentCapo = fret;
    board.setCapo(fret);
    elCapo.querySelectorAll('.chip').forEach((c) => {
      const on = Number(c.dataset.fret) === fret;
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', String(on));
    });
    savePref('home', { note: currentNote, capo: currentCapo });
  }

  function selectNote(idx, play = true) {
    currentNote = idx;
    buttons.forEach((b, i) => {
      const active = i === idx;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    board.highlightNote(idx);
    savePref('home', { note: currentNote, capo: currentCapo });
    if (!play) return;
    const targetString = 4; // Si — médium agréable
    for (let f = 0; f <= board.frets; f++) {
      const n = noteAtFret(targetString, f);
      if (n.noteIndex === idx) {
        playNote(frequencyOf(midiOf(n)));
        return;
      }
    }
  }

  board.onPositionClick(({ frequency }) => playNote(frequency));
  board.setCapo(currentCapo);
  selectNote(currentNote, false);
}
