interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onClick?: () => void;
}

export default function OptionCard({ icon, title, sub, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl p-3.5 shadow-sm border border-gray-100 dark:border-gray-700 transition-shadow hover:shadow-md active:bg-gray-50 dark:active:bg-gray-750 text-start"
    >
      {/* Icône */}
      <div className="w-11 h-11 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{title}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{sub}</p>}
      </div>

      {/* Chevron */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 shrink-0 text-gray-300 dark:text-gray-600 rtl:rotate-180"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
