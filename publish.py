"""
publish.py
──────────────────────────────────────────────────────────────────────────────
Étape FINALE du pipeline : rend le catalogue directement lisible par l'app web.

À partir d'un catalogue d'entrée (public/sermons.json par défaut) et des fichiers
HTML bruts de ../semons/sermons_html/, ce script :

  1. retrouve le vrai fichier HTML FR/AR de chaque entrée par correspondance de
     nom NORMALISÉE (NFC + suppression des isolats bidi + espaces/underscores),
  2. le copie sous un nom ASCII stable :
        public/sermons_html/<id>.fr.html  /  <id>.ar.html
     → élimine définitivement les soucis d'encodage d'URL (GitHub Pages, fetch),
  3. extrait la date de création du PDF source (../semons/*.pdf) → publishedAt,
  4. réécrit public/sermons.json avec des URLs propres + la date.

Idempotent : si une entrée pointe déjà vers <id>.<lang>.html présent dans
public/sermons_html/, elle est conservée même si le HTML brut n'est plus là.

Usage :
    python publish.py [catalogue_entree.json]

Dépendance facultative (améliore l'extraction des dates) :
    pip install pymupdf
"""

import datetime
import json
import re
import shutil
import sys
import time
import unicodedata
from pathlib import Path

# ── Chemins (relatifs à sermons-app/) ─────────────────────────────────────────
BASE       = Path(__file__).parent
SRC_HTML   = BASE.parent / "semons" / "sermons_html"   # HTML bruts (noms d'origine)
SRC_PDFDIR = BASE.parent / "semons"                    # PDF sources (pour les dates)
OUT_HTML   = BASE / "public" / "sermons_html"          # cible servie par l'app
PUB_JSON   = BASE / "public" / "sermons.json"

# Caractères invisibles à neutraliser dans les noms de fichiers (source ASCII,
# classe construite au runtime pour éviter tout littéral invisible) :
#   2066–2069 isolats bidi · 202A–202E embeddings/overrides
#   200E/200F LRM/RLM · 200B–200D zero-width · FEFF BOM
_INVISIBLE_RANGES = [
    (0x2066, 0x2069),
    (0x202A, 0x202E),
    (0x200E, 0x200F),
    (0x200B, 0x200D),
    (0xFEFF, 0xFEFF),
]
_INVISIBLE = re.compile(
    "[" + "".join(f"{chr(a)}-{chr(b)}" for a, b in _INVISIBLE_RANGES) + "]"
)


# ── Normalisation ─────────────────────────────────────────────────────────────

def norm(name: str) -> str:
    """Clé de correspondance robuste : NFC, sans bidi, sans espaces/underscores, minuscule."""
    s = unicodedata.normalize("NFC", name)
    s = _INVISIBLE.sub("", s)
    s = re.sub(r"\.html$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"[_\s]+", "", s)
    return s.lower()


def slugify(text: str) -> str:
    """Repli pour les ids manquants/non ASCII."""
    s = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-z0-9]+", "-", s.lower())
    return s.strip("-") or "sermon"


# ── Index des fichiers source ─────────────────────────────────────────────────

def build_index(folder: Path, use_stem: bool) -> dict[str, Path]:
    idx: dict[str, Path] = {}
    if not folder.exists():
        return idx
    pattern = "*.pdf" if use_stem else "*.html"
    for p in sorted(folder.glob(pattern)):
        key = norm(p.stem if use_stem else p.name)
        idx.setdefault(key, p)  # garde le premier en cas de quasi-doublon
    return idx


# ── Extraction de la date de création d'un PDF ────────────────────────────────

def pdf_date(pdf_path: Path) -> tuple[str | None, str]:
    """Retourne (YYYY-MM-DD | None, source)."""
    # 1. Métadonnées via PyMuPDF
    try:
        import fitz  # type: ignore
        doc = fitz.open(str(pdf_path))
        meta = doc.metadata or {}
        doc.close()
        raw = meta.get("creationDate") or meta.get("modDate") or ""
        m = re.search(r"D:(\d{4})(\d{2})(\d{2})", raw)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}", "meta"
    except Exception:
        pass
    # 2. Regex sur les octets bruts (sans dépendance)
    try:
        data = pdf_path.read_bytes()
        m = re.search(rb"/(?:CreationDate|ModDate)\s*\(D:(\d{4})(\d{2})(\d{2})", data)
        if m:
            return f"{m.group(1).decode()}-{m.group(2).decode()}-{m.group(3).decode()}", "raw"
    except Exception:
        pass
    # 3. Repli : date de modification du fichier
    try:
        ts = pdf_path.stat().st_mtime
        return datetime.date.fromtimestamp(ts).isoformat(), "mtime"
    except Exception:
        return None, "none"


