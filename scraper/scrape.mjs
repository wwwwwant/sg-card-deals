// Reads each official page in sources.json with a real (headless) browser
// and saves the rendered text and links to raw/. Parsing happens in build.mjs.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const sources = JSON.parse(await fs.readFile(new URL('scraper/sources.json', ROOT), 'utf8'));
const rawDir = new URL('raw/', ROOT);
await fs.mkdir(rawDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const context = await browser.newContext({
  locale: 'en-SG',
  timezoneId: 'Asia/Singapore',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 sg-card-deals/0.1 (+https://github.com/)',
});
const page = await context.newPage();
const log = [];

for (const s of sources.filter((s) => s.enabled !== false)) {
  const started = new Date().toISOString();
  try {
    await page.goto(s.url, { waitUntil: 'networkidle', timeout: 60_000 });
    await sleep(3000);
    // Scroll to trigger lazy-loaded promotion cards.
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 3000);
      await sleep(800);
    }
    const text = await page.evaluate(() => document.body.innerText);
    const links = await page.$$eval('a[href]', (as) =>
      as
        .map((a) => ({ text: (a.innerText || '').trim().slice(0, 300), href: a.href }))
        .filter((l) => l.text)
    );
    await fs.writeFile(new URL(`${s.id}.txt`, rawDir), text);
    await fs.writeFile(new URL(`${s.id}.links.json`, rawDir), JSON.stringify(links, null, 2));
    log.push({ id: s.id, ok: true, chars: text.length, links: links.length, fetched_at: started });
    console.log(`ok   ${s.id}  ${text.length} chars, ${links.length} links`);
  } catch (err) {
    log.push({ id: s.id, ok: false, error: String(err).slice(0, 500), fetched_at: started });
    console.error(`FAIL ${s.id}  ${err}`);
  }
  await sleep(4000); // be polite between pages
}

await browser.close();
await fs.writeFile(new URL('_run.json', rawDir), JSON.stringify(log, null, 2));
