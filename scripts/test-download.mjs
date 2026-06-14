// Test fonctionnel du correctif « sauvegarde hors-ligne » : pilote Edge (headless),
// clique sur le bouton télécharger d'une carte, puis vérifie que le store persistant
// contient bien le HTML du sermon (et non un contenu vide).
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = process.env.TEST_URL ?? 'http://localhost:4173/';
const DL_SELECTOR = 'button[aria-label="Télécharger pour lecture hors ligne"]';

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector(DL_SELECTOR, { timeout: 15000 });

  // Capture de l'accueil (logo + cartes).
  await page.screenshot({ path: 'scripts/_home.png' });

  // Clique le premier bouton « télécharger ».
  await page.click(DL_SELECTOR);

  // Attend que le store persistant contienne un sermon avec du contenu réel.
  const result = await page.waitForFunction(() => {
    const raw = localStorage.getItem('sermons-app-prefs');
    if (!raw) return false;
    const dl = JSON.parse(raw)?.state?.downloads ?? {};
    const ids = Object.keys(dl);
    if (!ids.length) return false;
    const e = dl[ids[0]];
    if (!e || !e.content || e.content.length < 50) return false;
    return { id: e.id, len: e.content.length, isHtml: !!e.isHtml, title: e.title };
  }, { timeout: 15000 }).then((h) => h.jsonValue());

  console.log('TÉLÉCHARGEMENT OK →', JSON.stringify(result));
  console.log('Erreurs page :', errors.length ? errors : 'aucune');

  // Capture d'une page Plus (logo en en-tête) + lecteur.
  await page.goto(URL + 'more', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'scripts/_more.png' });

  process.exitCode = 0;
} catch (e) {
  console.error('ÉCHEC TEST :', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
