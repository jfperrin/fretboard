# Spec — Navigation « Manche & repères »

**Date :** 2026-05-01  
**Statut :** validé

---

## Contexte

La barre de navigation actuelle est un topbar générique (pilules arrondies, gradient ambre sur l'actif). L'objectif est de la rendre visuellement cohérente avec l'univers de la guitare, sans casser le fonctionnement existant (hash routing, classe `.active`, reveal au scroll sur la landing).

---

## Design retenu : « Manche & repères »

### Structure visuelle

Le topbar adopte l'apparence d'un fragment de manche de guitare :

- **Fond** : dégradé bois subtil (`rgba(139,90,43,0.18) → rgba(100,60,20,0.10)`) + `repeating-linear-gradient` vertical pour simuler les frettes (traits fins toutes les 33,3 % de la zone des liens).
- **Cordes** : deux pseudo-éléments horizontaux (`::before` / `::after`) à 28 % et 72 % de la hauteur, trait de 1 px, `rgba(200,180,140,0.10)`.
- **Bordure** : `1px solid rgba(255,255,255,0.07)`, `border-radius: 12px`.

### Liens

Chaque lien (`.topbar-links a`) :

| Propriété | Valeur |
|-----------|--------|
| Layout | `flex-direction: column`, `align-items: center`, `justify-content: center` |
| Hauteur barre | 72 px |
| Padding horizontal | `18px` |
| `max-width` | `90px` |
| `font-size` | `0.78rem` |
| `line-height` | `1.5` |
| `text-align` | `center` |
| Couleur repos | `var(--fg-mute)` (`#6b7280`) |

Chaque lien affiche un **inlay** (dot de repère) au-dessus du texte :

- **Repos** : `9×9 px`, cercle, `background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.10)`.
- **Actif** : `11×11 px`, `background: radial-gradient(circle at 35% 35%, #f5b14a, #c07010)`, `border-color: #f5b14a`, `box-shadow: 0 0 10px rgba(245,177,74,0.6)`.

### État actif (`.active`)

- Texte : `color: var(--fg)` (`#f0f0f0`).
- Inlay : voir ci-dessus.
- **Barre de capo** : `::after` pseudo-élément, `3px` de large, positionné `left: 0`, `top: 15%`, `bottom: 15%`, `background: rgba(86,194,255,0.6)`, `border-radius: 2px`, `box-shadow: 0 0 8px rgba(86,194,255,0.4)`.
- Supprimer l'ancien gradient ambre sur l'actif.

### Titres sur 2 lignes

Les textes longs sont coupés manuellement dans le HTML :

```
Visualiseur\nde manche   →   Visualiseur<br>de manche
Roue\nd'accords          →   Roue<br>d'accords
Jeu\nd'oreille           →   Jeu<br>d'oreille
```

### Logo

Inchangé. Le `.topbar-mark` et le texte "Fretboard" conservent leurs styles existants.

---

## Fichiers concernés

| Fichier | Changements |
|---------|-------------|
| `index.html` | Ajouter `<br>` dans les trois liens `.topbar-links` |
| `src/style.css` | Refonte des règles `.topbar`, `.topbar-links`, `.topbar-links a`, `.topbar-links a.active`, `.topbar-mark` |

`src/main.js` : aucun changement (le routing et la gestion de `.active` restent identiques).

---

## Ce qui ne change pas

- Hash routing et `setActive()` dans `main.js`.
- Comportement reveal au scroll sur la landing (`body.is-landing`, `topbar-revealed`).
- Responsive mobile (`@media max-width: 520px`).
- Accessibilité : attributs `aria-label`, liens `<a>` natifs.
