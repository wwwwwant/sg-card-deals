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
- Sources whose terms forbid republishing are never part of the public feed. The owner keeps personal-use data for those locally under `private/` (gitignored, see `private/NOTES.md` on the owner's machine); `tools/build_personal_skill.sh` bundles `private/skill-data/*.json` into the owner's own skill (`dist/`, gitignored). Never commit anything from `private/` or `dist/`.
- Plugin (public): `plugins/sg-card-deals/` = plugin.json, icon, README, LICENSE, `skills/sg-card-dining/SKILL.md` **only**. The Claude directory rejects scripts/programs from unverified orgs, so `find_deals.py` lives in `tools/` and goes only into the personal build. Self-hosted marketplace: `.claude-plugin/marketplace.json` (`sg-card-deals-marketplace`). Validate with `claude plugin validate --strict ./plugins/sg-card-deals`; bump `version` in both manifests on each release.
- Personal skill installed locally via symlink `~/.claude/skills/sg-card-dining` → `dist/sg-card-dining` (rebuild with `tools/build_personal_skill.sh` after editing SKILL.md or data).

## Feed safety (build.mjs)
The feed is read by other people's Claude. `build.mjs` keeps only schema fields, strips control/zero-width characters, caps lengths, requires `https` links (`source_url` on the source's own domain), and drops any deal whose text looks like instructions or asks for card numbers/OTP/passwords. The skill also treats all fetched text as untrusted data. Keep both in place.

## Next tasks (start here)
1. Add bank pages whose terms allow it, and merchant pages that publish bank deals (e.g. `suki-ya.com.sg/promotions/ocbc`), one source at a time with a parser in `scraper/parsers/<id>.mjs`.
2. Before re-enabling the daily schedule: pin actions to commit SHAs, use `npm ci`, keep `permissions` minimal.
