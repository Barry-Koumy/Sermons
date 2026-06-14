import type { Sermon } from '../types/sermon';
import { formatDualDate } from '../utils/dates';
import { t } from '../i18n/translations';

export type SermonBadge = 'recent' | 'favorite' | 'downloaded';

const BADGE_STYLES: Record<SermonBadge, { labelKey: 'badgeRecent' | 'badgeFavorite' | 'badgeDownloaded'; className: string }> = {
  recent: { labelKey: 'badgeRecent', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  favorite: { labelKey: 'badgeFavorite', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  downloaded: { labelKey: 'badgeDownloaded', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

interface SermonCardProps {
  sermon: Sermon;
  lang?: 'fr' | 'ar';
  featured?: boolean;
  isFavorite?: boolean;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  badges?: SermonBadge[];
  onToggleFavorite?: () => void;
  onDownload?: () => void;
  onRemoveDownload?: () => void;
  onClick?: () => void;
}

export default function SermonCard({
  sermon,
  lang = 'fr',
  featured = false,
  isFavorite = false,
  isDownloaded = false,
  isDownloading = false,
  badges = [],
  onToggleFavorite,
  onDownload,
  onRemoveDownload,
  onClick,
}: SermonCardProps) {
  const title = (lang === 'ar' && sermon.titleAr) || sermon.titleFr;
  const author = sermon.author?.trim() || t(lang, 'telegramSource');
  const date = formatDualDate(sermon.publishedAt, lang);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    if (isDownloaded && onRemoveDownload) {
      onRemoveDownload();
    } else if (!isDownloaded) {
      onDownload?.();
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl cursor-pointer transition-shadow active:bg-gray-50 dark:active:bg-gray-750 ${
        featured ? 'col-span-2 p-5 shadow-md hover:shadow-lg' : 'p-3 shadow-sm hover:shadow-md'
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {featured ? (
          <span className="text-xs font-semibold text-white bg-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
            {t(lang, 'featured')}
          </span>
        ) : (
          <span />
        )}
        {/* Signet / Favori */}
        <button
          onClick={handleFavorite}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="p-1 -m-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 ${isFavorite ? 'text-emerald-600' : 'text-gray-400'}`}
            fill={isFavorite ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      <h3
        className={`font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1 ${
          featured ? 'text-lg' : 'text-sm line-clamp-2'
        }`}
      >
        {title}
      </h3>

      <p className={`text-gray-500 dark:text-gray-400 ${featured ? 'text-sm' : 'text-xs line-clamp-1'}`}>
        {author}
      </p>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[b].className}`}
            >
              {t(lang, BADGE_STYLES[b].labelKey)}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end justify-between gap-2 mt-1">
        {date ? <p className="text-xs text-gray-400">{date}</p> : <span />}
        {/* Télécharger / Supprimer */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          aria-label={isDownloading ? 'Téléchargement en cours' : isDownloaded && onRemoveDownload ? 'Supprimer le téléchargement' : isDownloaded ? 'Téléchargé' : 'Télécharger pour lecture hors ligne'}
          className="p-1 -m-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0 disabled:cursor-default"
        >
          {isDownloading ? (
            <span className="block w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          ) : isDownloaded && onRemoveDownload ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ) : isDownloaded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
