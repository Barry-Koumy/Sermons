export type Category = 'Spiritualité' | 'Éthique' | 'Famille' | 'Société' | 'Éducation' | 'Piété';

export const CATEGORIES: Category[] = ['Spiritualité', 'Éthique', 'Famille', 'Société', 'Éducation', 'Piété'];

export interface Sermon {
  id: string;
  titleFr: string;
  titleAr: string;
  author: string;
  category: Category;
  publishedAt: string;
  /** Texte balisé inline (ancien format). */
  contentFr?: string;
  contentAr?: string;
  /** URL vers le fichier HTML généré par le script de conversion PDF. */
  htmlUrlFr?: string;
  htmlUrlAr?: string;
  audioUrl?: string;
  sourceUrl?: string;
}
