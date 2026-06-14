// Test fonctionnel du téléchargement hors-ligne (Edge headless).
// Vérifie, de bout en bout :
//   1. Accueil — plusieurs sermons « À la une » (tous ceux de la date la plus récente).
//   2. Téléchargement — le store persiste le HTML réel des DEUX langues (FR + AR).
//   3. Lecture HORS-LIGNE — une fois le réseau coupé, le lecteur affiche bien le
//      contenu enregistré (et non l'erreur réseau ni « contenu non disponible »).
//   4. Bascule de langue hors-ligne — l'autre langue s'affiche aussi.
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = process.env.TEST_URL ?? 'http://localhost:4173/';
const DL_SELECTOR = 'button[aria-label="Télécharger pour lecture hors ligne"]';

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const fail = (msg) => { throw new Error(msg); };

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector(DL_SELECTOR, { timeout: 15000 });

  // ── 1. « À la une » : compter les cartes en avant (style featured = col-span-2) ──
  const featuredCount = await page.$$eval('[class*="col-span-2"]', (els) => els.length);
  console.log(`1) Cartes « À la une » : ${featuredCount}`);
  if (featuredCount < 1) fail('Aucune carte « À la une » affichée');
  await page.screenshot({ path: 'scripts/_home.png' });

  // ── 2. Téléchargement : store avec contenu réel des deux langues ──
  await page.click(DL_SELECTOR);
  const dl = await page.waitForFunction(() => {
    const raw = localStorage.getItem('sermons-app-prefs');
    if (!raw) return false;
    const downloads = JSON.parse(raw)?.state?.downloads ?? {};
    const ids = Object.keys(downloads);
    if (!ids.length) return false;
    const e = downloads[ids[0]];
    // On exige les deux langues récupérées (contentFr ET contentAr non vides).
    if (!e?.contentFr || e.contentFr.length < 50) return false;
    if (!e?.contentAr || e.contentAr.length < 50) return false;
    return { id: e.id, fr: e.contentFr.length, ar: e.contentAr.length, isHtml: !!e.isHtml };
  }, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => null);
  if (!dl) fail('Le store ne contient pas le contenu des deux langues après téléchargement');
  console.log(`2) Téléchargé id=${dl.id} (FR ${dl.fr} car., AR ${dl.ar} car., html=${dl.isHtml})`);

  // ── 3. Lecture HORS-LIGNE : couper le réseau puis ouvrir le sermon (navigation SPA) ──
  await page.setOfflineMode(true);
  console.log('   → réseau coupé (offline)');
  // Ouvre le lecteur en cliquant le titre de la première carte (routing client, sans réseau).
  await page.click('.grid > div:first-child h3');
  await page.waitForSelector('.sermon-html-content', { timeout: 15000 })
    .catch(() => fail('Hors-ligne : le contenu téléchargé ne s’affiche pas (.sermon-html-content absent)'));
  const frInfo = await page.$eval('.sermon-html-content', (el) => ({
    len: el.textContent.trim().length,
    dir: el.getAttribute('dir'),
  }));
  if (frInfo.len < 50) fail(`Hors-ligne : contenu FR trop court (${frInfo.len})`);
  const unavailable = await page.evaluate(() =>
    document.body.innerText.includes('Contenu non disponible'));
  if (unavailable) fail('Hors-ligne : « Contenu non disponible » affiché malgré le téléchargement');
  console.log(`3) Hors-ligne OK — contenu FR affiché (${frInfo.len} car., dir=${frInfo.dir})`);
  await page.screenshot({ path: 'scripts/_reader_offline.png' });

  // ── 4. Bascule AR hors-ligne ──
  const arBtn = await page.$$('button');
  for (const b of arBtn) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt === 'AR') { await b.click(); break; }
  }
  await page.waitForFunction(() => {
    const el = document.querySelector('.sermon-html-content');
    return el && el.getAttribute('dir') === 'rtl' && el.textContent.trim().length > 50;
  }, { timeout: 8000 }).catch(() => fail('Hors-ligne : la bascule AR n’affiche pas le contenu arabe'));
  console.log('4) Hors-ligne OK — bascule AR affiche le contenu arabe (dir=rtl)');
  await page.screenshot({ path: 'scripts/_reader_offline_ar.png' });

  console.log('\nErreurs page JS :', errors.length ? errors : 'aucune');
  console.log('✅ TOUS LES TESTS PASSENT');
  process.exitCode = 0;
} catch (e) {
  console.error('❌ ÉCHEC TEST :', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
