# SG Card Deals

Ask Claude where to eat in Singapore and which of your credit cards to pay with. The `sg-card-dining` skill asks which cards you hold (never card numbers), where and when you want to eat, then matches restaurants against promotions that are valid on that date — 1-for-1s, % off, buffet deals — and shows each pick with the card to use, the estimated saving, the conditions that matter, and a link to the source page.

Example: *"I have an OCBC 365 card. Buffet near Orchard this Thursday night for two, about S$150?"*

## Where the data comes from

1. **Public deals feed** — `https://wwwwwant.github.io/sg-card-deals/deals.json`, a static JSON file built from official merchant and bank pages that allow it. Every deal carries its source link and the time it was checked. Coverage is small and growing.
2. **Live web search** by Claude for anything the feed doesn't cover, preferring official bank and merchant pages and labelling anything else as unverified.
3. **Optional private snapshots** — if you add your own `*.json` files in a `data/` folder next to the skill (same shape as the feed), the skill will read them. None are shipped with this plugin.

## What it runs, sends and stores

- The plugin contains instructions only (one `SKILL.md`): no scripts, hooks, servers or binaries.
- Fetches the public feed above (a plain HTTPS GET to GitHub Pages, no user data in the request) and runs web searches/fetches through Claude's own tools.
- Sends no personal data anywhere and stores nothing. The cards you mention stay in your conversation.

Promotions change; always confirm in your bank app or the T&Cs before paying. Estimates are not guaranteed savings.

## Install

Claude Code:

```
/plugin marketplace add wwwwwant/sg-card-deals
/plugin install sg-card-deals@sg-card-deals-marketplace
```

Source and data pipeline: https://github.com/wwwwwant/sg-card-deals
