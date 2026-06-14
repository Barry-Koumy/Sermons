"""
trier_sermons.py
────────────────────────────────────────────────────────────────────────────────
Associe des fichiers HTML français et arabes, déplace les paires validées dans
un dossier propre et génère / met à jour sermons.json.

Structure :
    sermons_bruts_fr/   ← fichiers HTML français (copiés par separer_langue.py)
    sermons_bruts_ar/   ← fichiers HTML arabes
    sermons_html/       ← créé automatiquement, reçoit les paires validées

Usage :
    python trier_sermons.py                  # traitement normal
    python trier_sermons.py --dry-run        # simulation sans toucher les fichiers
    python trier_sermons.py --generer-mapping # crée mapping_draft.json à remplir

Deux sources de correspondance (cumulatives) :
    1. mapping.json      — fichier de paires validé par l'utilisateur (prioritaire)
    2. CORRESPONDANCE    — dictionnaire codé en dur ci-dessous (secours)

Sécurité :
    Les fichiers sont COPIÉS avant d'être supprimés des dossiers bruts.
    Si la copie échoue, la source reste intacte.
"""

import os
import re
import sys
import json
import shutil
import unicodedata
from pathlib import Path


# ══════════════════════════════════════════════════════════════════════════════
# 1. CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

DIR_FR    = Path(__file__).parent.parent / "semons" / "sermons_bruts_fr"
DIR_AR    = Path(__file__).parent.parent / "semons" / "sermons_bruts_ar"
DIR_OUT   = Path(__file__).parent.parent / "semons" / "sermons_html"
JSON_PATH = Path(__file__).parent / "public" / "sermons.json"

# Fichier de mapping externe (généré par --generer-mapping, puis édité)
MAPPING_FILE = Path(__file__).parent / "mapping.json"


# ══════════════════════════════════════════════════════════════════════════════
# 2. CORRESPONDANCE MANUELLE (secours si mapping.json absent)
#    Clé   = nom exact du fichier HTML français
#    Valeur = nom exact du fichier HTML arabe
# ══════════════════════════════════════════════════════════════════════════════

CORRESPONDANCE: dict[str, str] = {
    # Exemples (décommente et complète) :
    # "LA CONFIANCE EN ALLAH.html":   "_⁨الثقة بالله .html",
    # "LA BÉNÉDICTION.html":          "البركة.html",
}


# ══════════════════════════════════════════════════════════════════════════════
# 3. HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "sermon"


def make_id(stem_fr: str) -> str:
    return slugify(stem_fr)


# ══════════════════════════════════════════════════════════════════════════════
# 4. CHARGEMENT DU MAPPING
# ══════════════════════════════════════════════════════════════════════════════

def load_mapping(fr_files: list[str], ar_files: list[str]) -> dict[str, str]:
    """
    Charge les paires depuis mapping.json (prioritaire) puis CORRESPONDANCE.
    Retourne un dict {fr_name: ar_name} avec uniquement les entrées valides.
    """
    paires: dict[str, str] = {}
    fr_set = set(fr_files)
    ar_set = set(ar_files)

    # 1. mapping.json (fichier externe éditable)
    if MAPPING_FILE.exists():
        try:
            raw = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
            for entry in raw:
                fr_name = entry.get("fr", "")
                ar_name = entry.get("ar", "")
                if not fr_name or not ar_name:
                    continue   # paire incomplète → orphelin
                if fr_name not in fr_set:
                    print(f"  [AVERT] mapping.json : FR introuvable → {fr_name}")
                    continue
                if ar_name not in ar_set:
                    print(f"  [AVERT] mapping.json : AR introuvable → {ar_name}")
                    continue
                paires[fr_name] = ar_name
        except Exception as exc:
            print(f"  [AVERT] Impossible de lire mapping.json : {exc}")

    # 2. Dictionnaire codé en dur (pour les entrées pas encore dans mapping.json)
    for fr_name, ar_name in CORRESPONDANCE.items():
        if fr_name in paires:
            continue
        if fr_name not in fr_set or ar_name not in ar_set:
            continue
        paires[fr_name] = ar_name

    return paires


# ══════════════════════════════════════════════════════════════════════════════
# 5. GÉNÉRATION DU FICHIER DE MAPPING DRAFT
# ══════════════════════════════════════════════════════════════════════════════

def generer_mapping_draft(fr_files: list[str], ar_files: list[str]) -> None:
    """
    Crée mapping.json avec toutes les paires à remplir.
    Chaque entrée a "fr" (nom du fichier FR) et "ar" (à compléter).
    Les fichiers AR sont listés séparément pour aider à la complétion.
    """
    draft = [{"fr": f, "ar": ""} for f in sorted(fr_files)]
    ar_list = sorted(ar_files)

    output = {
        "_instructions": (
            "Associe chaque fichier FR à son fichier AR. "
            "Laisse 'ar' vide pour les fichiers sans paire (orphelins). "
            "Supprime cette clé _instructions avant de relancer le script."
        ),
        "_fichiers_ar_disponibles": ar_list,
        "paires": draft,
    }

    MAPPING_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n  ✓  mapping.json généré → {MAPPING_FILE}")
    print(f"     {len(fr_files)} entrées FR à associer avec {len(ar_files)} fichiers AR.")
    print("\n  Ouvre mapping.json, remplis le champ \"ar\" pour chaque paire,")
    print("  supprime la clé \"_instructions\", puis relance :")
    print("  python trier_sermons.py\n")


