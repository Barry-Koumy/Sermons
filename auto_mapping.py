"""
auto_mapping.py
────────────────────────────────────────────────────────────────────────────────
Associe automatiquement chaque sermon français à son équivalent arabe en
comparant les PDFs originaux (dans semons/).

Critères d'association (dans l'ordre) :
  1. Même taille de fichier exacte ou quasi-exacte (±2 %)  → paire SÛRE
  2. Différence de taille ≤ 20 %                           → paire PROBABLE
  3. Au-delà                                               → orphelin

Doublons vrais (même contenu textuel, hachage SHA-1) :
  Les doublons exacts sont déplacés dans semons/doublons/.

Résultats :
  mapping.json          → paires sûres + probables  (pour trier_sermons.py)
  mapping_douteux.json  → paires incertaines (à vérifier)

Usage :
    python auto_mapping.py [--dry-run]

Requirements : pip install pymupdf
"""

import re
import sys
import json
import shutil
import hashlib
import fitz  # PyMuPDF
from pathlib import Path


# ── Chemins ──────────────────────────────────────────────────────────────────
DIR_PDF  = Path(__file__).parent.parent / "semons"
DIR_DUP  = DIR_PDF / "doublons"
MAPPING  = Path(__file__).parent / "mapping.json"
DOUTEUX  = Path(__file__).parent / "mapping_douteux.json"

# Seuils d'appariement
SEUIL_SUR     =  2   # % — différence de taille → paire sûre
SEUIL_PROBABLE = 20  # % — différence de taille → paire probable


# ── Détection de langue par le nom ───────────────────────────────────────────

def est_arabe_nom(nom: str) -> bool:
    lettres = [c for c in nom if c.isalpha()]
    if not lettres:
        return False
    ar = sum(1 for c in lettres if "؀" <= c <= "ۿ")
    return (ar / len(lettres)) >= 0.4


# ── Extraction du texte du PDF ────────────────────────────────────────────────

def texte_pdf(path: Path) -> str:
    """Retourne le texte brut de toutes les pages du PDF."""
    try:
        doc  = fitz.open(str(path))
        txt  = "\n".join(page.get_text() for page in doc)
        doc.close()
        return txt
    except Exception:
        return ""


def hash_pdf(path: Path) -> str:
    """SHA-1 du texte brut (ignore les métadonnées PDF)."""
    return hashlib.sha1(texte_pdf(path).encode("utf-8", errors="ignore")).hexdigest()


# ── Différence de taille relative ────────────────────────────────────────────

def diff_taille(a: int, b: int) -> float:
    if max(a, b) == 0:
        return 100.0
    return abs(a - b) / max(a, b) * 100


# ── Point d'entrée ────────────────────────────────────────────────────────────

