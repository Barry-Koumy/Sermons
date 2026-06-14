import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Sermon } from '../types/sermon';

export type Lang = 'fr' | 'ar';

export interface DownloadedSermon {
  id: string;
  title: string;
  content: string;
  /** true si content contient du HTML (sermon converti depuis PDF). */
  isHtml?: boolean;
  lang: Lang;
  category: Category;
  author: string;
  publishedAt: string;
  savedAt: string;
}

interface AppState {
  lang: Lang;
  favorites: string[];
  downloads: Record<string, DownloadedSermon>;
  // Dernière ouverture de chaque sermon dans le lecteur (ISO), pour le filtre « Lecture récente »
  lastRead: Record<string, string>;
  setLang: (lang: Lang) => void;
  toggleFavorite: (id: string) => void;
  downloadSermon: (sermon: Sermon, lang: Lang, htmlContent?: string) => void;
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

      downloadSermon: (sermon, lang, htmlContent) =>
        set((state) => ({
          downloads: {
            ...state.downloads,
            [sermon.id]: {
              id: sermon.id,
              title: lang === 'ar' ? sermon.titleAr : sermon.titleFr,
              content: htmlContent ?? (lang === 'ar' ? sermon.contentAr : sermon.contentFr) ?? '',
              isHtml: !!htmlContent,
              lang,
              category: sermon.category,
              author: sermon.author,
              publishedAt: sermon.publishedAt,
              savedAt: new Date().toISOString(),
            },
          },
        })),

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
