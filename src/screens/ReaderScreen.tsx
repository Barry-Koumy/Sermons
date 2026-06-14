import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useSermons } from '../hooks/useSermons';
import { formatDualDate } from '../utils/dates';
import { t } from '../i18n/translations';
import SermonContent, { extractSections } from '../components/SermonContent';
import { fetchText } from '../utils/http';

type Theme = 'light' | 'dark' | 'sepia';
type FontSize = 'sm' | 'md' | 'lg';

const fontSizeMap: Record<FontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const themeClasses: Record<Theme, string> = {
  light: 'bg-white text-gray-900',
  dark: 'bg-gray-900 text-gray-100',
  sepia: 'bg-amber-50 text-amber-900',
};

const SCROLL_KEY = (id: string) => `reader-scroll-${id}`;

// ─── Helpers HTML ────────────────────────────────────────────────────────────

/**
 * Extrait le HTML intérieur de .pdf-container depuis un document HTML complet.
 * Ajoute des ids aux .titre-principal pour permettre la navigation par sommaire.
 * Retourne { innerHtml, sections }.
 */
function prepareHtmlContent(rawHtml: string): { innerHtml: string; sections: string[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const container = doc.querySelector('.pdf-container') ?? doc.body;

  const sections: string[] = [];
  container.querySelectorAll<HTMLElement>('.titre-principal').forEach((el, i) => {
    sections.push(el.textContent?.trim() ?? '');
    el.id = `section-${i}`;
  });

  return { innerHtml: container.innerHTML, sections };
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function ReaderScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const globalLang = useAppStore((s) => s.lang);
  const setGlobalLang = useAppStore((s) => s.setLang);
  const downloads = useAppStore((s) => s.downloads);
  const downloadSermon = useAppStore((s) => s.downloadSermon);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const markRead = useAppStore((s) => s.markRead);

  const { sermons, loading: sermonsLoading } = useSermons();

  const [lang, setLangLocal] = useState<'fr' | 'ar'>(globalLang);
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [theme, setTheme] = useState<Theme>('light');
  const [tocOpen, setTocOpen] = useState(false);

  // État pour le contenu HTML chargé à distance
  const [htmlInner, setHtmlInner] = useState<string | null>(null);
  const [htmlSections, setHtmlSections] = useState<string[]>([]);
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [htmlError, setHtmlError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  const setLang = (l: 'fr' | 'ar') => {
    setLangLocal(l);
    setGlobalLang(l);
  };

  const sermon = sermons.find((s) => s.id === id);
  const downloaded = id ? downloads[id] : undefined;

  // Écran allumé pendant la lecture
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* ignoré */ }
    };
    acquire();
    const onVisibility = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release().catch(() => {});
    };
  }, []);

  // Historique de lecture
  useEffect(() => {
    if (id) markRead(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reprise de position de scroll
  useEffect(() => {
    if (!id) return;
    const saved = Number(localStorage.getItem(SCROLL_KEY(id)) ?? 0);
    if (saved > 0) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = saved;
      });
    }
  }, [id, htmlInner]); // relance aussi quand le HTML est prêt

  // ─── Chargement du HTML distant ────────────────────────────────
  useEffect(() => {
    const htmlUrl = sermon
      ? lang === 'ar' ? sermon.htmlUrlAr : sermon.htmlUrlFr
      : undefined;

    if (!htmlUrl) {
      setHtmlInner(null);
      setHtmlSections([]);
      setHtmlError(null);
      return;
    }

    let cancelled = false;
    setHtmlLoading(true);
    setHtmlInner(null);
    setHtmlError(null);

    fetchText(htmlUrl)
      .then((raw) => {
        if (cancelled) return;
        const { innerHtml, sections } = prepareHtmlContent(raw);
        setHtmlInner(innerHtml);
        setHtmlSections(sections);
        setHtmlLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setHtmlError(err.message ?? String(err));
        setHtmlLoading(false);
      });

    return () => { cancelled = true; };
  }, [sermon, lang]);

  const handleScroll = () => {
    if (!id || saveTimer.current !== null) return;
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      if (scrollRef.current) {
        localStorage.setItem(SCROLL_KEY(id), String(Math.round(scrollRef.current.scrollTop)));
      }
    }, 500);
  };

  // ─── Résolution du contenu final ───────────────────────────────
  // Priorité : sermon distant > sermon téléchargé
  const isHtmlSermon = !!(sermon
    ? (lang === 'ar' ? sermon.htmlUrlAr : sermon.htmlUrlFr)
    : downloaded?.isHtml);

  const title = sermon
    ? lang === 'ar' ? sermon.titleAr : sermon.titleFr
    : downloaded?.title ?? '';
  const author = (sermon?.author ?? downloaded?.author)?.trim() || t(lang, 'telegramSource');
  const category = sermon?.category ?? downloaded?.category ?? 'Spiritualité';
  const publishedAt = sermon?.publishedAt ?? downloaded?.publishedAt ?? '';
  const sourceUrl = sermon?.sourceUrl ?? '';
  const displayDir = sermon ? lang : (downloaded?.lang ?? lang);
  const dateLabel = formatDualDate(publishedAt, displayDir);
  const isDownloaded = !!downloaded;
  const isFavorite = id ? favorites.includes(id) : false;

  // Contenu texte (ancien format)
  const textContent = sermon
    ? lang === 'ar' ? sermon.contentAr : sermon.contentFr
    : (!downloaded?.isHtml ? downloaded?.content : undefined);
  const sections = textContent ? extractSections(textContent) : [];

  // Contenu HTML final (distant ou téléchargé)
  const resolvedHtmlInner = htmlInner ?? (downloaded?.isHtml ? downloaded.content : null);
  const resolvedSections = htmlSections.length > 0 ? htmlSections : [];

  const activeSections = isHtmlSermon ? resolvedSections : sections;

  const jumpToSection = (index: number) => {
    setTocOpen(false);
    document.getElementById(`section-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownload = () => {
    if (!sermon || isDownloaded) return;
    if (isHtmlSermon && resolvedHtmlInner) {
      // Stocke le HTML déjà préparé (avec IDs de section inclus)
      downloadSermon(sermon, lang, resolvedHtmlInner);
    } else {
      downloadSermon(sermon, lang);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
      } else {
        await navigator.clipboard?.writeText(url);
      }
    } catch { /* annulé par l'utilisateur */ }
  };

  // ─── État : chargement du catalogue ────────────────────────────
  if (sermonsLoading && !downloaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sermon && !downloaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t(globalLang, 'sermonNotFound')}</p>
      </div>
    );
  }

  // ─── Rendu ─────────────────────────────────────────────────────
  return (
    <div className={`h-screen flex flex-col ${themeClasses[theme]}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b z-10 ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700' : theme === 'sepia' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
      }`}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-black/5 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="flex-1 text-sm font-semibold line-clamp-1 text-center" dir={displayDir === 'ar' ? 'rtl' : 'ltr'}>
          {title}
        </h2>
        <button onClick={handleShare} title={t(displayDir, 'shareSermon')} className="p-2 rounded-full hover:bg-black/5 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {/* Barre d'outils lecteur */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'sepia' ? 'bg-amber-100/60 border-amber-200' : 'bg-gray-50 border-gray-100'
      }`}>
        {/* Toggle langue */}
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => setLang('fr')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${lang === 'fr' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >FR</button>
          <button
            onClick={() => setLang('ar')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${lang === 'ar' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >AR</button>
        </div>

        {/* Taille police */}
        <div className="flex items-center gap-1">
          {(['sm', 'md', 'lg'] as FontSize[]).map((size, i) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`px-2 py-1 rounded text-gray-600 transition-colors ${fontSize === size ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-gray-100'}`}
              style={{ fontSize: 10 + i * 2 + 'px', fontWeight: 600 }}
            >A</button>
          ))}
        </div>

        {/* Thème + téléchargement */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {([
              { key: 'light', bg: 'bg-white border-2 border-gray-300', label: 'Clair' },
              { key: 'dark', bg: 'bg-gray-800', label: 'Sombre' },
              { key: 'sepia', bg: 'bg-amber-100', label: 'Sépia' },
            ] as const).map((th) => (
              <button
                key={th.key}
                onClick={() => setTheme(th.key)}
                title={th.label}
                className={`w-6 h-6 rounded-full ${th.bg} ${theme === th.key ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
              />
            ))}
          </div>
          <button
            onClick={handleDownload}
            disabled={isHtmlSermon && htmlLoading}
            title={isDownloaded ? t(lang, 'savedOffline') : t(lang, 'saveOffline')}
            className={`p-2 rounded-full shadow transition-colors ${
              isDownloaded
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40'
            }`}
          >
            {isDownloaded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Zone de lecture */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className={`w-[90%] max-w-[720px] mx-auto py-6 ${fontSizeMap[fontSize]}`}>

          {/* Infos sermon */}
          <div className="mb-6" dir={displayDir === 'ar' ? 'rtl' : 'ltr'}>
            <h1 className={`font-bold leading-tight mb-2 ${fontSize === 'lg' ? 'text-2xl' : fontSize === 'sm' ? 'text-lg' : 'text-xl'}`}>
              {title}
            </h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
              {author} · {category}
            </p>
            {dateLabel && (
              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs mt-1`}>
                {dateLabel}
              </p>
            )}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-xs mt-1.5 ${
                  theme === 'dark' ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                } hover:underline`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {sourceUrl.replace('https://', '')}
              </a>
            )}
          </div>

          {/* Contenu */}
          {isHtmlSermon ? (
            htmlLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : htmlError ? (
              <p className="text-red-500 italic text-sm">{t(lang, 'contentUnavailable')} — {htmlError}</p>
            ) : resolvedHtmlInner ? (
              <div
                className="sermon-html-content"
                data-theme={theme}
                dir={displayDir === 'ar' ? 'rtl' : 'ltr'}
                dangerouslySetInnerHTML={{ __html: resolvedHtmlInner }}
              />
            ) : null
          ) : textContent ? (
            <SermonContent content={textContent} theme={theme} dir={displayDir === 'ar' ? 'rtl' : 'ltr'} />
          ) : (
            <p className="text-gray-400 italic">{t(lang, 'contentUnavailable')}</p>
          )}
        </div>
      </div>

      {/* Contrôles flottants */}
      <div className="fixed bottom-5 right-4 flex flex-col items-end gap-2 z-20">
        {tocOpen && activeSections.length > 0 && (
          <div className={`rounded-xl shadow-lg border overflow-hidden mb-1 max-w-[260px] ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'sepia' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
          }`}>
            <p className={`px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {t(displayDir, 'toc')}
            </p>
            {activeSections.map((s, i) => (
              <button
                key={i}
                onClick={() => jumpToSection(i)}
                dir={/[؀-ۿ]/.test(s) ? 'rtl' : 'ltr'}
                className={`block w-full text-start px-4 py-2.5 text-sm transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-black/5'}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {activeSections.length > 0 && (
            <button
              onClick={() => setTocOpen((v) => !v)}
              title={t(displayDir, 'toc')}
              className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center backdrop-blur transition-colors ${
                tocOpen ? 'bg-emerald-600 text-white' : 'bg-black/60 text-white hover:bg-black/75'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
              </svg>
            </button>
          )}

          <button
            onClick={() => id && toggleFavorite(id)}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center backdrop-blur transition-colors ${
              isFavorite ? 'bg-emerald-600 text-white' : 'bg-black/60 text-white hover:bg-black/75'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill={isFavorite ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
