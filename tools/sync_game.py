#!/usr/bin/env python3
"""Sync the Créadex site from the game repository (creatures-rumble).

The game repository is the only source of the creatures (docs/creadex/LISEZMOI.md over there):
  docs/creadex/creadex.csv                  the Créadex sheet (one row per species)
  src/shared/species/data/CreadexSpecies    the zone each species is played in (generated)
  src/shared/combat/CombatConfig.luau       attack display names
  src/shared/ElementChart.luau, Rarity.luau type and rarity colors of the HUD
  assets/manifest.json                      species that have a rigged mesh in the game
  art/species/<id>/ref/                     2D illustration and turnaround
  art/2d/src/ui_icons/species_<id>.png      HUD portraits (+ _shiny), element medallions, logo
  art/2d/src/ui_chrome/                     HUD chrome (tiles, buttons, plates, glyphs)
  tools/rumble_proto/out/<id>/export/<id>.glb
                                            3D models of the Rumble+ factory (branch wip/rumble-plus-*,
                                            gitignored there: run `python3 tools/rumble_proto/run.py <id>`
                                            then `export.py <id>` first). Only this factory: the models of
                                            the first factory (tools/creature_factory) are not used.

It writes data/creadex.json and the web copies of the images under assets/ (WebP, resized).
A model already in assets/models/ stays when the factory output is missing (CI has no Blender).

Usage:
  python3 tools/sync_game.py [--game ../creatures-rumble]
"""
import argparse
import csv
import json
import os
import re
import shutil
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("sync_game: needs Pillow (pip install pillow)")

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RARITY_EN = {"Commun": "Common", "Peu commun": "Uncommon", "Rare": "Rare", "Épique": "Epic",
             "Légendaire": "Legendary", "Secrète": "Secret"}
MORPH_EN = {"Bipède": "Biped", "Oiseau": "Bird", "Poisson": "Fish", "Quadrupède": "Quadruped",
            "Serpent": "Serpent", "Spécial": "Special"}
TYPE_FR = {"Normal": "Normal", "Fire": "Feu", "Water": "Eau", "Nature": "Nature", "Lightning": "Foudre",
           "Wind": "Vent", "Earth": "Terre", "Ice": "Glace", "Toxic": "Toxique", "Metal": "Métal",
           "Shadow": "Ombre", "Light": "Lumière"}
TYPE_EN = {v: k for k, v in TYPE_FR.items()}

# HUD chrome copied as is (small PNGs, 9-slice in CSS).
CHROME = ["tile_common", "tile_uncommon", "tile_rare", "tile_epic", "tile_legendary", "tile_secret",
          "plate_common", "plate_uncommon", "plate_rare", "plate_epic", "plate_legendary", "plate_secret",
          "button_gold", "button_gold_down", "button_secondary", "button_secondary_down",
          "button_green", "button_green_down", "button_premium", "button_premium_down", "button_disabled",
          "close_round", "star", "star_empty", "bevel", "pointer", "side_arrow",
          "glyph_dex", "glyph_collection", "glyph_info", "glyph_camera", "glyph_target", "glyph_paw",
          "glyph_heart", "glyph_sword", "glyph_speed", "glyph_shield", "glyph_up", "glyph_down",
          "glyph_swap", "glyph_map", "glyph_lock", "glyph_attack_melee", "glyph_attack_projectile",
          "glyph_attack_ring", "glyph_attack_beam", "glyph_attack_chain", "glyph_attack_dash",
          "glyph_attack_heal", "glyph_arrow", "sparkle", "check"]
ICONS = ["logo", "shiny", "stat_hp", "stat_atk", "stat_spd", "stat_power", "zonecard_prairie"]
BASIC_SHAPE = {"strike": "melee", "shot": "projectile", "sweep": "ring", "zap": "beam"}
SPECIAL_SHAPE = {"fire_zone": "ring", "tidal_wave": "ring", "bloom": "heal", "gust_dash": "dash",
                 "chain_lightning": "chain"}


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def luau_rgb_table(text, table):
    """`<table> = { Name = { r, g, b }, ... }` -> {Name: '#rrggbb'}."""
    block = re.search(re.escape(table) + r"\s*=\s*\{(.*?)\n\}", text, re.S)
    if not block:
        sys.exit(f"sync_game: {table} not found")
    out = {}
    for name, r, g, b in re.findall(r"(\w+)\s*=\s*\{\s*(\d+),\s*(\d+),\s*(\d+)\s*\}", block.group(1)):
        out[name] = "#%02x%02x%02x" % (int(r), int(g), int(b))
    return out


