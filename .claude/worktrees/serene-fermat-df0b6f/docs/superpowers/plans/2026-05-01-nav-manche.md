# Navigation « Manche & repères » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la barre de navigation générique par un design inspiré du manche de guitare — fond bois + frettes, inlay dot par lien, barre de capo bleue sur l'actif.

**Architecture:** Deux fichiers uniquement. `index.html` reçoit les `<br>` pour couper les labels sur 2 lignes. `src/style.css` remplace les règles `.topbar-links` et `.topbar-links a` (lignes 105–135) et ajuste le padding vertical de `.topbar`. Aucun changement JS.

**Tech Stack:** HTML natif, CSS (variables custom existantes : `--fg`, `--fg-dim`, `--accent`, `--accent-2`, `--border`, `--ease`).

---

## Fichiers modifiés

| Fichier | Lignes concernées | Action |
|---------|-------------------|--------|
| `index.html` | 22–24 | Ajouter `<br>` dans les 3 liens |
| `src/style.css` | 54 | Réduire le padding vertical du topbar |
| `src/style.css` | 105–135 | Remplacer tout le bloc `.topbar-links` |

---

## Task 1 : Labels sur 2 lignes — `index.html`

**Fichier :** `index.html` lignes 22–24

- [ ] **Remplacer les 3 liens par leur version 2 lignes**

Remplacer :
```html
          <a href="#/manche">Visualiseur de manche</a>
          <a href="#/accords">Roue d'accords</a>
          <a href="#/game">Jeu d'oreille</a>
```

Par :
```html
          <a href="#/manche">Visualiseur<br>de manche</a>
          <a href="#/accords">Roue<br>d'accords</a>
          <a href="#/game">Jeu<br>d'oreille</a>
```

- [ ] **Vérifier la syntaxe**

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');console.log(h.includes('Visualiseur<br>') ? 'OK' : 'MANQUANT')"
```

Attendu : `OK`

- [ ] **Commit**

```bash
git add index.html
git commit -m "style: couper les labels de nav sur 2 lignes"
```

---

## Task 2 : Styles manche — `src/style.css`

**Fichier :** `src/style.css`

- [ ] **Ajuster le padding vertical du `.topbar` (ligne 54)**

Remplacer :
```css
  padding: 14px clamp(16px, 3vw, 32px);
```
Par :
```css
  padding: 0 clamp(16px, 3vw, 32px);
```

_(Les liens à 72 px définissent désormais la hauteur du topbar — pas besoin de padding vertical.)_

- [ ] **Remplacer le bloc `.topbar-links` (lignes 105–135)**

Remplacer l'intégralité de ce bloc :
```css
.topbar-links {
  display: flex;
  gap: 6px;
}
.topbar-links a {
  text-decoration: none;
  color: var(--fg-dim);
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 500;
  font-size: 0.9rem;
  letter-spacing: 0.01em;
  transition: all 200ms var(--ease);
}
.topbar-links a:hover {
  color: var(--fg);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}
.topbar-links a.active {
  color: #1a1004;
  background: linear-gradient(135deg, var(--accent), #e89320);
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(245, 177, 74, 0.3);
}

@media (max-width: 520px) {
  .topbar { padding: 10px 16px; }
  .topbar-links a { padding: 6px 12px; font-size: 0.85rem; }
}
```

Par :
```css
/* ── Manche : fond bois + frettes verticales ── */
.topbar-links {
  display: flex;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent calc(33.3333% - 1px),
      rgba(255, 255, 255, 0.055) calc(33.3333% - 1px),
      rgba(255, 255, 255, 0.055) 33.3333%
    ),
    linear-gradient(180deg, rgba(139, 90, 43, 0.18), rgba(100, 60, 20, 0.10));
  border: 1px solid rgba(255, 255, 255, 0.07);
}
/* Cordes horizontales */
.topbar-links::before,
.topbar-links::after {
  content: '';
  position: absolute;
  left: 0; right: 0;
  height: 1px;
  pointer-events: none;
  z-index: 0;
}
.topbar-links::before { top: 28%; background: rgba(200, 180, 140, 0.10); }
.topbar-links::after  { top: 72%; background: rgba(200, 180, 140, 0.10); }

/* Liens */
.topbar-links a {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 18px;
  height: 72px;
  max-width: 90px;
  text-decoration: none;
  color: var(--fg-dim);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  border: none;
  border-radius: 0;
  letter-spacing: 0;
  transition: color 200ms var(--ease);
}
/* Inlay (repère de manche) — pseudo-élément flex child */
.topbar-links a::before {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  transition: all 200ms var(--ease);
  flex-shrink: 0;
}
.topbar-links a:hover {
  color: var(--fg);
}
.topbar-links a.active {
  color: var(--fg);
}
/* Inlay actif : ambre lumineux */
.topbar-links a.active::before {
  width: 11px;
  height: 11px;
  background: radial-gradient(circle at 35% 35%, #f5b14a, #c07010);
  border-color: #f5b14a;
  box-shadow: 0 0 10px rgba(245, 177, 74, 0.6);
}
/* Barre de capo bleue sur le bord gauche */
.topbar-links a.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  bottom: 15%;
  width: 3px;
  background: rgba(86, 194, 255, 0.6);
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 8px rgba(86, 194, 255, 0.4);
}

@media (max-width: 520px) {
  .topbar { padding: 0 16px; }
  .topbar-links a { padding: 0 10px; font-size: 0.72rem; height: 60px; }
}
```

- [ ] **Vérifier la syntaxe JS du CSS (fichier JS inchangé)**

```bash
node --check src/main.js
```

Attendu : aucune erreur.

- [ ] **Commit**

```bash
git add src/style.css
git commit -m "style: navigation manche — inlays, frettes, barre de capo"
```

---

## Vérification visuelle finale

- [ ] Lancer le serveur : `npm run dev`
- [ ] Ouvrir `http://localhost:5173`
- [ ] Vérifier sur `#/manche` : inlay ambre allumé sur "Visualiseur de manche", barre bleue à gauche, les deux autres liens discrets
- [ ] Naviguer vers `#/accords` : l'inlay se déplace sur "Roue d'accords"
- [ ] Naviguer vers `#/game` : l'inlay se déplace sur "Jeu d'oreille"
- [ ] Vérifier le fond bois + frettes + cordes visible dans la zone des liens
- [ ] Réduire la fenêtre sous 520 px : liens toujours lisibles, pas de débordement
- [ ] Aller sur `#/` (landing) : topbar caché, réapparaît au scroll à 360 px
