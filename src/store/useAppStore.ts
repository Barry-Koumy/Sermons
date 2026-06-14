import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Sermon } from '../types/sermon';

export type Lang = 'fr' | 'ar';

export interface DownloadedSermon {
  id: string;
  category: Category;
  author: string;
  publishedAt: string;
  savedAt: string;
  /** Langue principale au moment du téléchargement (sens de lecture par défaut). */
  lang: Lang;
  /** true si le contenu enregistré est du HTML (sermon converti depuis PDF). */
  isHtml?: boolean;
  // ── Contenu bilingue (les deux langues sont enregistrées pour la lecture hors-ligne) ──
  titleFr?: string;
  titleAr?: string;
  contentFr?: string;
  contentAr?: string;
  // ── Champs hérités (anciens téléchargements mono-langue) — repli de compatibilité ──
  /** @deprecated remplacé par titleFr/titleAr ; conservé pour lire les anciens enregistrements. */
  title?: string;
  /** @deprecated remplacé par contentFr/contentAr ; conservé pour lire les anciens enregistrements. */
  content?: string;
}

/** Contenu HTML pré-traité par langue, transmis au téléchargement. */
export type DownloadContents = { fr?: string; ar?: string };

interface AppState {
  lang: Lang;
  favorites: string[];
  downloads: Record<string, DownloadedSermon>;
  // Dernière ouverture de chaque sermon dans le lecteur (ISO), pour le filtre « Lecture récente »
  lastRead: Record<string, string>;
  setLang: (lang: Lang) => void;
  toggleFavorite: (id: string) => void;
  downloadSermon: (sermon: Sermon, lang: Lang, contents?: DownloadContents) => void;
  removeDownload: (id: string) => void;
  markRead: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'fr',
      favorites: [],
      downloads: {},
      lastRead: {},

      setLang: (lang) => set({ lang }),

      markRead: (id) =>
        set((state) => ({
          lastRead: { ...state.lastRead, [id]: new Date().toISOString() },
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [...state.favorites, id],
        })),

      downloadSermon: (sermon, lang, contents) =>
        set((state) => {
          // contents fourni → sermon HTML (les deux langues récupérées) ;
          // sinon → ancien format texte inline issu du catalogue.
          const isHtml = !!contents;
          const contentFr = contents ? contents.fr : sermon.contentFr;
          const contentAr = contents ? contents.ar : sermon.contentAr;
          const primary = lang === 'ar' ? contentAr : contentFr;
          return {
            downloads: {
              ...state.downloads,
              [sermon.id]: {
                id: sermon.id,
                category: sermon.category,
                author: sermon.author,
                publishedAt: sermon.publishedAt,
                savedAt: new Date().toISOString(),
                lang,
                isHtml,
                titleFr: sermon.titleFr,
                titleAr: sermon.titleAr,
                contentFr,
                contentAr,
                // Compatibilité descendante (lecture par d'éventuelles anciennes données).
                title: lang === 'ar' ? sermon.titleAr : sermon.titleFr,
                content: primary ?? '',
              },
            },
          };
        }),

      removeDownload: (id) =>
        set((state) => {
          const downloads = { ...state.downloads };
          delete downloads[id];
          return { downloads };
        }),
    }),
    { name: 'sermons-app-prefs' }
  )
);