def copy_with_retry(src: Path, dst: Path, attempts: int = 6) -> bool:
    """Copie tolérante aux verrous transitoires (watcher Vite) : quelques essais."""
    for _ in range(attempts):
        try:
            shutil.copy2(src, dst)
            return True
        except PermissionError:
            time.sleep(0.3)
    return False


# ── Programme principal ───────────────────────────────────────────────────────

def main() -> None:
    # Console Windows : forcer UTF-8 pour les caractères accentués/arabes/box-drawing
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    in_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else PUB_JSON
    if not in_path.exists():
        print(f"Catalogue introuvable : {in_path}")
        sys.exit(1)

    entries = json.loads(in_path.read_text(encoding="utf-8"))
    html_idx = build_index(SRC_HTML, use_stem=False)
    pdf_idx = build_index(SRC_PDFDIR, use_stem=True)
    OUT_HTML.mkdir(parents=True, exist_ok=True)

    print(f"\n{len(entries)} entrées · {len(html_idx)} HTML bruts · {len(pdf_idx)} PDF\n")

    out: list[dict] = []
    st = {"fr_ok": 0, "fr_miss": 0, "ar_ok": 0, "ar_miss": 0,
          "d_meta": 0, "d_raw": 0, "d_mtime": 0, "d_none": 0}
    missing: list[str] = []

    for e in entries:
        sid = e.get("id") or ""
        if not re.fullmatch(r"[a-z0-9-]+", sid):
            sid = slugify(e.get("titre_fr") or e.get("titre_ar") or "sermon")

        new: dict = {
            "id": sid,
            "titre_fr": e.get("titre_fr", ""),
            "titre_ar": e.get("titre_ar", ""),
        }

        title_field = {"fr": "titre_fr", "ar": "titre_ar"}
        for lang, urlkey in (("fr", "url_fr"), ("ar", "url_ar")):
            title = e.get(title_field[lang], "")
            url = e.get(urlkey)
            target = OUT_HTML / f"{sid}.{lang}.html"
            # Résolution par TITRE (robuste), repli sur le nom d'URL d'origine
            src = html_idx.get(norm(title))
            if not src and url:
                src = html_idx.get(norm(url.split("/")[-1]))

            if src and src.exists():
                if copy_with_retry(src, target):
                    new[urlkey] = f"sermons_html/{sid}.{lang}.html"
                    st[f"{lang}_ok"] += 1
                else:
                    st[f"{lang}_miss"] += 1
                    missing.append(f"  [{lang.upper()} VERROU] {sid}  ←  {src.name}")
            elif target.exists():  # déjà publié (run précédent)
                new[urlkey] = f"sermons_html/{sid}.{lang}.html"
                st[f"{lang}_ok"] += 1
            elif title or url:
                st[f"{lang}_miss"] += 1
                missing.append(f"  [{lang.upper()} absent] {sid}  ←  {title!r}")

        # Date : conserver si déjà présente, sinon depuis le PDF source
        if e.get("publishedAt"):
            new["publishedAt"] = e["publishedAt"]
        else:
            date, source = None, "none"
            for title in (e.get("titre_fr"), e.get("titre_ar")):
                if not title:
                    continue
                pdf = pdf_idx.get(norm(title))
                if pdf:
                    date, source = pdf_date(pdf)
                    break
            st[f"d_{source}"] += 1
            if date:
                new["publishedAt"] = date

        out.append(new)

    out.sort(key=lambda x: x["titre_fr"].lower())
    PUB_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── Rapport ───────────────────────────────────────────────────────────────
    print("─" * 60)
    print(f"  FR : {st['fr_ok']} publiés · {st['fr_miss']} absents")
    print(f"  AR : {st['ar_ok']} publiés · {st['ar_miss']} absents")
    print(f"  Dates : {st['d_meta']} (métadonnées) · {st['d_raw']} (brut) · "
          f"{st['d_mtime']} (mtime) · {st['d_none']} (aucune)")
    print(f"  → public/sermons.json réécrit ({len(out)} entrées)")
    print(f"  → public/sermons_html/ ({sum(1 for _ in OUT_HTML.glob('*.html'))} fichiers)")
    print("─" * 60)
    if missing:
        print("\nRéférences non résolues :")
        print("\n".join(missing))
    else:
        print("\n  ✓  Toutes les références FR/AR sont résolues.")
    print()


if __name__ == "__main__":
    main()
