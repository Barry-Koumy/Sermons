import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Sermon } from '../types/sermon';
import SermonCard, { type SermonBadge } from '../components/SermonCard';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/translations';
import LanguageToggle from '../components/LanguageToggle';
import { useSermons } from '../hooks/useSermons';

type Filter = 'all' | 'recent' | 'downloaded' | 'favorites';

const FILTERS: { key: Filter; labelKey: 'filterAll' | 'filterRecent' | 'filterDownloaded' | 'filterFavorites' }[] = [
  { key: 'all', labelKey: 'filterAll' },
  { key: 'recent', labelKey: 'filterRecent' },
  { key: 'downloaded', labelKey: 'filterDownloaded' },
  { key: 'favorites', labelKey: 'filterFavorites' },
];

export default function LibraryScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const lang = useAppStore((s) => s.lang);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const downloads = useAppStore((s) => s.downloads);
  const downloadSermon = useAppStore((s) => s.downloadSermon);
  const removeDownload = useAppStore((s) => s.removeDownload);
  const lastRead = useAppStore((s) => s.lastRead);
  const { t } = useT();

  const { sermons } = useSermons();

  const badgesFor = (s: Sermon): SermonBadge[] => {
    const b: SermonBadge[] = [];
    if (s.id in lastRead) b.push('recent');
    if (favorites.includes(s.id)) b.push('favorite');
    if (s.id in downloads) b.push('downloaded');
    return b;
  };

  const hasContent = (s: Sermon) =>
    lang === 'ar'
      ? /[؀-ۿ]/.test(s.titleAr || '') && (!!s.contentAr || !!s.htmlUrlAr)
      : !!s.contentFr || !!s.htmlUrlFr;

  const filtered = sermons
    .filter((s) => {
      if (!hasContent(s)) return false;
      if (filter === 'recent') return s.id in lastRead;
      if (filter === 'downloaded') return s.id in downloads;
      if (filter === 'favorites') return favorites.includes(s.id);
      // « Tous » : uniquement les sermons de la collection (récents, favoris ou téléchargés)
      return badgesFor(s).length > 0;
    })
    .sort((a, b) =>
      filter === 'recent'
        ? new Date(lastRead[b.id]).getTime() - new Date(lastRead[a.id]).getTime()
        : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 md:px-6 lg:px-8 pt-12 lg:pt-6 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="w-full max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white text-center">{t('myLibrary')}</h1>
          <LanguageToggle className="mt-3" />
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 px-4 md:px-6 lg:px-8 py-2 border-b border-gray-100 dark:border-gray-700">
        <div className="w-full max-w-6xl mx-auto overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Liste des sermons */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 bg-[#F5F5F5] dark:bg-gray-900">
        <div className="w-full max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('noSermonFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filtered.map((s) => (
                <SermonCard
                  key={s.id}
                  sermon={s}
                  lang={lang}
                  isFavorite={favorites.includes(s.id)}
                  isDownloaded={s.id in downloads}
                  badges={filter === 'all' ? badgesFor(s) : []}
                  onToggleFavorite={() => toggleFavorite(s.id)}
                  onDownload={() => downloadSermon(s, lang)}
                  onRemoveDownload={s.id in downloads ? () => removeDownload(s.id) : undefined}
                  onClick={() => navigate(`/reader/${s.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