# ══════════════════════════════════════════════════════════════════════════════
# 6. MISE À JOUR DE sermons.json
# ══════════════════════════════════════════════════════════════════════════════

def load_json(path: Path) -> list[dict]:
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            # Ignore les anciennes entrées au format {titre, url} (ancien convert_pdf.py)
            return [e for e in data if "titre_fr" in e]
        except json.JSONDecodeError:
            return []
    return []


def save_json(path: Path, data: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def upsert_entry(entries: list[dict], new_entry: dict) -> None:
    for i, e in enumerate(entries):
        if e["id"] == new_entry["id"]:
            entries[i] = new_entry
            return
    entries.append(new_entry)


# ══════════════════════════════════════════════════════════════════════════════
# 7. DÉPLACEMENT SÉCURISÉ
# ══════════════════════════════════════════════════════════════════════════════

def safe_move(src: Path, dst_dir: Path, dry_run: bool) -> Path:
    dst = dst_dir / src.name
    if dry_run:
        print(f"    [DRY] déplacerais {src.name}  →  {dst_dir.name}/")
        return dst
    try:
        shutil.copy2(src, dst)
        src.unlink()
    except Exception as exc:
        raise RuntimeError(f"Impossible de déplacer {src.name} : {exc}") from exc
    return dst


# ══════════════════════════════════════════════════════════════════════════════
# 8. POINT D'ENTRÉE
# ══════════════════════════════════════════════════════════════════════════════

def main(dry_run: bool = False, generer: bool = False) -> None:
    print()
    if dry_run:
        print("══ MODE DRY-RUN (aucun fichier ne sera touché) ══\n")

    for d, label in [(DIR_FR, "sermons_bruts_fr"), (DIR_AR, "sermons_bruts_ar")]:
        if not d.exists():
            print(f"Dossier introuvable : {d}")
            print(f"Lance d'abord : python separer_langue.py")
            sys.exit(1)

    fr_files = sorted(p.name for p in DIR_FR.glob("*.html"))
    ar_files = sorted(p.name for p in DIR_AR.glob("*.html"))

    print(f"Fichiers FR trouvés : {len(fr_files)}")
    print(f"Fichiers AR trouvés : {len(ar_files)}\n")

    # Mode génération du fichier de mapping
    if generer:
        generer_mapping_draft(fr_files, ar_files)
        return

    # Chargement des paires
    paires = load_mapping(fr_files, ar_files)
    print(f"Paires chargées : {len(paires)}")

    if len(paires) == 0:
        print("\n  Aucune paire définie.")
        print("  Lance d'abord : python trier_sermons.py --generer-mapping")
        print("  Puis remplis mapping.json et relance sans argument.\n")
        return

    if not dry_run:
        DIR_OUT.mkdir(parents=True, exist_ok=True)

    json_entries = load_json(JSON_PATH)
    validated = 0
    errors    = 0

    print()
    print("─" * 60)

    for fr_name, ar_name in sorted(paires.items()):
        fr_src   = DIR_FR / fr_name
        ar_src   = DIR_AR / ar_name
        stem_fr  = Path(fr_name).stem.strip("_ ")
        stem_ar  = Path(ar_name).stem.strip("_⁨⁩ ")
        entry_id = make_id(stem_fr)

        print(f"  ✓  {fr_name}")
        print(f"     ↳  {ar_name}")

        try:
            safe_move(fr_src, DIR_OUT, dry_run)
            safe_move(ar_src, DIR_OUT, dry_run)

            entry = {
                "id":       entry_id,
                "titre_fr": stem_fr,
                "titre_ar": stem_ar,
                "url_fr":   f"sermons_html/{fr_name}",
                "url_ar":   f"sermons_html/{ar_name}",
            }
            if not dry_run:
                upsert_entry(json_entries, entry)
            validated += 1

        except RuntimeError as exc:
            print(f"  ✗  ERREUR : {exc}")
            errors += 1

    if not dry_run and validated > 0:
        json_entries.sort(key=lambda e: e["titre_fr"].lower())
        save_json(JSON_PATH, json_entries)
        print(f"\n  ✓  sermons.json mis à jour ({len(json_entries)} entrées) → {JSON_PATH}")

    # ── Rapport orphelins ─────────────────────────────────────────────────
    paired_fr  = set(paires.keys())
    paired_ar  = set(paires.values())
    orphans_fr = [f for f in fr_files if f not in paired_fr]
    orphans_ar = [a for a in ar_files if a not in paired_ar]

    print()
    print("═" * 60)
    print(f"  Paires validées et déplacées : {validated}")
    print(f"  Erreurs                      : {errors}")
    print(f"  Orphelins FR (sans paire AR) : {len(orphans_fr)}")
    print(f"  Orphelins AR (sans paire FR) : {len(orphans_ar)}")
    print("═" * 60)

    if orphans_fr:
        print("\nFichiers FRANÇAIS sans paire (sermons_bruts_fr/) :")
        for f in sorted(orphans_fr):
            print(f"    • {f}")

    if orphans_ar:
        print("\nFichiers ARABES sans paire (sermons_bruts_ar/) :")
        for a in sorted(orphans_ar):
            print(f"    • {a}")

    if not orphans_fr and not orphans_ar:
        print("\n  Aucun orphelin — toutes les paires sont complètes.")

    print()


if __name__ == "__main__":
    dry_run  = "--dry-run"        in sys.argv
    generer  = "--generer-mapping" in sys.argv
    main(dry_run=dry_run, generer=generer)
