# Fretboard

Visualiseur interactif de manche de guitare. Sélectionnez une note (en notation française : Do, Do♯, Ré, …) et toutes ses positions sur le manche s'illuminent — la note est aussi jouée par la sortie audio du navigateur.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrez ensuite [http://localhost:5173](http://localhost:5173).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite. |
| `npm run build` | Build de production dans `dist/`. |
| `npm run preview` | Aperçu du build de production. |

## Utilisation

- **Cliquer une note** dans le sélecteur → toutes les positions correspondantes sont surlignées et la note est jouée.
- **Cliquer une position** sur le manche → la note exacte de cette case (octave incluse) est jouée.

## Stack

Vite · JavaScript vanilla · SVG · Web Audio API. Aucune dépendance runtime, aucun asset audio.

Voir [CLAUDE.md](./CLAUDE.md) pour l'architecture détaillée.
