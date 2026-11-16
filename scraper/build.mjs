// Turns raw/ pages into docs/deals.json using per-source parsers + data/manual.json.
import fs from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const read = async (p, fallback) => {
  try { return await fs.readFile(new URL(p, ROOT), 'utf8'); } catch { return fallback; }
};

const sources = JSON.parse(await read('scraper/sources.json', '[]'));
const run = JSON.parse(await read('raw/_run.json', '[]'));
const today = new Date().toISOString().slice(0, 10);
const deals = [];
const report = [];

for (const s of sources.filter((s) => s.enabled !== false)) {
  const fetched = run.find((r) => r.id === s.id && r.ok);
  if (!fetched) { report.push({ id: s.id, status: 'not fetched' }); continue; }
  let parser;
  try {
    parser = (await import(new URL(`scraper/parsers/${s.id}.mjs`, ROOT))).default;
  } catch {
    report.push({ id: s.id, status: 'no parser yet' });
    continue;
  }
  const text = await read(`raw/${s.id}.txt`, '');
  const links = JSON.parse(await read(`raw/${s.id}.links.json`, '[]'));
  const found = parser({ text, links, source: s }).map((d) => ({
    ...d,
    bank: d.bank ?? s.bank,
    source_type: d.source_type ?? s.source_type,
    source_url: d.source_url ?? s.url,
    verified_at: fetched.fetched_at,
  }));
  deals.push(...found);
  report.push({ id: s.id, status: 'parsed', deals: found.length });
}

const manual = JSON.parse(await read('data/manual.json', '[]'));
deals.push(...manual);

const REQUIRED = ['id', 'bank', 'merchant', 'benefit', 'source_url', 'source_type', 'verified_at'];
const valid = deals.filter((d) => {
  const missing = REQUIRED.filter((k) => !d[k]);
  if (missing.length) { console.warn(`skip ${d.id ?? '?'}: missing ${missing.join(', ')}`); return false; }
  if (d.valid_to && d.valid_to < today) return false; // expired
  return true;
});

const seen = new Set();
const unique = valid.filter((d) => (seen.has(d.id) ? false : seen.add(d.id)));

const out = {
  generated_at: new Date().toISOString(),
  note: 'Singapore credit-card dining promotions. Always confirm in the bank app / T&Cs before paying.',
  sources: report,
  deals: unique,
};
await fs.mkdir(new URL('docs/', ROOT), { recursive: true });
await fs.writeFile(new URL('docs/deals.json', ROOT), JSON.stringify(out, null, 2));
console.log(`wrote docs/deals.json — ${unique.length} deals`);
console.table(report);
