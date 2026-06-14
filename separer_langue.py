"""
separer_langue.py
─────────────────────────────────────────────────────────────────────────────
Lit tous les fichiers HTML du dossier html_output/, détecte leur langue
(français ou arabe) d'après la proportion de caractères arabes dans le texte,
puis les COPIE dans sermons_bruts_fr/ ou sermons_bruts_ar/.

Les fichiers sources restent intacts dans html_output/.

Usage :
    python separer_langue.py [--dry-run]
"""

import re
import sys
import shutil
from pathlib import Path

# ── Chemins ──────────────────────────────────────────────────────────────────
DIR_SRC  = Path(__file__).parent.parent / "semons" / "html_output"
DIR_FR   = Path(__file__).parent.parent / "semons" / "sermons_bruts_fr"
DIR_AR   = Path(__file__).parent.parent / "semons" / "sermons_bruts_ar"

# Seuil : si > 30 % des caractères non-espaces sont arabes → fichier arabe
SEUIL_AR = 0.30


def arabic_ratio(path: Path) -> float:
    try:
        raw  = path.read_text(encoding="utf-8", errors="ignore")
        text = re.sub(r"<[^>]+>", " ", raw)          # retire les balises HTML
        chars = [c for c in text if not c.isspace()]
        if not chars:
            return 0.0
        ar = sum(1 for c in chars if "؀" <= c <= "ۿ")
        return ar / len(chars)
    except Exception:
        return 0.0


def main(dry_run: bool = False) -> None:
    print()
    if dry_run:
        print("══ MODE DRY-RUN ══\n")

    if not DIR_SRC.exists():
        print(f"Dossier source introuvable : {DIR_SRC}")
        sys.exit(1)

    if not dry_run:
        DIR_FR.mkdir(parents=True, exist_ok=True)
        DIR_AR.mkdir(parents=True, exist_ok=True)

    html_files = sorted(DIR_SRC.glob("*.html"))
    if not html_files:
        print("Aucun fichier HTML trouvé dans html_output/.")
        sys.exit(0)

    print(f"{len(html_files)} fichiers HTML à classer...\n")

    count_fr = count_ar = 0

    for path in html_files:
        ratio = arabic_ratio(path)
        if ratio > SEUIL_AR:
            dest = DIR_AR / path.name
            label = "AR"
            count_ar += 1
        else:
            dest = DIR_FR / path.name
            label = "FR"
            count_fr += 1

        print(f"  [{label}]  {path.name}  (arabe={ratio:.0%})")

        if not dry_run:
            shutil.copy2(path, dest)

    print()
    print("═" * 60)
    print(f"  Fichiers français  → sermons_bruts_fr/ : {count_fr}")
    print(f"  Fichiers arabes    → sermons_bruts_ar/ : {count_ar}")
    print("═" * 60)
    print()


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
