"""
convert_pdf.py
Converts a folder of PDF files (sermons) into clean HTML documents,
then updates the central sermons.json index.

Usage:
    python convert_pdf.py <pdf_folder> [output_folder] [json_path]

    pdf_folder   : folder containing the .pdf files
    output_folder: where to write the .html files  (default: <pdf_folder>/html_output)
    json_path    : path to sermons.json to update   (default: sermons-app/public/sermons.json
                   relative to this script)

Tuning header/footer exclusion:
    Change HEADER_MARGIN and FOOTER_MARGIN (in PDF points, 1 pt ≈ 0.35 mm).
    The defaults (60 pt each ≈ 2.1 cm) skip page numbers and social-media footers.

Requirements:
    pip install pymupdf
"""

import fitz  # PyMuPDF
import os
import re
import sys
import html as html_lib
import json
from pathlib import Path


# ─── Margin constants (pt) ────────────────────────────────────────────────────
# Increase these values if header/footer text still leaks into the output.
HEADER_MARGIN = 60   # ignore text whose top-left y < this value
FOOTER_MARGIN = 60   # ignore text whose bottom-right y > (page_height - this)

# Regex patterns always discarded regardless of position (social links, page numbers)
_JUNK_PATTERNS = re.compile(
    r"(t\.me/|telegram|rejoignez[- ]nous|youtube\.com|facebook\.com"
    r"|@\w+|www\.|https?://"
    r"|\bpage\s*\d+\b"        # "page 1", "page 12"
    r"|^\s*\d+\s*$"           # lone digits (page numbers standing alone)
    r"|خطب الجمعة"            # Arabic running header
    r")",
    re.IGNORECASE,
)


# ─── Color helpers ────────────────────────────────────────────────────────────

def color_int_to_rgb(color_int: int) -> tuple[int, int, int]:
    r = (color_int >> 16) & 0xFF
    g = (color_int >> 8) & 0xFF
    b = color_int & 0xFF
    return r, g, b


def classify_color(r: int, g: int, b: int) -> str | None:
    if r > 150 and g < 100 and b < 100:
        return "red"
    if g > 150 and r < 100 and b < 100:
        return "green"
    return None


# ─── Span / line processing ───────────────────────────────────────────────────

def is_bold(font_name: str, flags: int) -> bool:
    if "Bold" in font_name or "bold" in font_name:
        return True
    return bool(flags & 16)


def process_span(span: dict) -> str:
    text = span.get("text", "")
    if not text:
        return ""
    font_name = span.get("font", "")
    flags     = span.get("flags", 0)
    color_int = span.get("color", 0)

    r, g, b     = color_int_to_rgb(color_int)
    color_class = classify_color(r, g, b)
    bold        = is_bold(font_name, flags)

    fragment = html_lib.escape(text)
    if bold:
        fragment = f"<strong>{fragment}</strong>"
    if color_class == "red":
        fragment = f'<span class="texte-rouge">{fragment}</span>'
    elif color_class == "green":
        fragment = f'<span class="texte-vert">{fragment}</span>'
    return fragment


def process_line(line: dict) -> str:
    return "".join(process_span(s) for s in line.get("spans", []))


# ─── Title detection ──────────────────────────────────────────────────────────

def is_title_line(text: str) -> bool:
    stripped = text.strip()
    if not stripped or len(stripped) >= 60:
        return False
    letters = [c for c in stripped if c.isalpha()]
    return bool(letters) and all(c == c.upper() for c in letters)


# ─── Header / footer guard ────────────────────────────────────────────────────

def block_is_in_margin(block: dict, page_height: float) -> bool:
    """True when the block sits entirely within the header or footer margins."""
    x0, y0, x1, y1 = block["bbox"]
    if y0 < HEADER_MARGIN:
        return True
    if y1 > (page_height - FOOTER_MARGIN):
        return True
    return False


def block_is_junk(block: dict) -> bool:
    """True when the block's full text matches a known junk pattern."""
    if block.get("type") != 0:
        return False
    text = " ".join(
        s.get("text", "")
        for line in block.get("lines", [])
        for s in line.get("spans", [])
    )
    return bool(_JUNK_PATTERNS.search(text))


# ─── Block → HTML ─────────────────────────────────────────────────────────────

