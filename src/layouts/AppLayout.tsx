import { Outlet, NavLink } from 'react-router-dom';
import { useT } from '../i18n/translations';
import type { TranslationKey } from '../i18n/translations';

const navItems: { to: string; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  {
    to: '/',
    labelKey: 'navHome',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    to: '/library',
    labelKey: 'navLibrary',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    to: '/more',
    labelKey: 'navMore',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
];

export default function AppLayout() {
  const { t, dir } = useT();

  return (
    <div dir={dir} className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar latérale — tablette large / ordinateur (≥ lg) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700">
        {/* Marque */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <img
            src={`${import.meta.env.BASE_URL}icon-192.png`}
            alt=""
            className="w-9 h-9 rounded-xl object-cover shrink-0"
          />
          <span className="font-bold text-gray-900 dark:text-white truncate">{t('appTitle')}</span>
        </div>

        {/* Liens */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Bottom Navigation — mobile / tablette (< lg) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex safe-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`
            }
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
