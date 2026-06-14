# Pipeline d'ajout de sermons (workflow local)

L'administration se fait **en local** sur votre ordinateur : les scripts Python
convertissent les PDF en HTML, génèrent le catalogue, puis vous poussez sur GitHub.
GitHub Pages reconstruit et publie l'application automatiquement.

Les visiteurs, eux, proposent des sermons via l'écran **« Ajouter ou participer »**
de l'app (formulaire → email avec le PDF en pièce jointe). Vous traitez ensuite ces
propositions avec ce même pipeline.

## Dossiers

```
../semons/                  ← zone de travail LOCALE (hors dépôt git)
  *.pdf                       PDF sources (FR et AR)
  html_output/                HTML bruts (sortie de convert_pdf.py)
  sermons_bruts_fr/  _ar/     HTML triés par langue
  sermons_html/               HTML appariés FR/AR (noms d'origine)
sermons-app/public/
  sermons_html/<id>.fr.html   HTML PROPRES servis par l'app (publish.py)
  sermons.json                catalogue lu par l'app
```

## Étapes

Depuis `sermons-app/` :

```bash
# 1. Convertir les PDF en HTML (PyMuPDF). Déposez d'abord vos PDF dans ../semons/
python convert_pdf.py ../semons

# 2. Séparer les HTML par langue (français / arabe)
python separer_langue.py

# 3. Apparier automatiquement FR ↔ AR (par taille) + retirer les doublons
python auto_mapping.py
#    → vérifiez/complétez mapping.json si besoin (paires douteuses : mapping_douteux.json)

# 4. Valider les paires, déplacer dans semons/sermons_html/ et bâtir le catalogue
python trier_sermons.py

# 5. PUBLIER : noms ASCII stables <id>.<lang>.html dans public/sermons_html/
#    + dates de création des PDF (publishedAt) + réécriture de public/sermons.json
python publish.py

# 6. Vérifier en local
npm run build && npm run preview     # http://localhost:4173/Sermons/

# 7. Déployer : commit + push → GitHub Pages reconstruit tout seul
git add public/ && git commit -m "contenu : nouveaux sermons" && git push
```

## Notes

- **`publish.py` est l'étape qui rend le catalogue lisible par l'app** : il retrouve
  chaque fichier par correspondance de nom normalisée (insensible aux marques bidi et
  à la normalisation Unicode arabe), le copie sous un nom ASCII stable, et renseigne la
  date. Relançable sans risque (idempotent).
- Dépendance des scripts PDF : `pip install pymupdf`.
- Le dossier `../semons/` (PDF + HTML bruts) **n'est jamais versionné** : seul le
  contenu propre de `public/` part sur GitHub.
- Pour que le formulaire visiteur envoie les emails, renseignez `VITE_WEB3FORMS_KEY`
  (voir `.env.example`) en local **et** comme secret GitHub Actions (déploiement).
