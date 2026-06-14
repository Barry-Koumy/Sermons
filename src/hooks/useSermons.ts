import { useState, useEffect } from 'react';
import type { Sermon } from '../types/sermon';
import { SERMONS_CATALOG_URL } from '../config';

interface RawSermon {
  id: string;
  titre_fr: string;
  titre_ar: string;
  url_fr?: string;
  url_ar?: string;
  // anciens champs camelCase (rétrocompat)
  titleFr?: string;
  titleAr?: string;
  htmlUrlFr?: string;
  htmlUrlAr?: string;
  author?: string;
  category?: Sermon['category'];
  publishedAt?: string;
  contentFr?: string;
  contentAr?: string;
}

function cleanTitle(s: string | undefined): string {
  return (s ?? '').replace(/_/g, ' ').trim();
}

function normalizeSermon(raw: RawSermon): Sermon {
  return {
    id: raw.id,
    titleFr: cleanTitle(raw.titre_fr ?? raw.titleFr),
    titleAr: cleanTitle(raw.titre_ar ?? raw.titleAr),
    author: raw.author ?? '',
    category: raw.category ?? 'Spiritualité',
    publishedAt: raw.publishedAt ?? '',
    contentFr: raw.contentFr,
    contentAr: raw.contentAr,
    htmlUrlFr: raw.url_fr ? `${import.meta.env.BASE_URL}${raw.url_fr}` : raw.htmlUrlFr,
    htmlUrlAr: raw.url_ar ? `${import.meta.env.BASE_URL}${raw.url_ar}` : raw.htmlUrlAr,
  };
}

// Cache module : survit aux navigations entre écrans, réinitialisé à chaque rechargement de page.
let _cache: Sermon[] | null = null;
let _promise: Promise<Sermon[]> | null = null;

function loadSermons(): Promise<Sermon[]> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = fetch(SERMONS_CATALOG_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<RawSermon[]>;
      })
      .then((data) => {
        const normalized = data.map(normalizeSermon);
        _cache = normalized;
        return normalized;
      })
      .catch((err) => {
        _promise = null; // permet une nouvelle tentative
        throw err;
      });
  }
  return _promise;
}

/** Invalide le cache (utile après ajout/modification d'un sermon côté admin). */
export function invalidateSermonCache() {
  _cache = null;
  _promise = null;
}

export function useSermons() {
  const [sermons, setSermons] = useState<Sermon[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cache) return; // déjà en mémoire, pas de fetch
    let cancelled = false;

    loadSermons()
      .then((data) => {
        if (!cancelled) {
          setSermons(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { sermons, loading, error };
}
