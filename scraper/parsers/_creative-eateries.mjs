// Shared parser for Creative Eateries (Suki-Ya) bank promotion pages on suki-ya.com.sg (Squarespace).
// Page shape (Nov 2026):
//   <offer line> e.g. "30% off Premium Buffet Upgrade from Mon - Thu."
//   <offer line> e.g. "1 Complimentary Premium Buffet Upgrade with every 3 Premium Buffet Purchased from Fri - Sun."
//   T&Cs
//   • ... "Valid from 1 February 2026 to 31 January 2027."  or  "The Promotion period is from 2 January 2026 to 30 December 2026"
// Everything returned is read from the page; a line that changes shape is skipped, never guessed.
const MONTHS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
const isoDate = (d, m, y) => (MONTHS[m.toLowerCase()] ? `${y}-${MONTHS[m.toLowerCase()]}-${String(d).padStart(2, '0')}` : undefined);
const BOILERPLATE = /reserves? the right|shall not be responsible|shall not at any time|decision on all matters|governed by the laws|terms and conditions apply|Contracts \(Rights of Third Parties\)/i;
const DAY = /from (Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s*[-–]\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*/i;

const dealTypeOf = (l) =>
  /1[- ]for[- ]1/i.test(l) ? '1-for-1' : /\d+\s*%\s*off/i.test(l) ? 'percent_off' : /\$\s*\d+\s*off/i.test(l) ? 'amount_off' : /complimentary|free/i.test(l) ? 'freebie' : 'other';

export function parseCreativeEateries({ text, idPrefix, merchant = 'Suki-Ya' }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const range = text.match(/from (\d{1,2}) (\w+) (\d{4}) to (\d{1,2}) (\w+) (\d{4})/i);
  const valid_from = range ? isoDate(range[1], range[2], range[3]) : undefined;
  const valid_to = range ? isoDate(range[4], range[5], range[6]) : undefined;

  const tc = lines.findIndex((l) => /^T&Cs?$/i.test(l));
  const conditions = (tc >= 0 ? lines.slice(tc + 1) : lines)
    .filter((l) => l.startsWith('•'))
    .map((l) => l.replace(/^•\s*/, ''))
    .filter((l) => !BOILERPLATE.test(l) && !/^(Valid from|The Promotion period)/i.test(l));

  const offers = (tc >= 0 ? lines.slice(0, tc) : lines).filter((l) => DAY.test(l) && /(off|complimentary|1[- ]for[- ]1)/i.test(l));
  return offers.map((benefit) => {
    const m = benefit.match(DAY);
    const days = `${m[1].slice(0, 3)}–${m[2].slice(0, 3)}`;
    const part = /^(Mon|Tue|Wed|Thu)/i.test(m[1]) ? 'weekday' : 'weekend';
    return {
      id: `${idPrefix}-${part}`,
      merchant,
      cuisine: 'Japanese hotpot buffet',
      benefit,
      deal_type: dealTypeOf(benefit),
      days,
      valid_from,
      valid_to,
      conditions,
      booking: 'https://www.suki-ya.com.sg/reservations',
    };
  });
}
