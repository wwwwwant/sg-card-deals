#!/usr/bin/env python3
"""Filter the deal snapshots bundled in this skill's data/ folder. Stdlib only.

  python3 scripts/find_deals.py --date 2026-11-26 --q "buffet orchard" --bank OCBC
  python3 scripts/find_deals.py --q "hotpot" --buffet
  python3 scripts/find_deals.py --stats

--q      words matched (case-insensitive, any word) against merchant, benefit, headline, outlet; ranked by hits
--date   dining date, YYYY-MM-DD (default: today in Singapore)
--bank   e.g. OCBC (default: all)
--country SG (default) / MY / ID / any
--buffet only offers that mention a buffet
--limit  max results (default 15)
Prints one JSON object per line, best matches first. Offers outside valid_from..valid_to, or whose
`days` exclude the date, are dropped; anything else must still be checked against `conditions`.
"""
import argparse, datetime, glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def day_ok(days, date):
    if not days:
        return True
    wd = date.weekday()
    if days == "Weekdays":
        return wd < 5
    if days in ("Weekends", "Sat–Sun"):
        return wd >= 5
    m = re.match(r"(\w{3})–(\w{3})$", days)
    if not m or m.group(1) not in DOW or m.group(2) not in DOW:
        return True  # unknown shape: keep, let the reader check
    a, b = DOW.index(m.group(1)), DOW.index(m.group(2))
    return a <= wd <= b if a <= b else (wd >= a or wd <= b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--q", default="")
    ap.add_argument("--date")
    ap.add_argument("--bank")
    ap.add_argument("--country", default="SG")
    ap.add_argument("--buffet", action="store_true")
    ap.add_argument("--limit", type=int, default=15)
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args()

    sg_now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
    date = datetime.date.fromisoformat(a.date) if a.date else sg_now.date()
    files = sorted(glob.glob(os.path.join(HERE, "..", "data", "*.json")))
    deals, meta = [], []
    for f in files:
        d = json.load(open(f))
        meta.append({"file": os.path.basename(f), "generated_at": d.get("generated_at"), "coverage": d.get("coverage"), "deals": len(d.get("deals", []))})
        deals += d.get("deals", [])
    if a.stats:
        print(json.dumps({"date": date.isoformat(), "snapshots": meta}, ensure_ascii=False))
        return

    words = [w for w in re.split(r"\s+", a.q.lower()) if w]
    out = []
    for x in deals:
        if a.bank and x.get("bank", "").lower() != a.bank.lower():
            continue
        if a.country != "any" and x.get("country") not in (a.country, None):
            continue
        if a.buffet and not x.get("buffet"):
            continue
        if x.get("valid_from") and x["valid_from"] > date.isoformat():
            continue
        if x.get("valid_to") and x["valid_to"] < date.isoformat():
            continue
        if not day_ok(x.get("days"), date):
            continue
        hay = " ".join(str(x.get(k, "")) for k in ("merchant", "benefit", "headline", "outlet")).lower()
        score = sum(hay.count(w) for w in words)
        if words and score == 0:
            continue
        out.append((score, x))
    out.sort(key=lambda t: -t[0])
    print(json.dumps({"date": date.isoformat(), "weekday": DOW[date.weekday()], "matches": len(out), "shown": min(len(out), a.limit), "snapshots": [m["file"] + " @ " + str(m["generated_at"]) for m in meta]}, ensure_ascii=False))
    for _, x in out[: a.limit]:
        keep = {k: x[k] for k in ("bank", "merchant", "benefit", "headline", "days", "valid_from", "valid_to", "validity_text", "promo_code", "outlet", "card_tiers_note", "conditions", "booking", "source_url", "verified_at") if x.get(k)}
        print(json.dumps(keep, ensure_ascii=False))


if __name__ == "__main__":
    main()
