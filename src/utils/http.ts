import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Sur mobile natif, les lectures de contenu passent par le HTTP natif de Capacitor :
// cela évite les restrictions CORS vers le site distant. On n'active PAS le patch
// global de `fetch` → l'envoi du formulaire (FormData multi-fichiers) reste intact.

export async function fetchJson<T>(url: string): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url, responseType: 'json' });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export async function fetchText(url: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url, responseType: 'text' });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    return typeof res.data === 'string' ? res.data : String(res.data);
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}