def main(dry_run: bool = False) -> None:
    print()
    if dry_run:
        print("══ DRY-RUN ══\n")

    if not DIR_PDF.exists():
        print(f"Dossier PDF introuvable : {DIR_PDF}")
        sys.exit(1)

    # ── Inventaire ────────────────────────────────────────────────────────
    tous    = list(DIR_PDF.glob("*.pdf"))
    list_fr = [p for p in tous if not est_arabe_nom(p.name)]
    list_ar = [p for p in tous if est_arabe_nom(p.name)]

    print(f"PDFs français : {len(list_fr)}")
    print(f"PDFs arabes   : {len(list_ar)}")
    print("\nCalcul des hachages et tailles…")

    # Taille + hash pour chaque fichier
    infos_fr = {p: {"taille": p.stat().st_size, "hash": hash_pdf(p)} for p in list_fr}
    infos_ar = {p: {"taille": p.stat().st_size, "hash": hash_pdf(p)} for p in list_ar}

    # ── Doublons exacts (même hash) ───────────────────────────────────────
    def detecter_doublons(infos: dict) -> dict[str, list[Path]]:
        """Regroupe les fichiers par hash."""
        groupes: dict[str, list[Path]] = {}
        for p, info in infos.items():
            groupes.setdefault(info["hash"], []).append(p)
        return {h: lst for h, lst in groupes.items() if len(lst) > 1}

    dup_fr = detecter_doublons(infos_fr)
    dup_ar = detecter_doublons(infos_ar)

    doublons_deplaces = 0
    if dup_fr or dup_ar:
        print("\n── Doublons exacts (même contenu) ───────────────────────")
        for h, lst in {**dup_fr, **dup_ar}.items():
            # Garde le premier alphabétiquement, déplace les autres
            lst_tri = sorted(lst, key=lambda p: p.name)
            print(f"  Groupe : {' | '.join(p.name for p in lst_tri)}")
            for p in lst_tri[1:]:
                print(f"    → doublon supprimé : {p.name}")
                if not dry_run:
                    DIR_DUP.mkdir(exist_ok=True)
                    shutil.move(str(p), str(DIR_DUP / p.name))
                    del infos_fr[p] if p in infos_fr else infos_ar.pop(p, None)
                doublons_deplaces += 1
        print()

    # ── Appariement FR ↔ AR par taille ────────────────────────────────────
    # Algorithme glouton trié par différence croissante → priorité aux meilleures paires
    candidats = []
    for p_fr, i_fr in infos_fr.items():
        for p_ar, i_ar in infos_ar.items():
            d = diff_taille(i_fr["taille"], i_ar["taille"])
            candidats.append((d, p_fr, p_ar))

    candidats.sort(key=lambda x: x[0])

    utilises_fr: set[Path] = set()
    utilises_ar: set[Path] = set()
    paires_sure:    list[dict] = []
    paires_probable: list[dict] = []

    for d, p_fr, p_ar in candidats:
        if p_fr in utilises_fr or p_ar in utilises_ar:
            continue

        fr_html = p_fr.stem + ".html"
        ar_html = p_ar.stem + ".html"

        entree = {
            "fr":           fr_html,
            "ar":           ar_html,
            "_diff_taille": f"{d:.1f}%",
        }

        if d <= SEUIL_SUR:
            paires_sure.append(entree)
        elif d <= SEUIL_PROBABLE:
            paires_probable.append(entree)
        else:
            continue   # trop différent, ce ne sera pas associé ici

        utilises_fr.add(p_fr)
        utilises_ar.add(p_ar)

    orphelins_fr = [p for p in infos_fr if p not in utilises_fr]
    orphelins_ar = [p for p in infos_ar if p not in utilises_ar]

    # ── Sauvegarde ────────────────────────────────────────────────────────
    if not dry_run:
        # mapping.json = paires sûres → prêtes pour trier_sermons.py
        mapping_data = [{"fr": e["fr"], "ar": e["ar"]} for e in paires_sure]
        MAPPING.write_text(
            json.dumps(mapping_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        # mapping_douteux.json = probables → à vérifier manuellement
        DOUTEUX.write_text(
            json.dumps(paires_probable, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    # ── Rapport ───────────────────────────────────────────────────────────
    print("═" * 64)
    print(f"  Doublons exacts déplacés dans doublons/         : {doublons_deplaces}")
    print(f"  Paires SÛRES    (taille ±{SEUIL_SUR}%)                   : {len(paires_sure)}")
    print(f"  Paires PROBABLES (taille ±{SEUIL_PROBABLE}%) → mapping_douteux.json : {len(paires_probable)}")
    print(f"  Orphelins FR (aucune paire)                     : {len(orphelins_fr)}")
    print(f"  Orphelins AR (aucune paire)                     : {len(orphelins_ar)}")
    print("═" * 64)

    if orphelins_fr:
        print("\nOrphelins français :")
        for p in sorted(orphelins_fr, key=lambda x: x.name):
            print(f"    • {p.name}")

    if orphelins_ar:
        print("\nOrphelins arabes :")
        for p in sorted(orphelins_ar, key=lambda x: x.name):
            print(f"    • {p.name}")

    if not dry_run:
        print(f"\n  ✓  mapping.json         → {MAPPING}")
        print(f"  ✓  mapping_douteux.json → {DOUTEUX}")
        print("\nÉtape suivante → python trier_sermons.py")
    print()


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
