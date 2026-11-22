"""Normalize a private OCBC catalogue capture into the skill's snapshot format.

Usage: python3 -I tools/ocbc_snapshot.py private/ocbc-raw/<capture>.json skill/sg-card-dining/data/ocbc-snapshot.json

Input is the raw capture saved from the owner's own browser (see CLAUDE.md). Output is PRIVATE:
both files are gitignored and must never be committed or published (OCBC Conditions of Access).
Every field is read from the page text; when something can't be parsed it is left out, never guessed.
"""
import datetime, hashlib, json, re, sys

SRC = "https://www.ocbc.com/personal-banking/cards/card-promotions?main=foodandgroceries"
MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}
MONTHS.update({k[:3]: v for k, v in list(MONTHS.items())})
MONTHS["sept"] = 9
CTA = re.compile(r"^(Reserve now|Order now|Book now|Shop now|Buy now|Find out more|Learn more|Visit website|Get it now|Redeem now|Download now|Sign up now|Apply now|Share|:|\.)$", re.I)
GENERIC_PAYMENT = re.compile(r"Payment must be made with an OCBC credit or debit card\.\s*Valid for (all )?OCBC Cards issued in Singapore, Malaysia, Indonesia, Hong Kong and Macau\.?", re.I)
DAY = r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*"
DAYRANGE = re.compile(rf"\b{DAY}\s*(?:-|–|to)\s*{DAY}\b", re.I)
DATE = r"(\d{1,2})\s+([A-Za-z]+)\s*(\d{4})?"


def iso(d, m, y):
    mm = MONTHS.get(m.lower())
    if not mm or not y:
        return None
    try:
        return datetime.date(int(y), mm, int(d)).isoformat()
    except ValueError:
        return None


def parse_validity(text):
    """Return (valid_from, valid_to) from the first validity sentence, or (None, None)."""
    m = re.search(rf"(?:Valid|Promotion(?: is)? valid|Available)?\s*from\s+{DATE}\s+(?:to|till|until|-|–)\s+{DATE}", text, re.I)
    if m:
        d1, m1, y1, d2, m2, y2 = m.groups()
        return iso(d1, m1, y1 or y2), iso(d2, m2, y2)
    m = re.search(rf"(?:Valid\s+(?:till|until)|from now (?:to|till|until)|ends? on)\s+{DATE}", text, re.I)
    if m:
        return None, iso(*m.groups())
    return None, None


def merge_fragments(lines):
    """Terms are split around links/emails/phone numbers; glue a fragment onto the previous sentence."""
    out = []
    for l in lines:
        if out and not re.search(r"[.!?;)”\"]$", out[-1]):
            out[-1] = (out[-1] + " " + l).replace(" .", ".").replace(" ,", ",")
        else:
            out.append(l)
    return out


def deal_type(b):
    if re.search(r"1[- ]for[- ]1", b, re.I):
        return "1-for-1"
    if re.search(r"\d+\s*%\s*off", b, re.I):
        return "percent_off"
    if re.search(r"S?\$\s*\d+[\d.]*\s*off", b, re.I):
        return "amount_off"
    if re.search(r"complimentary|free|voucher|redeem", b, re.I):
        return "freebie"
    return "other"


