# Privacy Policy — SG Card Deals plugin

Last updated: 22 November 2026

The SG Card Deals plugin is a set of instructions (one `SKILL.md`) that helps Claude recommend restaurants in Singapore based on promotions on the credit cards you hold. It has no server, no account system, and no analytics.

## What it uses

During a conversation, the skill may ask for or use:

- the **names of credit cards** you hold (for example "OCBC 365"). It never asks for card numbers, balances, income or other financial details;
- **where and when** you want to eat (area, mall or neighbourhood, date, party size, budget), and your device location if you choose to share it through Claude.

This information is used only inside your Claude conversation to pick relevant promotions.

## What it sends

- It downloads the public deals file at `https://wwwwwant.github.io/sg-card-deals/deals.json` (hosted on GitHub Pages). The request contains no information you provided. Like any web request, GitHub receives standard technical data such as an IP address; see GitHub's privacy statement.
- It may ask Claude to run web searches or open web pages (for example a bank's promotion page). These go through Claude's own tools under Anthropic's terms, and the search words may include the area or cuisine you mentioned.
- It does not send your information to the plugin author or to any other service.

## What it stores

Nothing. The plugin does not store, log or retain any data. Your conversation history is handled by Claude under Anthropic's privacy policy.

## Children

The plugin is about credit-card promotions and is not intended for users under 18.

## Contact

Questions or concerns: open an issue at https://github.com/wwwwwant/sg-card-deals/issues
