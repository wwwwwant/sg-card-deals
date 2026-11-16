# sg-card-deals — project context for Claude Code

## What this is
A free, static data feed of **Singapore credit-card dining promotions** (1-for-1, % off, buffet deals).
GitHub Actions runs a headless browser daily, reads official promotion pages, and publishes
`docs/deals.json` via GitHub Pages. A Claude skill (`card-promo-dining`) reads that JSON first,
so the assistant works on mobile without a custom backend.

## Pipeline
1. `scraper/sources.json` — list of official pages to read (bank catalogues, merchant bank-pages).
2. `npm run scrape` → `scraper/scrape.mjs` (Playwright) saves rendered text + links to `raw/<id>.txt` / `raw/<id>.links.json`, and a run log to `raw/_run.json`.
3. `npm run build` → `scraper/build.mjs` runs each source's parser in `scraper/parsers/<id>.mjs` (if present), merges `data/manual.json`, validates against `schema/deal.schema.json`, writes `docs/deals.json`.
4. `.github/workflows/scrape.yml` runs 1–3 daily and commits the result.

## Hard rules
- **Never invent a deal.** Every deal must come from a fetched page or `data/manual.json`, with `source_url`, `source_type` and `verified_at`.
- `source_type`: `bank_official` | `merchant_official` | `aggregator` (aggregators only as unverified leads; do not copy their text).
- Public pages only. No logins, no bank app scraping, no CAPTCHA bypass.
- Be polite: one page at a time, a few seconds between pages, once a day. Check each site's terms of use / robots.txt before adding it to `sources.json`; note the check in the source entry (`tos_checked`).
- Drop deals whose `valid_to` is in the past at build time.
- Keep `docs/deals.json` small (only fields in the schema).

## Next tasks (start here)
1. Run `npm install && npx playwright install chromium && npm run scrape`, then inspect `raw/ocbc-buffets.txt` and `raw/ocbc-dining.txt`.
2. Write `scraper/parsers/ocbc-buffets.mjs` and `scraper/parsers/ocbc-dining.mjs` that turn the raw text/links into deals matching the schema (see `scraper/parsers/_example.mjs`). If the catalogue paginates or lazy-loads, extend `scrape.mjs` (e.g. click "Load more").
3. Add merchant pages that publish bank deals (e.g. `suki-ya.com.sg/promotions/ocbc`) and parsers for them.
4. Add other banks (DBS/POSB, UOB, Citi, HSBC, Maybank, MariBank) one at a time.
5. Push to a public GitHub repo, enable Pages (Settings → Pages → Deploy from branch → `main` / `docs`), run the workflow once manually.
6. Put the Pages URL of `deals.json` into the Claude skill's Step 2 as the first data source.
