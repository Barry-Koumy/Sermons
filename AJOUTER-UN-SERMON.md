# Ajouter un sermon — guide express

> Vous travaillez **en local** (sur votre ordinateur). Les scripts convertissent les
> PDF en pages HTML et mettent à jour le catalogue ; un `git push` suffit ensuite :
> le site se reconstruit tout seul, et l'app mobile voit les nouveaux sermons **sans
> réinstallation** (elle lit le catalogue en ligne).

## Pré-requis (une seule fois)

```bash
pip install pymupdf
```

## ⭐ Le plus simple : par clic (aucune saisie, pas d'arabe à taper)

Utilisez **`Ajouter un sermon.bat`** (dans `sermons-app/`), au choix :

- **Double-cliquez** dessus → une fenêtre vous fait choisir les **2 PDF** (le français
  et l'arabe du même sermon).
- **OU glissez** les 2 PDF directement sur l'icône du `.bat`.

C'est tout. L'outil **détecte tout seul** lequel est l'arabe (vous n'avez rien à taper,
surtout pas d'arabe), prend les titres depuis les noms des fichiers, convertit, met à
jour le catalogue, puis vous propose de **publier en ligne en 1 clic** (Oui/Non).

> Le titre arabe vient du **nom du fichier PDF arabe** (qui est déjà en arabe). Si un
> nom n'est pas correct, renommez simplement le fichier avant de le déposer.

## La méthode rapide en ligne de commande : 1 PDF français + 1 PDF arabe

Depuis le dossier `sermons-app/`, **une seule commande** :

```bash
python add_sermon.py "chemin/vers/LE_PDF_FR.pdf" "chemin/vers/LE_PDF_AR.pdf"
```

Le script :
- convertit les deux PDF en HTML,
- crée l'identifiant + la date (depuis le PDF français),
- écrit `public/sermons_html/<id>.fr.html` et `<id>.ar.html`,
- met à jour `public/sermons.json` (le catalogue).

Puis on publie :

```bash
git add public/
git commit -m "ajout d'un sermon"
git push
```

C'est tout. Le site (https://barry-koumy.github.io/Sermons/) se reconstruit
automatiquement en 1–2 minutes.

### Forcer les titres (si les noms de fichiers ne conviennent pas)

Par défaut, les titres sont déduits des noms de fichiers. Pour les imposer :

```bash
python add_sermon.py "FR.pdf" "AR.pdf" --titre-fr "LE BESOIN ABSOLU D'ALLAH" --titre-ar "الافتقار إلى الله"
```

> Relancer la commande avec le **même titre** met à jour un sermon existant
> (au lieu d'en créer un doublon).

## Plusieurs sermons d'un coup (import en masse)

Déposez tous les PDF (FR et AR) dans `../semons/`, puis, depuis `sermons-app/` :

```bash
python convert_pdf.py ../semons     # 1. PDF → HTML
python separer_langue.py            # 2. trie FR / AR
python auto_mapping.py              # 3. apparie FR ↔ AR (vérifier mapping.json)
python trier_sermons.py             # 4. valide les paires + bâtit le catalogue
python publish.py                   # 5. publie sous public/ (noms stables + dates)
npm run build && npm run preview    # 6. vérif locale → http://localhost:4173/
git add public/ && git commit -m "contenu : nouveaux sermons" && git push   # 7.
```

## Bon à savoir

- Seul le contenu **propre** de `public/` est versionné. Le dossier `../semons/`
  (PDF + HTML bruts) ne part **jamais** sur GitHub.
- `publish.py` est **idempotent** : on peut le relancer sans risque.
- Les visiteurs peuvent proposer des sermons via l'écran **« Ajouter ou participer »**
  de l'app (formulaire → email avec le PDF) ; vous les traitez ensuite avec
  `add_sermon.py`.
- Détails complets du pipeline : voir [`PIPELINE.md`](./PIPELINE.md).
