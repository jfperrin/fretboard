# Fretboard

Visualiseur interactif de manche de guitare en notation française, avec lecture audio des notes via Web Audio.

## Économie de contexte

- Ne pas relire un fichier déjà lu dans la conversation, sauf s'il a été modifié.
- Pour vérifier la syntaxe JS : `node --check fichier.js` (pas `npm run build`).
- Pas de `ls` répétés — la structure de `src/` est documentée plus bas.
- Les vérifications visuelles (dev server, navigateur) sont à la charge de l'utilisateur, ne pas les lancer en boucle.

## Style des réponses

- Concis. Un diff parle de lui-même — ne pas le re-décrire en prose.
- Pas de "I'll start by…", "Let me…", récap d'intention avant action.
- Pas d'emoji dans le code, les commits, les docs (sauf demande explicite).
- Listes plutôt que paragraphes ; phrases courtes.
- Fin de tâche : 1-2 phrases max sur ce qui a changé. Pas de "next steps" non demandés.
- Code : pas de commentaire qui décrit le QUOI (le code le fait). Commenter le POURQUOI quand non-évident.
- Ne pas écrire de fichiers `.md` (plans, notes, résumés) sauf demande explicite — travailler dans la conversation.

## Stack

- **Vite** (template vanilla) + **JavaScript natif** (modules ES).
- **CSS moderne** (variables, `clamp()`, `backdrop-filter`).
- **Web Audio API** pour la synthèse audio (aucun fichier audio externe).
- Aucune dépendance runtime.

## Commandes

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npm run preview
```

## Architecture

```
src/
├── main.js         # Routeur de hash (#/ et #/game), HMR
├── notes.js        # Notation FR, accordage, conversions note ↔ fréquence
├── audio.js        # Sampler de guitare (CDN nbrosowsky) + fallback synth
├── fretboard.js    # Rendu SVG du manche, surlignage, clic par position
├── pitch.js        # Capture micro + détection autocorrélation
├── style.css       # Thème sombre, tokens design, animations
└── views/
    ├── home.js     # Vue visualiseur (sélecteur + manche)
    └── game.js     # Vue jeu (20 manches × 10 s d'écoute micro)
```

### Routing
- Hash-based : `#/` → `mountHome`, `#/game` → `mountGame`.
- Chaque `mount*` retourne une fonction de cleanup ; le routeur l'appelle avant de monter la vue suivante (utile pour fermer le micro).

### `notes.js`
- `NOTES_FR` : `['Do', 'Do♯', 'Ré', ..., 'Si']`, index 0..11.
- `TUNING` : accordage standard `Mi-La-Ré-Sol-Si-Mi` (E2-A2-D3-G3-B3-E4), grave → aigu.
- `noteAtFret(stringIdx, fret)` → `{ noteIndex, octave }`.
- `midiOf(...)` / `frequencyOf(midi)` : conversions standards (A4 = 69 = 440 Hz).

### `audio.js`
- Sampler à base d'échantillons réels de guitare acoustique chargés depuis le CDN public `nbrosowsky/tonejs-instruments` (samples MP3, CORS OK).
- `preloadSamples()` : fetch + `decodeAudioData` d'une grille d'échantillons (E2..E5, espacement ~ tierce mineure) ; lancé au démarrage en tâche de fond.
- `playNote(frequency, opts)` : pour chaque note, choisit l'échantillon le plus proche en MIDI et applique un `playbackRate = 2^(Δsemitons/12)` pour le pitch-shift. Enveloppe de release pour couper proprement.
- Fallback synthèse (oscillateur triangle + filtre + ADSR) tant que les échantillons ne sont pas chargés ou si le CDN est indisponible.
- L'`AudioContext` est créé/repris au premier clic (politique navigateur).

### `fretboard.js`
- `createFretboard(container, { frets })` retourne `{ svg, highlightNote, onPositionClick, ... }`.
- Espacement de frettes logarithmique réaliste : `x(n) ∝ 1 - 2^(-n/12)`.
- Repères standards (3, 5, 7, 9, 12 double, 15, …).
- Couches : fond bois → frettes → cordes → markers → hit zones invisibles.

### `views/home.js`
- Génère 12 boutons de notes, état courant.
- Sur clic : surligne toutes les positions de la note + joue la première occurrence sur la corde de Si (timbre médium agréable).
- Clic sur un marker individuel : joue la note exacte de cette position.

### `views/game.js`
- Séquence de 20 notes tirées au hasard (sans répétition immédiate).
- Pour chaque manche : affiche la note, ouvre une fenêtre d'écoute de 10 s avec barre de progression et VU-mètre.
- Détection : pitch courant → classe de note (mod 12) ; on requiert ~4 frames consécutives stables pour valider une classe détectée. À la fin des 10 s, succès si la classe attendue est dans l'ensemble validé.
- Échec : affichage d'un mini-manche avec toutes les positions de la note attendue, bouton « Suivante » (auto-avance après 5 s).
- Score final sur 20, bouton rejouer.

### `pitch.js`
- `openMic()` : `getUserMedia({ audio })` + `AnalyserNode` (fftSize 2048), expose `sample()` → `{ freq, rms }` et `close()`.
- Détecteur ACF2+ : autocorrélation O(N²) + interpolation parabolique du pic. Bornes 70–1100 Hz, seuil RMS 0.015.
- `freqToNoteIndex(freq)` → 0..11 (Do = 0).

## Conventions

- **Notation française partout** dans l'UI et les commentaires.
- Représentation interne : `noteIndex` (0..11, Do = 0) + `octave` (convention scientifique : Do central = C4 → octave 4).
- Pas d'asset audio : tout via Web Audio API.
- Pas de framework UI — DOM + SVG natifs uniquement.

## Direction artistique

- Thème sombre, palette accent **ambre** (`#f5b14a`) + **bleu** (`#56c2ff`).
- Polices : **Inter** (UI) et **JetBrains Mono** (étiquettes de notes).
- Carte centrale en `backdrop-filter: blur`, ombres douces, animations `cubic-bezier(.2,.8,.2,1)`.
- Manche responsive (`viewBox` + `min-width` pour scroll horizontal sur mobile).

## Points d'extension (non implémentés en V1)

- Accordages alternatifs (Drop D, Open G, 7-cordes…).
- Mode gamme/accord (plusieurs notes simultanées avec couleurs distinctes).
- Choix d'octave joué / sustain configurable.
- Modèle de timbre Karplus-Strong pour un son plus réaliste de corde pincée.
- Sauvegarde de préférences (`localStorage`).

## Vérification rapide

1. `npm install && npm run dev`.
2. Le manche s'affiche avec 15 frettes, 6 cordes, repères standards.
3. Cliquer **Do** → toutes les positions de Do surlignées + son joué.
4. Vérifier la cohérence montante : Do < Ré < Mi < Sol < La < Si à l'oreille.
5. Cliquer sur un marker → la note précise (octave correcte) est jouée.
