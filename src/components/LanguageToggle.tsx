import { useAppStore } from '../store/useAppStore';
import type { Lang } from '../store/useAppStore';

// Sélecteur de langue segmenté pleine largeur (FR / العربية),
// branché sur la langue globale persistée.
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  return (
    <div className={`flex w-full bg-gray-100 dark:bg-gray-700 rounded-xl p-1 ${className}`}>
      {([
        { key: 'fr', label: 'Français', sub: 'FR' },
        { key: 'ar', label: 'العربية', sub: 'AR' },
      ] as { key: Lang; label: string; sub: string }[]).map((l) => (
        <button
          key={l.key}
          onClick={() => setLang(l.key)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            lang === l.key
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              lang === l.key ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
            }`}
          >
            {l.sub}
          </span>
          {l.label}
        </button>
      ))}
    </div>
  );
}
