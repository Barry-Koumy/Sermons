import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Sermon } from '../types/sermon';
import SermonCard from '../components/SermonCard';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/translations';
import LanguageToggle from '../components/LanguageToggle';
import { useSermons } from '../hooks/useSermons';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const lang = useAppStore((s) => s.lang);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const downloads = useAppStore((s) => s.downloads);
  const downloadSermon = useAppStore((s) => s.downloadSermon);
  const { t, dir } = useT();

  const { sermons, loading, error } = useSermons();

  const hasContent = (s: Sermon) =>
    lang === 'ar'
      ? /[؀-ۿ]/.test(s.titleAr || '') && (!!s.contentAr || !!s.htmlUrlAr)
      : !!s.contentFr || !!s.htmlUrlFr;

  const filtered = sermons
    .filter(
      (s) =>
        hasContent(s) &&
        (!search ||
          s.titleFr.toLowerCase().includes(search.toLowerCase()) ||
          s.titleAr.includes(search) ||
          s.author.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Le sermon le plus récent est mis en avant uniquement en vue par défaut
  const showFeatured = !search && filtered.length > 0;

  const renderCard = (sermon: Sermon, featured = false) => (
    <SermonCard
      key={sermon.id}
      sermon={sermon}
      lang={lang}
      featured={featured}
      isFavorite={favorites.includes(sermon.id)}
      isDownloaded={sermon.id in downloads}
      onToggleFavorite={() => toggleFavorite(sermon.id)}
      onDownload={() => downloadSermon(sermon, lang)}
      onClick={() => navigate(`/reader/${sermon.id}`)}
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 md:px-6 lg:px-8 pt-12 lg:pt-6 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="w-full max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            {t('appTitle')}
          </h1>

          {/* Barre de recherche */}
          <div className="relative" dir={dir}>
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full ps-9 pe-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Sélecteur de langue */}
          <LanguageToggle className="mt-3" />
        </div>
      </div>

      {/* Liste des sermons */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 bg-[#F5F5F5] dark:bg-gray-900">
        <div className="w-full max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
              <p className="text-red-500 text-sm font-medium">{t('loadError')}</p>
              <p className="text-gray-400 text-xs">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('noSermonFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {showFeatured
                ? [renderCard(filtered[0], true), ...filtered.slice(1).map((s) => renderCard(s))]
                : filtered.map((s) => renderCard(s))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
