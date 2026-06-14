import { useCallback, useState } from 'react';
import type { Sermon } from '../types/sermon';
import { useAppStore, type Lang } from '../store/useAppStore';
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
 * @returns `download(sermon, lang, preparedInnerHtml?)` — si le HTML est déjà chargé
 *          (lecteur), le passer évite une requête superflue ; sinon il est récupéré.
 *          `pendingIds` liste les sermons en cours de récupération.
 */
export function useDownloadSermon() {
  const downloadSermon = useAppStore((s) => s.downloadSermon);
  const downloads = useAppStore((s) => s.downloads);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const download = useCallback(
    async (sermon: Sermon, lang: Lang, preparedInnerHtml?: string | null) => {
      if (sermon.id in downloads) return; // déjà enregistré

      const htmlUrl = lang === 'ar' ? sermon.htmlUrlAr : sermon.htmlUrlFr;

      // Ancien format texte (pas d'URL HTML) : rien à récupérer.
      if (!htmlUrl) {
        downloadSermon(sermon, lang);
        return;
      }
      // HTML déjà chargé (depuis le lecteur) : enregistrement direct.
      if (preparedInnerHtml) {
        downloadSermon(sermon, lang, preparedInnerHtml);
        return;
      }

      setPendingIds((prev) => {
        if (prev.has(sermon.id)) return prev;
        const next = new Set(prev);
        next.add(sermon.id);
        return next;
      });
      try {
        const raw = await fetchText(htmlUrl);
        const { innerHtml } = prepareHtmlContent(raw);
        downloadSermon(sermon, lang, innerHtml);
      } catch {
        // Échec réseau : on n'enregistre rien (mieux qu'un contenu vide trompeur).
        // Le bouton revient à l'état « non téléchargé » ; l'utilisateur peut réessayer.
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
