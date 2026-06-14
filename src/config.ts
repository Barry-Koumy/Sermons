import { Capacitor } from '@capacitor/core';

// Base du contenu (catalogue + fichiers HTML des sermons) :
//   • Web et dev   → import.meta.env.BASE_URL  (même origine, chemin relatif)
//   • Mobile natif → URL distante VITE_CONTENT_BASE_URL (le site en ligne), afin de
//     recevoir les nouveaux sermons sans réinstaller l'APK.
const REMOTE = import.meta.env.VITE_CONTENT_BASE_URL as string | undefined;

/** Base de la copie EMBARQUÉE (toujours relative à l'app) — sert de repli hors-ligne. */
export const LOCAL_BASE = import.meta.env.BASE_URL;

/** Base du contenu réellement lue : distante sur mobile natif, sinon locale. */
export const CONTENT_BASE = REMOTE && Capacitor.isNativePlatform() ? REMOTE : LOCAL_BASE;

/** Catalogue lu en priorité (distant sur mobile, local sur le web). */
export const SERMONS_CATALOG_URL = `${CONTENT_BASE}sermons.json`;

/** Catalogue de la copie embarquée (repli hors-ligne). */
export const LOCAL_CATALOG_URL = `${LOCAL_BASE}sermons.json`;