def process_block(block: dict) -> str:
    if block.get("type") != 0:
        return ""
    lines = block.get("lines", [])
    if not lines:
        return ""

    plain_lines, html_lines = [], []
    for line in lines:
        plain = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
        plain_lines.append(plain)
        html_lines.append(process_line(line))

    full_plain = " ".join(plain_lines).strip()
    if not full_plain:
        return ""

    inner_html = " ".join(html_lines)
    if is_title_line(full_plain):
        return f'<div class="titre-principal">{inner_html}</div>\n'
    return f"<p>{inner_html}</p>\n"


# ─── PDF → HTML ───────────────────────────────────────────────────────────────

def pdf_to_html(pdf_path: Path, output_path: Path) -> None:
    doc   = fitz.open(str(pdf_path))
    parts: list[str] = []

    for page_index, page in enumerate(doc):
        if page_index > 0:
            parts.append('<div class="page-break" aria-hidden="true"></div>\n')

        page_height = page.rect.height
        blocks = page.get_text(
            "dict",
            flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES,
        )["blocks"]

        for block in blocks:
            # Skip header/footer zones and junk patterns
            if block_is_in_margin(block, page_height):
                continue
            if block_is_junk(block):
                continue
            fragment = process_block(block)
            if fragment:
                parts.append(fragment)

    doc.close()

    title    = html_lib.escape(pdf_path.stem)
    body     = "    ".join(parts)

    full_html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="pdf-container">
    {body}
  </div>
</body>
</html>
"""
    output_path.write_text(full_html, encoding="utf-8")
    print(f"  ✓  {pdf_path.name}  →  {output_path.name}")


# ─── sermons.json helpers ─────────────────────────────────────────────────────

def make_id(stem: str) -> str:
    """
    Turn a file stem into a URL-safe id.
    'LE BESOIN ABSOLU D'ALLAH_' → 'le-besoin-absolu-d-allah'
    """
    slug = stem.lower()
    slug = re.sub(r"[''`]", "-", slug)          # apostrophes → dash
    slug = re.sub(r"[^a-z0-9؀-ۿ]+", "-", slug)  # keep Arabic too
    slug = slug.strip("-")
    return slug


def update_sermons_json(json_path: Path, entries: list[dict]) -> None:
    """Merge new entries into sermons.json (keyed on 'id'; no duplicates)."""
    existing: list[dict] = []
    if json_path.exists():
        try:
            existing = json.loads(json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = []

    # Build lookup by id for fast upsert
    index = {e["id"]: e for e in existing}
    for entry in entries:
        index[entry["id"]] = entry  # overwrite or insert

    merged = list(index.values())
    # Sort French/Arabic alphabetically by titre
    merged.sort(key=lambda e: e["titre"].lower())

    json_path.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n  ✓  sermons.json mis à jour ({len(merged)} entrées) → {json_path}")


# ─── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage : python convert_pdf.py <dossier_pdf> [dossier_sortie] [sermons.json]")
        sys.exit(1)

    input_dir  = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else input_dir / "html_output"

    # Default json path: sermons-app/public/sermons.json next to this script
    default_json = Path(__file__).parent / "public" / "sermons.json"
    json_path = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else default_json

    if not input_dir.exists():
        print(f"Erreur : le dossier « {input_dir} » n'existe pas.")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Copy style.css next to the HTML files if not already present
    style_src  = Path(__file__).parent / "style.css"
    style_dest = output_dir / "style.css"
    if style_src.exists() and not style_dest.exists():
        import shutil
        shutil.copy(style_src, style_dest)
        print(f"  ✓  style.css copié dans {output_dir}")

    pdf_files = sorted(input_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"Aucun fichier PDF trouvé dans « {input_dir} ».")
        sys.exit(0)

    print(f"\nConversion de {len(pdf_files)} fichier(s) PDF…\n")

    errors  = 0
    entries = []

    for pdf_path in pdf_files:
        # Preserve exact original filename (stem only — no folder prefix)
        out_name = pdf_path.stem + ".html"
        out_path = output_dir / out_name
        try:
            pdf_to_html(pdf_path, out_path)
            entries.append({
                "id":    make_id(pdf_path.stem),
                "titre": pdf_path.stem.strip("_ "),
                "url":   out_name,
            })
        except Exception as exc:
            print(f"  ✗  {pdf_path.name} — erreur : {exc}")
            errors += 1

    print(f"\n{'─'*50}")
    print(f"Terminé. {len(pdf_files) - errors}/{len(pdf_files)} fichier(s) convertis.")
    print(f"Dossier de sortie : {output_dir}")

    if entries:
        update_sermons_json(json_path, entries)


if __name__ == "__main__":
    main()