def attack_names(text):
    names = {}
    for key, body in re.findall(r"\n\t([a-z_]+) = \{(.*?)(?=\n\t[a-z_]+ = \{|\n\})", text, re.S):
        m = re.search(r'Name = "([^"]+)"', body)
        if m:
            names[key] = m.group(1)
    return names


def zones(text):
    return dict(re.findall(r'Id = "([a-z0-9]+)",.*?Zone = "([a-z_]+)"', text, re.S))


def save_webp(src, dst, max_side, quality=84):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return
    im = Image.open(src).convert("RGBA")
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    im.save(dst, "WEBP", quality=quality, method=6)


def split(value):
    return [v.strip() for v in re.split(r"[,;]", value or "") if v.strip() and v.strip() != "—"]


def num(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", default=os.path.join(os.path.dirname(SITE), "creatures-rumble"))
    ap.add_argument("--models", help="Rumble+ out/ folder (default: <game>/tools/rumble_proto/out)")
    args = ap.parse_args()
    game = os.path.abspath(args.game)
    models_root = os.path.abspath(args.models or os.path.join(game, "tools/rumble_proto/out"))
    csv_path = os.path.join(game, "docs", "creadex", "creadex.csv")
    if not os.path.exists(csv_path):
        sys.exit(f"sync_game: {csv_path} not found (--game <path of creatures-rumble>)")

    with open(csv_path, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    zone_of = zones(read(os.path.join(game, "src/shared/species/data/CreadexSpecies.luau")))
    names = attack_names(read(os.path.join(game, "src/shared/combat/CombatConfig.luau")))
    elements = luau_rgb_table(read(os.path.join(game, "src/shared/ElementChart.luau")), "ElementChart.Colors")
    rarities = luau_rgb_table(read(os.path.join(game, "src/shared/Rarity.luau")), "Rarity.Colors")
    catalog = read(os.path.join(game, "src/shared/species/SpeciesCatalog.luau"))
    species_luau = read(os.path.join(game, "src/shared/species/Species.luau"))
    fallback_stats = dict((k.lower(), int(v)) for k, v in re.findall(
        r"(HP|ATK|SPD) = (\d+)", re.search(r"PROVISIONAL_STATS = \{([^}]*)\}", catalog).group(1)))
    fallback_stats["spd"] = fallback_stats.get("spd")
    default_specials = dict(re.findall(r'(\w+) = "(\w+)"', re.search(r"DefaultSpecials = \{(.*?)\}", species_luau, re.S).group(1)))
    generic_special = re.search(r'GenericSpecial = "(\w+)"', species_luau).group(1)
    manifest = json.load(open(os.path.join(game, "assets/manifest.json"), encoding="utf-8"))["species"]

    icons = os.path.join(game, "art/2d/src/ui_icons")
    chrome = os.path.join(game, "art/2d/src/ui_chrome")
    out_ui = os.path.join(SITE, "assets/ui")
    os.makedirs(out_ui, exist_ok=True)
    for key in CHROME:
        shutil.copyfile(os.path.join(chrome, key + ".png"), os.path.join(out_ui, key + ".png"))
    for key in ICONS:
        save_webp(os.path.join(icons, key + ".png"), os.path.join(SITE, "assets/icons", key + ".webp"),
                  1024 if key in ("logo", "zonecard_prairie") else 192)
    for element in elements:
        save_webp(os.path.join(icons, f"element_{element}.png"),
                  os.path.join(SITE, "assets/elements", element + ".webp"), 160)

    species = []
    for row in rows:
        sid, number = row["Id (stable)"].strip(), row["N°"].strip()
        ref = os.path.join(game, "art/species", sid, "ref")
        entry = {
            "number": number, "id": sid,
            "name": row["Name (EN)"].strip(), "nameFr": row["Nom"].strip(),
            "category": row["Category (EN)"].strip(), "categoryFr": row["Catégorie"].strip(),
            "element": row["Type (EN)"].strip(),
            "weaknesses": [TYPE_EN.get(t, t) for t in split(row["Faiblesses"])],
            "resistances": [TYPE_EN.get(t, t) for t in split(row["Résistances"])],
            "stage": num(row["Stade ★ (interne)"]) or 0,
            "size": row["Taille code"].strip() or None,
            "studs": num(row["Taille (studs)"]),
            "morphology": MORPH_EN.get(row["Morphologie"].strip(), row["Morphologie"].strip()),
            "morphologyFr": row["Morphologie"].strip(),
            "family": row["Famille"].strip(),
            "evolvesFrom": row["Évolue de (N°)"].strip() or None,
            "evolvesTo": row["Évolue en (N°)"].strip() or None,
            "rarity": RARITY_EN.get(row["Rareté"].strip(), row["Rareté"].strip()),
            "lent": row["Rôle"].strip() == "Prêtée",
            "basic": None, "special": None,
            "stats": None,
            "description": row["Description (EN)"].strip(), "descriptionFr": row["Description Créadex"].strip(),
            "zone": zone_of.get(sid, "unassigned"),
            "artStatus": row["Statut art"].strip(),
            "inGame": sid in manifest,
            "image": None, "turnaround": None, "portrait": None, "portraitShiny": None,
            "model": None, "shinyTexture": None,
        }
        # The game's values, fallbacks included (SpeciesCatalog.fromCreadex): "fallback" marks them.
        for slot, shapes in (("basic", BASIC_SHAPE), ("special", SPECIAL_SHAPE)):
            key = row["Attaque de base" if slot == "basic" else "Spécial"].strip()
            fallback = False
            if not key and slot == "special":
                key, fallback = default_specials.get(entry["element"], generic_special), True
            if key:
                entry[slot] = {"id": key, "name": names.get(key, key.replace("_", " ").title()),
                               "shape": shapes.get(key, "ring"), "fallback": fallback}
        hp, atk, spd = (num(row[c]) for c in ("PV (provisoire)", "ATQ (provisoire)", "VIT (provisoire)"))
        if hp and atk and spd:
            entry["stats"] = {"hp": hp, "atk": atk, "spd": spd, "fallback": False}
        else:
            entry["stats"] = dict(fallback_stats, fallback=True)

        illu, turn = os.path.join(ref, f"{sid}_illustration-2d.png"), os.path.join(ref, f"{sid}_turnaround.png")
        if os.path.exists(illu):
            entry["image"] = f"assets/species/{sid}.webp"
            save_webp(illu, os.path.join(SITE, entry["image"]), 900)
        if os.path.exists(turn):
            entry["turnaround"] = f"assets/species/{sid}_turnaround.webp"
            save_webp(turn, os.path.join(SITE, entry["turnaround"]), 1800)
        for field, suffix in (("portrait", ""), ("portraitShiny", "_shiny")):
            src = os.path.join(icons, f"species_{sid}{suffix}.png")
            if os.path.exists(src):
                entry[field] = f"assets/portraits/{sid}{suffix}.webp"
                save_webp(src, os.path.join(SITE, entry[field]), 256)

        out = os.path.join(models_root, sid, "export")
        glb, shiny = os.path.join(out, f"{sid}.glb"), os.path.join(out, f"{sid}_shiny.png")
        model_dst = os.path.join(SITE, "assets/models", f"{sid}.glb")
        shiny_dst = os.path.join(SITE, "assets/models", f"{sid}_shiny.png")
        if os.path.exists(glb):
            os.makedirs(os.path.dirname(model_dst), exist_ok=True)
            shutil.copyfile(glb, model_dst)
            if os.path.exists(shiny):
                shutil.copyfile(shiny, shiny_dst)
        if os.path.exists(model_dst):
            entry["model"] = f"assets/models/{sid}.glb"
            if os.path.exists(shiny_dst):
                entry["shinyTexture"] = f"assets/models/{sid}_shiny.png"
        species.append(entry)

    # Family: the csv names the first species of the family (French name); the site uses its id.
    by_fr = {s["nameFr"]: s["id"] for s in species}
    for s in species:
        s["family"] = by_fr.get(s["family"], s["id"])

    data = {
        "source": "creatures-rumble: docs/creadex/creadex.csv (generated by tools/sync_game.py, never edit by hand)",
        "elements": {k: {"color": v, "fr": TYPE_FR.get(k, k)} for k, v in elements.items()},
        "rarities": rarities,
        "species": species,
    }
    with open(os.path.join(SITE, "data/creadex.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"sync_game: {len(species)} species, {sum(1 for s in species if s['image'])} illustrated, "
          f"{sum(1 for s in species if s['portrait'])} portraits, {sum(1 for s in species if s['model'])} 3D models")


if __name__ == "__main__":
    main()
