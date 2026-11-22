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
    _host: new URL(s.url).hostname,
  }));
  deals.push(...found);
  report.push({ id: s.id, status: 'parsed', deals: found.length });
}

const manual = JSON.parse(await read('data/manual.json', '[]'));
deals.push(...manual);

// ---- Sanitize: the feed is read by other people's Claude, and its text comes from third-party pages.
// Keep only schema fields, strip invisible/control characters, cap lengths, allow only https links on
// the source's own domain, and drop any deal whose text looks like instructions or asks for secrets.
const schema = JSON.parse(await read('schema/deal.schema.json', '{}'));
const FIELDS = Object.keys(schema.properties ?? {});
const ENUMS = { deal_type: schema.properties?.deal_type?.enum, source_type: schema.properties?.source_type?.enum };
const SUSPICIOUS = /ignore (all |any )?(previous|prior|above|earlier) (instructions|messages)|system prompt|you are (an? |the )?(ai|assistant|claude|chatgpt)|\bassistant:|card number|\bcvv\b|\bcvc\b|one[- ]time (password|code|pin)|\botp\b|password|log ?in (to|with)|<\s*script|javascript:|data:text/i;
const clean = (s, max) => {
  const t = String(s)
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};
const httpsOn = (u, host) => {
  try {
    const url = new URL(u);
    if (url.protocol !== 'https:') return null;
    if (host && !(url.hostname === host || url.hostname.endsWith('.' + host.replace(/^www\./, '')) || url.hostname === host.replace(/^www\./, ''))) return null;
    return url.href;
  } catch { return null; }
};
const sanitize = (d) => {
  const out = {};
  for (const k of FIELDS) {
    const v = d[k];
    if (v === undefined || v === null || v === '') continue;
    if (k === 'conditions' || k === 'cards') {
      const arr = (Array.isArray(v) ? v : [v]).map((x) => clean(x, 300)).filter(Boolean).slice(0, 12);
      if (arr.length) out[k] = arr;
    } else if (k === 'source_url') {
      const u = httpsOn(v, d._host); // parsed sources: must be on the source's own domain
      if (!u) { console.warn(`skip ${d.id}: source_url not https on ${d._host ?? 'any host'}: ${v}`); return null; }
      out[k] = u;
    } else if (k === 'booking') {
      const u = httpsOn(v);
      if (u) out[k] = u; else console.warn(`drop booking for ${d.id}: not https: ${v}`);
    } else if (k === 'valid_from' || k === 'valid_to') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = v;
    } else if (ENUMS[k]) {
      if (ENUMS[k].includes(v)) out[k] = v;
    } else {
      out[k] = clean(v, k === 'benefit' ? 300 : 200);
    }
  }
  const text = JSON.stringify(out);
  if (SUSPICIOUS.test(text)) { console.warn(`skip ${d.id}: text looks like instructions/secrets request`); return null; }
  return out;
};

const REQUIRED = ['id', 'bank', 'merchant', 'benefit', 'source_url', 'source_type', 'verified_at'];
const valid = deals.map(sanitize).filter(Boolean).filter((d) => {
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
