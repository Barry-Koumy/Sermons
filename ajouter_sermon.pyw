"""
Ajouter un sermon — PAR CLIC (aucune saisie, surtout pas d'arabe).

Utilisation, au choix :
  • Double-cliquez « Ajouter un sermon.bat » → une fenêtre vous fait choisir les 2 PDF.
  • OU glissez les 2 PDF (français + arabe) sur « Ajouter un sermon.bat ».

Le script :
  - détecte tout seul lequel est l'arabe (par le contenu + le nom du fichier),
  - prend les titres depuis les noms de fichiers (le PDF arabe a déjà un nom arabe),
  - convertit, met à jour le catalogue, et propose de publier en ligne (1 clic).

Dépendance : pip install pymupdf  (déjà nécessaire au reste du pipeline).
"""
import os
import sys
import traceback
from pathlib import Path

# Le script doit s'exécuter depuis son dossier (imports + git).
HERE = Path(__file__).resolve().parent
os.chdir(HERE)
sys.path.insert(0, str(HERE))

import tkinter as tk
from tkinter import filedialog, messagebox

import fitz  # PyMuPDF
from add_sermon import add_sermon


def _arabic_count(s: str) -> int:
    """Nombre de caractères arabes dans une chaîne (bornes Unicode numériques)."""
    return sum(
        1
        for c in s
        if 0x0600 <= ord(c) <= 0x06FF  # arabe de base
        or 0x0750 <= ord(c) <= 0x077F  # supplément arabe
        or 0xFB50 <= ord(c) <= 0xFDFF  # formes de présentation A
        or 0xFE70 <= ord(c) <= 0xFEFF  # formes de présentation B
    )


def arabic_score(pdf: Path) -> int:
    """Score « arabité » d'un PDF : nom de fichier (fort) + texte de la 1re page."""
    score = _arabic_count(pdf.stem) * 5
    try:
        doc = fitz.open(pdf)
        if doc.page_count:
            score += _arabic_count(doc[0].get_text())
        doc.close()
    except Exception:
        pass
    return score


def choose_pdfs() -> list[Path]:
    files = filedialog.askopenfilenames(
        title="Sélectionnez les 2 PDF du sermon (français + arabe)",
        filetypes=[("Fichiers PDF", "*.pdf")],
    )
    return [Path(f) for f in files]


def publish_online() -> None:
    import subprocess

    try:
        subprocess.run(["git", "add", "public/"], cwd=HERE, check=True)
        subprocess.run(["git", "commit", "-m", "ajout d'un sermon"], cwd=HERE, check=True)
        subprocess.run(["git", "push"], cwd=HERE, check=True)
        messagebox.showinfo(
            "Publié ✓",
            "Le sermon est publié. Le site se reconstruit tout seul (1–2 min),\n"
            "et l'app mobile le verra sans réinstallation.",
        )
    except Exception:
        messagebox.showwarning(
            "À publier à la main",
            "La publication automatique n'a pas pu se faire.\n"
            "Ouvrez un terminal ici et lancez :\n\n"
            'git add public/ && git commit -m "ajout d\'un sermon" && git push',
        )


def main() -> None:
    root = tk.Tk()
    root.withdraw()

    # Fichiers fournis par glisser-déposer (arguments), sinon boîte de dialogue.
    dropped = [Path(a) for a in sys.argv[1:] if a.lower().endswith(".pdf")]
    pdfs = dropped if len(dropped) == 2 else choose_pdfs()

    if len(pdfs) != 2:
        if pdfs:  # l'utilisateur a choisi mais pas exactement 2
            messagebox.showwarning(
                "Ajouter un sermon",
                "Veuillez sélectionner exactement 2 fichiers PDF :\n"
                "la version française ET la version arabe du même sermon.",
            )
        return

    for p in pdfs:
        if not p.exists():
            messagebox.showerror("Ajouter un sermon", f"Fichier introuvable :\n{p}")
            return

    # Détection de la langue : le PDF le plus « arabe » est l'arabe, l'autre le français.
    a, b = pdfs
    ar, fr = (a, b) if arabic_score(a) >= arabic_score(b) else (b, a)

    try:
        r = add_sermon(str(fr), str(ar))
    except Exception:
        messagebox.showerror(
            "Erreur de conversion",
            "La conversion a échoué :\n\n" + traceback.format_exc(),
        )
        return

    msg = (
        f"{'Mis à jour' if r['replaced'] else 'Ajouté'} : {r['id']}\n\n"
        f"Français : {fr.name}\n"
        f"Arabe :    {ar.name}\n"
        f"Date :     {r['date'] or '— (aucune)'}\n"
        f"Catalogue : {r['total']} sermons au total.\n\n"
        "Publier en ligne maintenant ?"
    )
    if messagebox.askyesno("Sermon ajouté ✓", msg):
        publish_online()


if __name__ == "__main__":
    main()
