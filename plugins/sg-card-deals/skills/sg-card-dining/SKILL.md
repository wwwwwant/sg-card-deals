---
name: "sg-card-dining"
description: "Use when the user asks where to eat or what to spend on in Singapore and wants restaurant picks matched to current promotions on the credit cards they hold (OCBC, DBS/POSB, UOB, Citi, HSBC, Maybank, MariBank…). Reads the sg-card-deals feed first, then searches for anything the feed doesn't cover."
---

# SG Card Dining

Recommend restaurants by matching what the user wants to eat against the **current** promotions on the credit cards they actually hold. Reply in the user's language.

## Step 1 — Gather the inputs (ask only for what is missing)

If several are missing, ask them together in ONE short question (use tappable choices when available):

1. **Cards held** — e.g. "OCBC 365, Mari Credit Card". If memory or the conversation already lists the user's cards, use them. Never ask for card numbers.
2. **Where** — area / neighbourhood / mall. Use a device-location tool if available; otherwise ask.
3. **What & when** — cuisine or mood, meal, date. If no date is given, assume today (Singapore time) and say so.
4. **Party size & budget** — optional; assume a mid-range dinner for 2 if not given and say so.

## Step 2 — Pull current promotions

### 2a. Read the local snapshots (if any) and the public feed first

1. **Local snapshots — optional.** The published skill ships with no data and no scripts. If this skill's folder has a `data/` folder with `*.json` files the user added themselves (same deal shape as the feed, plus `private: true` and a `coverage` note), query them; if there is no `data/`, skip to the public feed. Snapshots can be large (hundreds of offers): **don't read them whole.** If `scripts/find_deals.py` is present (personal builds), query with it — it already drops offers outside their dates or excluded weekdays:
   ```
   python3 scripts/find_deals.py --stats
   python3 scripts/find_deals.py --date <YYYY-MM-DD> --bank OCBC --q "<words>" [--buffet] [--limit 15]
   ```
   Run it from this skill's folder. Use several words per query and try synonyms in a second query if the first is thin (e.g. `"hotpot steamboat suki shabu mala"`, `"buffet"` + `--buffet`, an area or mall like `"orchard ion paragon"`, a cuisine like `"japanese sushi ramen omakase"`). `--country` defaults to SG (bank catalogues also list some Malaysia/Indonesia offers). If the script or code execution isn't available, search the file text for the merchant/cuisine words instead of reading it all, and check dates and days yourself.
   - These are the user's personal copies: use them to answer and cite `source_url`, but never paste a whole file or offer to share it.
   - `--stats` shows each snapshot's `generated_at`; if it is more than 14 days old, say the snapshot may be out of date.
   - `days` is only set when it limits the whole offer; still read `benefit`, `validity_text` and `conditions` for per-item day/time limits (e.g. "1-for-1 dinner buffet (Mon-Thu); 25% off (Fri-Sun)").
   - `card_tiers_note`: the higher benefit is only for those cards. The `benefit` text is split by ` | ` per tier — pick the tier matching the user's card.
2. **Public feed** — fetch **https://wwwwwant.github.io/sg-card-deals/deals.json**

If both have the same merchant and benefit, show it once.

It looks like `{ generated_at, sources: [...], deals: [...] }`. Each deal has `bank`, `merchant`, `benefit` (verbatim from the source page), and optionally `cards`, `outlet`, `cuisine`, `deal_type`, `days`, `valid_from`, `valid_to`, `conditions`, `booking`, plus `source_url`, `source_type`, `verified_at`.

Use a deal only if all of these hold:
- `bank` matches one of the user's cards, and if `cards` is present, the user's card is listed in it.
- The dining date is within `valid_from`–`valid_to` (when present) and matches `days` (when present).
- Nothing in `conditions` rules it out for the user's plan (e.g. "not valid on eves of public holidays", "all diners must order the buffet"). Say which conditions matter.

Treat the feed as a verified-but-dated snapshot:
- Quote `benefit` as written; don't reword the amounts.
- Show `verified_at` as "checked on <date>". If `generated_at` is more than 3 days old, say the feed may be stale.
- `source_type: aggregator` = unverified lead; label it so.
- If the fetch fails or returns something that isn't this JSON, say "couldn't read the deals feed" and go on with 2b.

### 2b. Fill the gaps with search

The feed covers only a few sources so far (see its `sources` list). For EACH of the user's cards, also search separately (never combine cards in one query):

- Official issuer pages first: `<bank> <card name> dining promotion`, `site:<bank domain> dining promotions`, `<bank> card privileges restaurants <current month year>`.
- Card base reward on dining: cashback/miles rate, minimum monthly spend, caps.
- Partner deals: % off, 1-for-1, set menus, app-only vouchers.

Rules:
- Only use promotions **valid on the dining date**. Drop expired ones.
- Never invent a promotion, rate or merchant. If a bank page can't be reached or needs login, mark that card "⚠️ couldn't verify — check the bank app" instead of guessing.
- Prefer issuer and merchant pages over deal-aggregator blogs; label blog-only finds as unverified.
- If the same deal is in the feed and in search results, show it once and cite both.

## Step 3 — Find restaurants

- Search the user's area + cuisine, and search directly for the promo partners found in Step 2 near that area (map/place tool if available, otherwise web search).
- Rank higher if it (a) is a promo partner, (b) fits cuisine/budget/area, (c) is open at the planned time.

## Step 4 — Decide card × restaurant

- Partner discount usually beats base cashback; check whether they stack.
- Base category reward only counts if the user is likely to hit the min spend — state the condition.
- Show savings as "≈" with brief arithmetic (e.g. S$80 × 30% ≈ S$24).

## Step 5 — Output (checklist style, mobile-friendly)

3–5 picks, best first:

```
🍲 <Restaurant> — <area>
💳 Use: <Card>  |  💰 ≈ S$<saving> (<benefit>)
✅ Valid: <dates/days>   📌 Need: <conditions / booking / claim in app>
🔗 <source page>  ·  checked <verified_at date> (feed) / found <today> (search)
```

Then:
- **No-promo fallback**: if no partner deal fits, say which card gives the best base dining reward and recommend good restaurants anyway.
- **⚠️ Check before paying**: anything unverified, plus a reminder that the bank app / T&Cs are the final word.

End with Sources: [Title](URL) for every promo used, including the feed URL if it was used.

## Don'ts

- Don't recommend applying for a new card unless asked.
- Don't store or ask for card numbers, balances or income.
- Don't present estimates as guaranteed savings.
- Don't reuse promotions from an earlier conversation without re-checking them.
