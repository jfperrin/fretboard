# Spec — Vue Triades

**Date :** 2026-05-01  
**Statut :** validé

---

## Contexte

Nouvelle page pédagogique qui affiche, pour une note racine et une qualité choisies, toutes les positions d'accord complètes (un doigt par corde, notes toutes différentes) sur trois groupes de cordes. L'utilisateur choisit la tonique + la qualité (maj/min/dim) ; trois mini-manches affichent les inversions jouables avec un code couleur racine / tierce / quinte.

---

## Groupes de cordes

| Rangée | Cordes (numérotation guitare) | Indices TUNING | Notes à vide |
|--------|-------------------------------|----------------|--------------|
| 1 | Cordes 1 · 2 · 3 | [3, 4, 5] | Sol3 · Si3 · Mi4 |
| 2 | Cordes 2 · 3 · 4 | [2, 3, 4] | Ré3 · Sol3 · Si3 |
| 3 | Cordes 4 · 5 · 6 | [0, 1, 2] | Mi2 · La2 · Ré3 |

---

## Interface utilisateur

```
[ Triades ]
Positions d'accord sur chaque groupe de 3 cordes

Note :  [Do] [Do♯] [Ré] … [Si]    (12 boutons, style note-btn existant)
Qualité : [Majeure] [Mineure] [Diminuée]

Légende : ● Racine (ambre)   ● Tierce (bleu)   ● Quinte (blanc)

┌────────────────────────────────────┐
│ Cordes 1 · 2 · 3  —  Sol · Si · Mi│
│ [mini-manche 3 cordes]             │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ Cordes 2 · 3 · 4  —  Ré · Sol · Si│
│ [mini-manche 3 cordes]             │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ Cordes 4 · 5 · 6  —  Mi · La · Ré │
│ [mini-manche 3 cordes]             │
└────────────────────────────────────┘
```

Clic sur une position → joue les 3 notes simultanément (`playNote` × 3). Implémentation : `board.onPositionClick(({ stringIdx, fret }) => ...)` — `triads.js` vérifie si `{stringIdx, fret}` correspond à l'un des marqueurs du voicing affiché ; si oui, joue `frequencyOf(midiOf(noteAtFret(s, f)))` pour les 3 cordes de ce voicing.

---

## Code couleur des marqueurs

| Rôle | Couleur fond | Couleur texte |
|------|-------------|---------------|
| Racine | `#f5b14a` (ambre) | `#1a0f00` |
| Tierce | `#56c2ff` (bleu) | `#001a2a` |
| Quinte | `rgba(224,224,224,0.9)` (blanc) | `#1a1a1a` |

Les marqueurs affichent le nom de la note (notation FR : Do, Mi, Sol…).

---

## Architecture

### Nouveaux fichiers

**`src/views/triads.js`** — export `mountTriads(host)`

Responsabilités :
- Génère les sélecteurs (note + qualité)
- Instancie 3 fretboards via `createFretboard(container, { frets: 15, stringIndices: [...] })`
- Calcule et affiche les positions via `board.highlightTriad(positions)`
- Gère le clic (playback)
- Retourne une fonction cleanup (aucun listener global ici, cleanup = no-op)

### Fichiers modifiés

**`src/fretboard.js`** — deux ajouts à l'API :

1. **Option `stringIndices`** (tableau d'indices TUNING, défaut `[0,1,2,3,4,5]`)
   - Seules les cordes listées sont dessinées (lignes + labels + hit zones)
   - `stringCount = stringIndices.length`
   - `stringY(localIdx)` — `localIdx` = position dans `stringIndices` (0 = plus grave des cordes affichées)
   - Les labels de cordes et les hit zones utilisent `stringIndices[localIdx]` pour récupérer le bon accordage

2. **Méthode `highlightTriad(positions)`**
   - `positions` : `[{ stringIdx, fret, role }]` — `stringIdx` = indice TUNING, `role` ∈ `'root' | 'third' | 'fifth'`
   - Convertit `stringIdx` → `localIdx` via `stringIndices.indexOf(stringIdx)` ; ignore si absent
   - Efface les marqueurs existants, dessine les nouveaux avec le code couleur
   - Chaque marqueur : cercle coloré + label note (même structure SVG que `highlightNote`)
   - Clic sur un marqueur : déclenche l'événement `position-click` avec `{ stringIdx, fret, frequency }`

**`src/main.js`** — ajout route `#/triades` + import `mountTriads`

**`index.html`** — ajout lien nav `<a href="#/triades">Triades<br>d'accord</a>`

---

## Algorithme — positions d'accord fermées

Pour un groupe `[sA, sB, sC]` (indices TUNING, du plus grave au plus aigu) et une triade `{ root, intervals }` (ex. `[0, 4, 7]` pour Do maj) :

```
noteSet = { (root + interval) % 12 pour chaque interval }   // ex. {0, 4, 7}

pour fA de 0 à 12 :
  nA = noteAtFret(sA, fA).noteIndex
  si nA ∉ noteSet : continuer

  pour fB de max(0, fA-4) à fA+4 :
    nB = noteAtFret(sB, fB).noteIndex
    si nB ∉ noteSet ou nB === nA : continuer

    pour fC de max(0, fA-4) à fA+4 :  // même fenêtre autour de fA
      nC = noteAtFret(sC, fC).noteIndex
      si nC ∉ noteSet ou nC === nA ou nC === nB : continuer

      span = max(fA, fB, fC) − min(fA, fB, fC)
      si span ≤ 4 :
        enregistrer { sA/fA/role, sB/fB/role, sC/fC/role }
```

Le `role` de chaque note (root/third/fifth) se détermine par comparaison de `noteIndex` avec les indices calculés : `(root + intervals[0]) % 12` = racine, `+ intervals[1]` = tierce, `+ intervals[2]` = quinte.

Dédupliquer les positions identiques (même triplet `(fA, fB, fC)`).

---

## Intervalles de triades (existant dans `chords.js`, à réutiliser)

```js
{ maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6] }
```

Ces constantes sont déjà définies dans `src/views/chords.js`. Elles sont **dupliquées localement** dans `triads.js` (même valeur, pas d'import croisé entre vues). Si une future refacto les centralise dans `notes.js`, c'est hors scope ici.

---

## Routing

| Hash | Vue |
|------|-----|
| `#/triades` | `mountTriads(view)` |

`setActive` dans `main.js` : ajouter `hash.startsWith('#/triades') ? '#/triades' : …`

---

## Vérification

1. `npm run dev`, naviguer vers `#/triades`
2. Sélectionner **Do majeur** → vérifier 3 mini-manches avec positions Do/Mi/Sol colorées
3. Sélectionner **La mineur** → La(ambre) / Do(bleu) / Mi(blanc)
4. Cliquer une position → 3 notes jouées simultanément
5. Changer de note et de qualité → manches mis à jour immédiatement
6. Vérifier que le lien "Triades d'accord" dans la nav devient actif
7. Naviguer vers une autre vue puis revenir → pas de fuite mémoire / double listener
