# Créadex — Creature Rumble

Site statique (GitHub Pages) du Créadex, dans le style du HUD « ui2 » du jeu (onglets biseautés,
panneaux anthracite, texte blanc contouré, tuiles par rareté, pages sur fond de type).

## Données : branchées sur le jeu

Les créatures viennent **uniquement** du repo du jeu `creatures-rumble` ; rien ne s'édite ici à la main.

| Source dans creatures-rumble | Sur le site |
|---|---|
| `docs/creadex/creadex.csv` (source de vérité du Créadex) | `data/creadex.json` |
| `src/shared/species/SpeciesCatalog.luau`, `Species.luau` | stats et spécial de repli (ceux que le jeu applique) |
| `src/shared/combat/CombatConfig.luau` | noms des attaques |
| `src/shared/ElementChart.luau`, `Rarity.luau` | couleurs des types et des raretés |
| `assets/manifest.json` | badge « En jeu » (espèce riggée dans le jeu) |
| `art/species/<id>/ref/` | illustration et turnaround (WebP) |
| `art/2d/src/ui_icons/`, `ui_chrome/` | portraits, médaillons de type, logo, habits du HUD |
| `tools/rumble_proto/out/<id>/export/<id>.glb` (usine Rumble+, branches `wip/rumble-plus-*`) | modèle 3D (`assets/models/`) |

```
python3 tools/sync_game.py --game ../creatures-rumble
```

Les GLB viennent **uniquement de l'usine Rumble+** (sprawn, ramblaze, jellop pour l'instant), gitignorés
là-bas : dans creatures-rumble, `python3 tools/rumble_proto/run.py <id>` puis
`python3 tools/rumble_proto/export.py <id>` (Blender 5.2, `$BLENDER`), avant la synchro
(`--models <dossier out>` si besoin). Les modèles de la première usine (`tools/creature_factory`) ne sont
pas repris. Un modèle déjà dans `assets/models/` reste si la sortie de l'usine manque.

Déploiement : chaque push sur `main`. Avec un secret `GAME_REPO_TOKEN` (lecture sur
creatures-rumble), le workflow régénère les données depuis le main du jeu à chaque déploiement
(et sur un `repository_dispatch` `creadex-sync`).

## Fond de la fiche

`backdrop.js` dessine le fond animé de type de la fiche (même boucle que le fond des interfaces du
jeu : coins foncés, lignes lumineuses, mot stylisé du type qui défile). Les 12 mots viennent du
lot 36 de Gab (`assets/wordmarks/<Type>.png`, blanc sur transparent, même hauteur de minuscules) ;
une fois le lot importé dans creatures-rumble (`feature/ui-backdrop`), les prendre de là par la
synchro. Les réglages sont les constantes en tête de `backdrop.js` (valeurs de départ).

## Viewer 3D et habitats

`viewer.js` (three.js) affiche le GLB riggé du jeu (animations Idle, Walk, Attack, Special,
Victory ; texture shiny). Un habitat par type dans `data/habitats.json` : tant que `model` est
`null`, un îlot simple aux couleurs du type. Pour brancher un habitat : déposer
`assets/habitats/<Type>.glb` (Y en haut, 1 unité = 1 stud, la créature posée à l'origine) et
mettre son chemin dans `model`.

Lien direct vers une fiche : `#<id>` (ex. `#embaa`).

## En local

```
python3 -m http.server 8000
```

Cache : à chaque mise en ligne qui change le CSS ou le JS, monter le `?v=` de `index.html`
(styles.css, app.js) et d'`app.js` (viewer.js, données), sinon les navigateurs gardent l'ancien fichier.
