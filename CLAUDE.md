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

## Status (2026-11-22)
- Live feed: https://wwwwwant.github.io/sg-card-deals/deals.json (repo `wwwwwant/sg-card-deals`, Pages from `main` `/docs`). Built and pushed locally; the daily `schedule` in `scrape.yml` is commented out until we switch to Actions.
- Public sources: only `sukiya-ocbc`. The `ocbc-*` sources are `enabled: false`: www.ocbc.com sits behind Incapsula bot protection, and OCBC's Conditions of Access forbid reproducing/republishing/mirroring site content without written permission. Do not bypass, and do not put OCBC catalogue content in `docs/` or anywhere committed.
- OCBC is covered by a **private** snapshot instead: `private/skill-data/ocbc-snapshot.json` (gitignored), shipped only inside the personal skill built by `tools/build_personal_skill.sh` → `dist/sg-card-dining/` + `dist/sg-card-dining.zip` (gitignored). Coverage: OCBC Food & Groceries catalogue, 291 offers (2026-11-22). Never commit it.
  - Refresh: in the owner's own Chrome, page through `card-promotions?main=foodandgroceries&p=1..N`; each list page holds the hidden detail panels (`.merchant-item.single-card-promotion`) for its 12 offers. Accumulate per-page extracts in the tab's sessionStorage, download one JSON (ask the owner first), move it to `private/ocbc-raw/` (gitignored), then `python3 -I tools/ocbc_snapshot.py private/ocbc-raw/<file>.json private/skill-data/ocbc-snapshot.json` and `tools/build_personal_skill.sh`. If a CAPTCHA/challenge appears, stop and hand over to the owner.
- Plugin (public): `plugins/sg-card-deals/` = plugin.json, icon, README, LICENSE, `skills/sg-card-dining/SKILL.md` **only**. The Claude directory rejects scripts/programs from unverified orgs, so `find_deals.py` lives in `tools/` and goes only into the personal build. Self-hosted marketplace: `.claude-plugin/marketplace.json` (`sg-card-deals-marketplace`). Validate with `claude plugin validate --strict ./plugins/sg-card-deals`; bump `version` in both manifests on each release.
- Personal skill installed locally via symlink `~/.claude/skills/sg-card-dining` → `dist/sg-card-dining` (rebuild with `tools/build_personal_skill.sh` after editing SKILL.md or data).

## Next tasks (start here)
1. Run `npm install && npx playwright install chromium && npm run scrape`, then inspect `raw/ocbc-buffets.txt` and `raw/ocbc-dining.txt`.
2. Write `scraper/parsers/ocbc-buffets.mjs` and `scraper/parsers/ocbc-dining.mjs` that turn the raw text/links into deals matching the schema (see `scraper/parsers/_example.mjs`). If the catalogue paginates or lazy-loads, extend `scrape.mjs` (e.g. click "Load more").
3. Add merchant pages that publish bank deals (e.g. `suki-ya.com.sg/promotions/ocbc`) and parsers for them.
4. Add other banks (DBS/POSB, UOB, Citi, HSBC, Maybank, MariBank) one at a time.
5. Push to a public GitHub repo, enable Pages (Settings → Pages → Deploy from branch → `main` / `docs`), run the workflow once manually.
6. Put the Pages URL of `deals.json` into the Claude skill's Step 2 as the first data source.
