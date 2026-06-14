import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/translations';

// Clé Web3Forms (service gratuit, sans serveur) — définie dans .env :
//   VITE_WEB3FORMS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ContributeScreen() {
  const { t, dir } = useT();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!WEB3FORMS_KEY) {
      setError(t('formNoKey'));
      setStatus('error');
      return;
    }

    const file = fileRef.current?.files?.[0];
    if (file && file.size > MAX_SIZE) {
      setError(t('formTooBig'));
      setStatus('error');
      return;
    }

    const data = new FormData(e.currentTarget);
    data.append('access_key', WEB3FORMS_KEY);
    data.append('subject', 'Nouvelle proposition — Bibliothèque de Sermons');
    data.append('from_name', 'Bibliothèque de Sermons');

    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      const json = await res.json();
      if (json.success) {
        setStatus('sent');
        setFileName('');
      } else {
        setError(json.message || t('formError'));
        setStatus('error');
      }
    } catch {
      setError(t('formError'));
      setStatus('error');
    }
  };

  // ─── Écran de confirmation ─────────────────────────────────────────────────
  if (status === 'sent') {
    return (
      <div className="flex flex-col min-h-full bg-gray-50 dark:bg-gray-900" dir={dir}>
        <div className="w-full max-w-xl mx-auto px-4 md:px-6 pt-16 pb-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('formSentTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('formSentBody')}</p>
          <div className="flex gap-3 mt-8 w-full">
            <button
              onClick={() => navigate('/more')}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('formBack')}
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              {t('formAddAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Formulaire ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-gray-50 dark:bg-gray-900" dir={dir}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 md:px-6 pt-12 lg:pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div className="w-full max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/more')} className="p-2 -ms-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 dark:text-gray-300 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('contributeTitle')}</h1>
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 px-4 md:px-6 py-5">
        <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto flex flex-col gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('contributeIntro')}</p>

          {/* Honeypot anti-spam */}
          <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('formName')}</label>
            <input type="text" name="name" required className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('formEmail')}</label>
            <input type="email" name="email" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('formMessage')}</label>
            <textarea name="message" required rows={5} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('formFile')}</label>
            <label className="flex items-center gap-3 px-3 py-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 cursor-pointer hover:border-emerald-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{fileName || t('formChoose')}</span>
              <input
                ref={fileRef}
                type="file"
                name="attachment"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">{t('formFileHint')}</p>
          </div>

          {status === 'error' && error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="mt-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {status === 'sending' ? t('formSending') : t('formSend')}
          </button>
        </form>
      </div>
    </div>
  );
}