def normalize(item, captured_at):
    lines = item["lines"]
    if "Back to promotion list" not in lines:
        return None
    card = lines[: lines.index("Back to promotion list")]
    d = lines[lines.index("Back to promotion list") + 1 :]
    merchant = d[0]
    body = d[1:]
    ti = body.index("Terms and conditions") if "Terms and conditions" in body else len(body)
    mid, terms = body[:ti], body[ti + 1 :]
    ai = mid.index("Address:") if "Address:" in mid else len(mid)
    offer, address = mid[:ai], mid[ai + 1 :]

    promo = None
    benefit_lines = []
    for i, l in enumerate(offer):
        if l == ":":
            # Tier header split from its colon — attach only if the line right before it was kept.
            if benefit_lines and i > 0 and offer[i - 1] == benefit_lines[-1]:
                benefit_lines[-1] = benefit_lines[-1].rstrip(":") + ":"
            continue
        if CTA.match(l) or re.match(r"^(From now (to|till)|Valid at$)", l, re.I):
            continue
        m = re.match(r"Promo code:\s*(\S.*)?$", l, re.I)
        if m:
            promo = m.group(1) or (offer[i + 1] if i + 1 < len(offer) else None)
            continue
        if promo and l == promo:
            continue
        benefit_lines.append(l)
    # Tier headers ("OCBC VOYAGE Card, ...:" / "All OCBC Cards:") own the lines after them,
    # up to the next header: "VOYAGE…: 20% off A, 20% off B | All OCBC Cards: 15% off A".
    groups, cur = [], None
    for l in benefit_lines:
        if l.endswith(":"):
            cur = [l, []]
            groups.append(cur)
        elif cur is not None:
            cur[1].append(l)
        else:
            groups.append([None, [l]])
    merged = [(h + " " + ", ".join(ls)) if h else ls[0] for h, ls in groups if ls or h]
    benefit = (" | " if any(h for h, _ in groups) else "; ").join(merged) or " ".join(card[1:])
    if not benefit:
        return None

    terms = merge_fragments([t for t in terms if t.strip()])
    validity = next((t for t in terms if re.search(r"\bvalid\b|from now|available", t, re.I) and re.search(r"\d{4}", t)), "")
    valid_from, valid_to = parse_validity(validity or " ".join(terms))

    # Only set `days` when it restricts the whole offer: a day range in the main (first) offer line
    # or in the validity sentence. A range on a secondary perk (e.g. "free-flow wine Sat-Sun") is not used.
    days = None
    scope = (benefit_lines[0] if benefit_lines else "") + " " + validity
    ranges = {f"{m.group(1)[:3].title()}–{m.group(2)[:3].title()}" for m in DAYRANGE.finditer(scope)}
    if len(ranges) == 1 and len(merged) == 1:
        days = ranges.pop()
    elif re.search(r"\bvalid (only )?on weekdays\b", " ".join(benefit_lines) + " " + validity, re.I):
        days = "Weekdays"

    conditions = []
    for t in terms:
        if t == validity:
            continue  # kept once, as validity_text
        if GENERIC_PAYMENT.search(t):
            rest = GENERIC_PAYMENT.sub("", t).strip()
            if rest:
                conditions.append(rest)
            continue
        conditions.append(t)
    conditions = [c if len(c) <= 200 else c[:197].rstrip() + "…" for c in conditions][:6]

    links = [l for l in item.get("links", []) if "ocbc.com" not in l and not l.startswith("null")]
    tier = re.search(r"(OCBC (?:Premier )?VOYAGE[^:;]*|OCBC Premier VISA Infinite[^:;]*|OCBC 365[^:;]*|OCBC 90°N[^:;]*|OCBC INFINITY[^:;]*|OCBC Rewards[^:;]*):", benefit)
    text_all = " ".join([merchant, benefit, *address, *terms])
    addr = " ".join(address)
    if re.search(r"Malaysia|Kuala Lumpur|Johor|Penang|Selangor|Melaka|\bRM\s?\d", addr + " " + benefit):
        country = "MY"
    elif re.search(r"Indonesia|Jakarta|Bali|Bandung|Surabaya|\bIDR\b|\bRp\s?\d", addr + " " + benefit):
        country = "ID"
    elif re.search(r"Singapore|S\$", addr + " " + benefit + " " + " ".join(terms)):
        country = "SG"
    else:
        country = None

    deal = {
        "id": "ocbc-" + re.sub(r"[^a-z0-9]+", "-", merchant.lower()).strip("-")[:50] + "-" + hashlib.sha1(benefit.encode()).hexdigest()[:6],
        "bank": "OCBC",
        "merchant": merchant,
        "headline": (lambda h: None if not h or benefit.startswith(h) else h)(" ".join(card[1:])),
        "benefit": benefit,
        "deal_type": deal_type(benefit),
        "days": days,
        "valid_from": valid_from,
        "valid_to": valid_to,
        "validity_text": validity or None,
        "promo_code": promo,
        "outlet": "; ".join(address)[:300] or None,
        "country": country,
        "buffet": bool(re.search(r"buffet", text_all, re.I)),
        "card_tiers_note": "Higher tier for: " + tier.group(1) if tier else None,
        "conditions": conditions,
        "booking": links[0] if links else None,
        "source_url": SRC,
        "source_type": "bank_official",
        "verified_at": captured_at,
    }
    return {k: v for k, v in deal.items() if v not in (None, [], "")}


def main(src, dst):
    raw = json.load(open(src))
    today = datetime.date.today().isoformat()
    deals, skipped, expired = [], 0, 0
    for p in sorted(raw["pages"], key=int):
        page = raw["pages"][p]
        for it in page["items"]:
            d = normalize(it, page["captured_at"])
            if not d:
                skipped += 1
                continue
            if d.get("valid_to") and d["valid_to"] < today:
                expired += 1
                continue
            deals.append(d)
    seen, unique = set(), []
    for d in deals:
        if d["id"] not in seen:
            seen.add(d["id"])
            unique.append(d)
    captured = max(raw["pages"][p]["captured_at"] for p in raw["pages"])
    out = {
        "generated_at": captured,
        "private": True,
        "note": "PRIVATE personal snapshot of OCBC's Food & Groceries card-promotions catalogue, read in the owner's own browser. Not for redistribution (OCBC Conditions of Access).",
        "coverage": {"source": SRC, "pages_read": len(raw["pages"]), "offers_seen": sum(len(raw["pages"][p]["items"]) for p in raw["pages"]), "offers_kept": len(unique), "skipped_unparsed": skipped, "dropped_expired": expired},
        "deals": unique,
    }
    with open(dst, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(out["coverage"]))


if __name__ == "__main__":
    main(*sys.argv[1:3])
