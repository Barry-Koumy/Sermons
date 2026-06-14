import { useCallback, useState } from 'react';
import type { Sermon } from '../types/sermon';
import { useAppStore, type DownloadContents, type Lang } from '../store/useAppStore';
import { fetchText } from '../utils/http';
import { prepareHtmlContent } from '../utils/sermonHtml';

/**
 * Téléchargement (sauvegarde hors-ligne) d'un sermon **avec son contenu réel**.
 *
 * Les sermons sont des fichiers HTML distants : leur texte n'est pas dans le
 * catalogue. Avant d'enregistrer, on récupère donc le HTML (`fetchText`, qui passe
 * par le HTTP natif sur mobile) et on le pré-traite comme à l'affichage. Sans cela,
 * le store enregistrait un contenu vide → « Contenu non disponible » hors-ligne.
 *
 * Les **deux langues** (FR + AR) sont récupérées et enregistrées : l'app étant
 * bilingue, basculer FR/AR hors-ligne doit fonctionner. Une langue qui échoue
 * n'empêche pas d'enregistrer l'autre (`allSettled`).
 *
 * @returns `download(sermon, lang, preparedInnerHtml?)` — si le HTML de la langue
 *          courante est déjà chargé (lecteur), le passer évite une requête ; l'autre
 *          langue est tout de même récupérée. `pendingIds` liste les sermons en cours.
 */
export function useDownloadSermon() {
  const downloadSermon = useAppStore((s) => s.downloadSermon);
  const downloads = useAppStore((s) => s.downloads);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const download = useCallback(
    async (sermon: Sermon, lang: Lang, preparedInnerHtml?: string | null) => {
      if (sermon.id in downloads) return; // déjà enregistré

      // Ancien format texte (aucune URL HTML) : rien à récupérer, le catalogue suffit.
      if (!sermon.htmlUrlFr && !sermon.htmlUrlAr) {
        downloadSermon(sermon, lang);
        return;
      }

      setPendingIds((prev) => {
        if (prev.has(sermon.id)) return prev;
        const next = new Set(prev);
        next.add(sermon.id);
        return next;
      });

      // Récupère et pré-traite le HTML d'une langue (réutilise le HTML déjà chargé
      // pour la langue courante afin d'éviter une requête superflue).
      const fetchLang = async (l: Lang): Promise<string | undefined> => {
        const url = l === 'ar' ? sermon.htmlUrlAr : sermon.htmlUrlFr;
        if (!url) return undefined;
        if (l === lang && preparedInnerHtml) return preparedInnerHtml;
        const raw = await fetchText(url);
        return prepareHtmlContent(raw).innerHtml;
      };

      try {
        const [fr, ar] = await Promise.allSettled([fetchLang('fr'), fetchLang('ar')]);
        const contents: DownloadContents = {
          fr: fr.status === 'fulfilled' ? fr.value : undefined,
          ar: ar.status === 'fulfilled' ? ar.value : undefined,
        };
        // On n'enregistre que si au moins une langue a été récupérée
        // (échec réseau total → bouton « non téléchargé », l'utilisateur réessaie).
        if (contents.fr || contents.ar) {
          downloadSermon(sermon, lang, contents);
        }
      } finally {
        setPendingIds((prev) => {
          if (!prev.has(sermon.id)) return prev;
          const next = new Set(prev);
          next.delete(sermon.id);
          return next;
        });
      }
    },
    [downloadSermon, downloads]
  );

  return { download, pendingIds };
}
