// Formatage des dates grégorienne + hégirienne via l'API Intl native
// (calendrier islamic-umalqura, pas de librairie externe).

export type Lang = 'fr' | 'ar';

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function parseValid(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatGregorian(iso: string, lang: Lang): string {
  const d = parseValid(iso);
  return d ? d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'fr-FR', DATE_OPTIONS) : '';
}

export function formatHijri(iso: string, lang: Lang): string {
  const d = parseValid(iso);
  if (!d) return '';
  const locale = lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'fr-FR-u-ca-islamic-umalqura';
  return d.toLocaleDateString(locale, DATE_OPTIONS);
}

export function formatDualDate(iso: string, lang: Lang): string {
  const g = formatGregorian(iso, lang);
  const h = formatHijri(iso, lang);
  if (!g && !h) return '';
  return `📅 ${g} • 🌙 ${h}`;
}
