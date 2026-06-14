import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OptionCard from '../components/OptionCard';
import AppsModal from '../components/AppsModal';
import AboutModal from '../components/AboutModal';
import { useT } from '../i18n/translations';

// ─── Configuration ──────────────────────────────────────────────────────────
const APP_NAME = 'Bibliothèque de Sermons';
const APP_VERSION = '1.0.0';
const PLAYSTORE_URL = 'https://play.google.com/store/apps/details?id=com.koumy.sermons';
const CONTACT_EMAIL = 'barrymohamadoucire@gmail.com';
const APPS_API_URL = 'https://raw.githubusercontent.com/Barry-Koumy/mes-applications/refs/heads/main/app.json';
// ─────────────────────────────────────────────────────────────────────────────

function shareApp() {
  const message = `Découvrez ${APP_NAME} — une belle application pour lire les sermons\n${PLAYSTORE_URL}`;
  if (navigator.share) {
    navigator.share({ title: APP_NAME, text: message, url: PLAYSTORE_URL }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(message).catch(() => {});
  }
}

function openPlayStore() {
  window.open(PLAYSTORE_URL, '_blank', 'noopener,noreferrer');
}

function contactByEmail() {
  const subject = encodeURIComponent(`Feedback ${APP_NAME}`);
  const body = encodeURIComponent(`Bonjour,\n\nVersion : ${APP_VERSION}\n\n[Votre message ici]`);
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

// ─── Icônes ───────────────────────────────────────────────────────────────────
const ICON = (path: string) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const icons = {
  share: ICON('M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'),
  star: ICON('M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'),
  mail: ICON('M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'),
  grid: ICON('M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z'),
  info: ICON('M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
  contribute: ICON('M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
};
// ─────────────────────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const [appsOpen, setAppsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl mx-auto px-4 md:px-6 pt-12 lg:pt-8 pb-8">
        {/* En-tête */}
        <div className="flex flex-col items-center py-7">
          <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-600/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">v{APP_VERSION}</p>
        </div>

        {/* Section GÉNÉRAL */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-4 mb-2 ms-1">
          {t('sectionGeneral')}
        </p>
        <div className="flex flex-col gap-2.5">
          <OptionCard icon={icons.share} title={t('shareApp')} sub={t('shareAppSub')} onClick={shareApp} />
          <OptionCard icon={icons.star} title={t('rateApp')} sub={t('rateAppSub')} onClick={openPlayStore} />
          <OptionCard icon={icons.mail} title={t('contactUs')} sub={t('contactUsSub')} onClick={contactByEmail} />
        </div>

        {/* Section DÉCOUVRIR */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-6 mb-2 ms-1">
          {t('sectionDiscover')}
        </p>
        <div className="flex flex-col gap-2.5">
          <OptionCard icon={icons.grid} title={t('ourApps')} sub={t('ourAppsSub')} onClick={() => setAppsOpen(true)} />
        </div>

        {/* Section APPLICATION */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-6 mb-2 ms-1">
          {t('sectionApp')}
        </p>
        <div className="flex flex-col gap-2.5">
          <OptionCard
            icon={icons.info}
            title={t('about')}
            sub={`${APP_NAME} · Version ${APP_VERSION}`}
            onClick={() => setAboutOpen(true)}
          />
        </div>

        {/* Section PARTICIPER */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-6 mb-2 ms-1">
          {t('sectionContribute')}
        </p>
        <div className="flex flex-col gap-2.5">
          <OptionCard icon={icons.contribute} title={t('contributeEntry')} sub={t('contributeEntrySub')} onClick={() => navigate('/contribute')} />
        </div>
      </div>

      <AppsModal open={appsOpen} apiUrl={APPS_API_URL} onClose={() => setAppsOpen(false)} />
      <AboutModal open={aboutOpen} appName={APP_NAME} appVersion={APP_VERSION} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
