"""
add_sermon.py — Ajoute UN sermon (1 PDF français + 1 PDF arabe), publié en une commande.

C'est la voie rapide pour traiter une proposition reçue par email : pas besoin de
relancer tout le pipeline. Le script :
  - convertit chaque PDF en HTML (même moteur que convert_pdf.py),
  - crée l'identifiant (depuis le titre FR) et la date (métadonnées du PDF FR),
  - écrit public/sermons_html/<id>.fr.html et <id>.ar.html,
  - met à jour public/sermons.json.

Usage :
    python add_sermon.py "chemin/FR.pdf" "chemin/AR.pdf"
    python add_sermon.py "FR.pdf" "AR.pdf" --titre-fr "MON TITRE" --titre-ar "العنوان"

Puis :
    git add public/ && git commit -m "ajout d'un sermon" && git push

Dépendance : pip install pymupdf
"""

import argparse
import json
import sys
from pathlib import Path

from convert_pdf import pdf_to_html            # moteur de conversion partagé
from publish import slugify, pdf_date, OUT_HTML, PUB_JSON


def clean_title(stem: str) -> str:
    return stem.strip("_ ").replace("_", " ").strip()


def upsert(entries: list[dict], new: dict) -> bool:
    """Remplace l'entrée de même id, sinon l'ajoute. Retourne True si remplacement."""
    for i, e in enumerate(entries):
        if e.get("id") == new["id"]:
            entries[i] = new
            return True
    entries.append(new)
    return False


def add_sermon(
    fr_pdf: "str | Path",
    ar_pdf: "str | Path",
    titre_fr: "str | None" = None,
    titre_ar: "str | None" = None,
    sid: "str | None" = None,
) -> dict:
    """Convertit les 2 PDF, écrit les HTML et met à jour le catalogue. Retourne un récap.

    Réutilisable : appelée par la CLI (main) ET par l'outil graphique
    « Ajouter un sermon » (ajouter_sermon.pyw).
    """
    fr, ar = Path(fr_pdf), Path(ar_pdf)
    for p in (fr, ar):
        if not p.exists():
            raise FileNotFoundError(p)

    titre_fr = titre_fr or clean_title(fr.stem)
    titre_ar = titre_ar or clean_title(ar.stem)
    sid = sid or slugify(titre_fr)

    OUT_HTML.mkdir(parents=True, exist_ok=True)
    pdf_to_html(fr, OUT_HTML / f"{sid}.fr.html")
    pdf_to_html(ar, OUT_HTML / f"{sid}.ar.html")

    date, source = pdf_date(fr)

    entry = {
        "id": sid,
        "titre_fr": titre_fr,
        "titre_ar": titre_ar,
        "url_fr": f"sermons_html/{sid}.fr.html",
        "url_ar": f"sermons_html/{sid}.ar.html",
    }
    if date:
        entry["publishedAt"] = date

    entries = json.loads(PUB_JSON.read_text(encoding="utf-8")) if PUB_JSON.exists() else []
    replaced = upsert(entries, entry)
    entries.sort(key=lambda e: e.get("titre_fr", "").lower())
    PUB_JSON.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "id": sid,
        "titre_fr": titre_fr,
        "titre_ar": titre_ar,
        "date": date,
        "source": source,
        "replaced": replaced,
        "total": len(entries),
    }


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="Ajoute un sermon (PDF FR + AR) au catalogue.")
    ap.add_argument("fr_pdf", help="PDF français")
    ap.add_argument("ar_pdf", help="PDF arabe")
    ap.add_argument("--titre-fr", dest="titre_fr", help="Titre FR (défaut : nom du PDF)")
    ap.add_argument("--titre-ar", dest="titre_ar", help="Titre AR (défaut : nom du PDF)")
    ap.add_argument("--id", help="Identifiant (défaut : dérivé du titre FR)")
    args = ap.parse_args()

    print(f"\nConversion en cours…")
    try:
        r = add_sermon(args.fr_pdf, args.ar_pdf, args.titre_fr, args.titre_ar, args.id)
    except FileNotFoundError as e:
        print(f"Fichier introuvable : {e}")
        sys.exit(1)

    print(f"\n  ✓  {'Remplacé' if r['replaced'] else 'Ajouté'} : {r['id']}")
    print(f"     titre FR : {r['titre_fr']}")
    print(f"     titre AR : {r['titre_ar']}")
    print(f"     date     : {r['date'] or '— (aucune)'} ({r['source']})")
    print(f"     catalogue : {r['total']} sermons au total")
    print('\n  Étape suivante :  git add public/ && git commit -m "ajout sermon" && git push\n')


if __name__ == "__main__":
    main()
