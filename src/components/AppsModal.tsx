import { useEffect, useState } from 'react';
import { useT } from '../i18n/translations';

interface RemoteApp {
  name: string;
  description?: string;
  icon?: string;
  url: string;
}

interface AppsModalProps {
  open: boolean;
  apiUrl: string;
  onClose: () => void;
}

export default function AppsModal({ open, apiUrl, onClose }: AppsModalProps) {
  const { t } = useT();
  const [apps, setApps] = useState<RemoteApp[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus('loading');
    fetch(apiUrl)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: RemoteApp[] = Array.isArray(data) ? data : data.apps ?? [];
        setApps(list);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [open, apiUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('ourApps')}</h2>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="p-1.5 -m-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-4">
          {status === 'loading' && (
            <p className="text-center text-sm text-gray-400 py-10">{t('appsLoading')}</p>
          )}
          {status === 'error' && (
            <p className="text-center text-sm text-gray-400 py-10">{t('appsError')}</p>
          )}
          {status === 'ready' && apps.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">{t('appsEmpty')}</p>
          )}
          {status === 'ready' && apps.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {apps.map((app, i) => (
                <a
                  key={i}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {app.icon ? (
                    <img src={app.icon} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{app.name}</p>
                    {app.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{app.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 shrink-0">{t('openApp')}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
