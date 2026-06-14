import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/translations';

// Clé Web3Forms (service gratuit, sans serveur) — définie dans .env :
//   VITE_WEB3FORMS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
const OWNER_EMAIL = 'barrymohamadoucire@gmail.com';
const MAX_TOTAL = 18 * 1024 * 1024; // 18 Mo cumulés

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ContributeScreen() {
  const { t, dir } = useT();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500';

  const totalSize = files.reduce((n, f) => n + f.size, 0);

  // Repli : ouvrir le client mail de l'utilisateur avec un message pré-rempli.
  // (mailto ne peut pas joindre de fichier automatiquement → on invite à les joindre.)
  const buildMailto = () => {
    const fd = formRef.current ? new FormData(formRef.current) : null;
    const name = (fd?.get('name') as string) || '';
    const message = (fd?.get('message') as string) || '';
    const subject = encodeURIComponent('Proposition de sermon');
    const lines = [
      name ? `Nom : ${name}` : '',
      '',
      message,
      '',
      files.length
        ? `(J'ai joint ${files.length} fichier(s) PDF à cet email.)`
        : '(Pensez à joindre votre/vos fichier(s) PDF.)',
    ];
    return `mailto:${OWNER_EMAIL}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!WEB3FORMS_KEY) {
      setError(t('formNoKey'));
      setStatus('error');
      return;
    }
    if (totalSize > MAX_TOTAL) {
      setError(t('formTooBig'));
      setStatus('error');
      return;
    }

    const data = new FormData(e.currentTarget); // name, email, message, botcheck
    data.delete('attachment');
    files.forEach((f, i) => data.append(`attachment_${i + 1}`, f));
    data.append('access_key', WEB3FORMS_KEY);
    data.append('subject', 'Nouvelle proposition — Bibliothèque de Sermons');
    data.append('from_name', 'Bibliothèque de Sermons');

    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      const json = await res.json();
      if (json.success) {
        setStatus('sent');
        setFiles([]);
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
        <form ref={formRef} onSubmit={handleSubmit} className="w-full max-w-xl mx-auto flex flex-col gap-4">
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

          {/* Fichiers — plusieurs PDF possibles */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('formFilesLabel')}</label>
            <label className="flex items-center gap-3 px-3 py-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 cursor-pointer hover:border-emerald-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {files.length ? `${files.length} fichier(s)` : t('formChooseFiles')}
              </span>
              <input
                type="file"
                name="attachment"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>

            {files.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs bg-gray-100 dark:bg-gray-700/50 rounded-md px-2.5 py-1.5">
                    <span className="truncate text-gray-700 dark:text-gray-200">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-gray-400 hover:text-red-500"
                      aria-label="Retirer"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-400 mt-1">{t('formFilesHint')}</p>
          </div>

          {status === 'error' && error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5">
              <p>{error}</p>
              <a
                href={buildMailto()}
                className="inline-flex items-center gap-1.5 mt-2 font-medium text-red-700 dark:text-red-300 underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('formMailtoCta')}
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="mt-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {status === 'sending' ? t('formSending') : t('formSend')}
          </button>

          {/* Repli email toujours disponible */}
          <a href={buildMailto()} className="text-center text-xs text-gray-400 hover:text-emerald-600 mt-1">
            {t('formMailtoHint')}
          </a>
        </form>
      </div>
    </div>
  );
}
