# Fretboard

> Visualiseur de manche de guitare et jeu d'oreille, en notation française. Sans dépendance, sans asset audio, sans serveur.

Apprends les notes du manche en cliquant ou en jouant à la guitare. Tout tourne dans le navigateur : Web Audio pour la synthèse, autocorrélation locale pour la détection au micro.

---

## Démarrage

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173).

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement Vite. |
| `npm run build` | Build de production dans `dist/`. |
| `npm run preview` | Aperçu local du build. |

## Modes

L'application a trois sections, accessibles depuis la landing :

### Visualiseur — `#/manche`

- Les 12 notes (Do, Do♯, Ré, …) en sélecteur.
- Toutes les positions de la note sélectionnée s'illuminent sur 24 frettes.
- Clic sur une position → la note exacte est jouée par le sampler de guitare.

### Jeu d'oreille — `#/game`

- 10 niveaux à déblocage strict, sauvegardés en `localStorage`.
- Progression du vocabulaire : Do Ré Mi → 7 naturelles → introduction des dièses → 12 demi-tons.
- Vitesse croissante : 10 s par note au début, 5 s au niveau 10.
- Pour chaque manche, **deux entrées en parallèle** :
  - **clic** sur la bonne corde/frette du manche affiché ;
  - **micro** : joue la note à la guitare (n'importe quelle octave).
- Mauvais clic → flash rouge + audition de la note cliquée. Pas de pénalité.
- Bon clic ou détection micro stable → succès immédiat.

### Landing — `#/`

Présentation de l'application, avec hero parallaxe et accès aux deux modes.

## Architecture

```
src/
├── main.js            # Routeur de hash, HMR
├── notes.js           # Notation FR, accordage, conversions note ↔ fréquence
├── audio.js           # Sampler de guitare (CDN nbrosowsky) + fallback synth
├── pitch.js           # Capture micro + détection autocorrélation
├── progression.js     # Définition des 10 niveaux + persistance localStorage
├── fretboard.js       # Rendu SVG, surlignage, clic, feedback succès/erreur
├── style.css          # Tokens design, parallaxe, animations
└── views/
    ├── landing.js     # Page d'accueil avec hero parallaxe à 4 couches
    ├── home.js        # Vue visualiseur
    ├── levels.js      # Sélecteur de niveaux
    └── game.js        # Partie : clic + micro en parallèle
```

### Routes

| Hash | Vue |
|---|---|
| `#/` | Landing |
| `#/manche` | Visualiseur du manche |
| `#/game` | Sélecteur des 10 niveaux |
| `#/game/N` | Niveau N (1..10), si débloqué |

### Stack

- **Vite** + JavaScript ES modules. Pas de framework UI.
- **SVG** natif pour le manche (espacement de frettes logarithmique 12-TET).
- **Web Audio API** pour la synthèse et la détection.
- **Sampler de guitare** : échantillons MP3 chargés depuis le CDN public `nbrosowsky/tonejs-instruments`, pitch-shift par `playbackRate`, fallback oscillateur en cas d'indisponibilité.
- **Détection au micro** : `getUserMedia` + autocorrélation ACF2+ avec interpolation parabolique. Aucune donnée envoyée hors du navigateur.

## Conventions

- Notation française partout (Do, Ré, Mi…).
- Représentation interne : `noteIndex` 0..11 + `octave` (Do central = C4 → octave 4).
- Pas de fichier audio dans le repo.
- Pas de dépendance runtime.

Voir [CLAUDE.md](./CLAUDE.md) pour les conventions de style et le détail des modules.

## Compatibilité

- Navigateurs récents (Chrome, Firefox, Safari, Edge).
- Le micro nécessite HTTPS ou `localhost`.
- Le sampler charge ~10 MB d'échantillons au démarrage ; le fallback synthèse fonctionne sans réseau.
