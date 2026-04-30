import { NOTES_FR, midiOf, frequencyOf, noteAtFret } from '../notes.js';
import { createFretboard } from '../fretboard.js';
import { playNote, preloadSamples } from '../audio.js';

export function mountHome(host) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <section class="card">
      <div class="note-selector" role="tablist" aria-label="Sélecteur de notes"></div>
    </section>
    <section class="card fretboard-card">
      <div class="fretboard-container"></div>
    </section>
  `;
  host.appendChild(wrap);

  const selector = wrap.querySelector('.note-selector');
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
    btn.addEventListener('click', () => selectNote(idx));
    selector.appendChild(btn);
    return btn;
  });

  function selectNote(idx) {
    buttons.forEach((b, i) => {
      const active = i === idx;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    board.highlightNote(idx);
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
  preloadSamples();
  selectNote(0);
}
