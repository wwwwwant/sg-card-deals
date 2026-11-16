// Suki-Ya's own OCBC page. Lines seen on the page (Nov 2026):
//   "30% off Premium Buffet Upgrade from Mon - Thu."
//   "$25 off total bill with purchase of 4 Premium Buffet from Fri - Sun."
//   "•Valid from 1 February 2026 to 31 January 2027."
// Everything returned is read from the page; if a line changes shape, the deal is skipped.
const MONTHS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
const isoDate = (d, m, y) => (MONTHS[m.toLowerCase()] ? `${y}-${MONTHS[m.toLowerCase()]}-${String(d).padStart(2, '0')}` : undefined);

// Legal boilerplate that doesn't help someone decide where to eat.
const BOILERPLATE = /reserves the right|shall not be responsible|decision on all matters|governed by the laws|terms and conditions apply/i;

const daysOf = (line) => {
  const m = line.match(/from (Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s*[-–]\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*/i);
  return m ? `${m[1]}–${m[2]}` : undefined;
};
const dealTypeOf = (line) => (/\d+%\s*off/i.test(line) ? 'percent_off' : /\$\d+\s*off/i.test(line) ? 'amount_off' : /1[- ]for[- ]1/i.test(line) ? '1-for-1' : 'other');

export default function parse({ text }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const range = text.match(/Valid from (\d{1,2}) (\w+) (\d{4}) to (\d{1,2}) (\w+) (\d{4})/i);
  const valid_from = range ? isoDate(range[1], range[2], range[3]) : undefined;
  const valid_to = range ? isoDate(range[4], range[5], range[6]) : undefined;
  const conditions = lines
    .filter((l) => l.startsWith('•'))
    .map((l) => l.replace(/^•\s*/, ''))
    .filter((l) => !BOILERPLATE.test(l) && !/^Valid from/i.test(l));

  const base = { merchant: 'Suki-Ya', cuisine: 'Japanese hotpot buffet', valid_from, valid_to, conditions, booking: 'https://www.suki-ya.com.sg' };
  const deals = [];
  const weekday = lines.find((l) => /off Premium Buffet Upgrade/i.test(l));
  if (weekday) deals.push({ id: 'sukiya-ocbc-weekday', ...base, benefit: weekday, deal_type: dealTypeOf(weekday), days: daysOf(weekday) });
  const weekend = lines.find((l) => /off total bill with purchase of \d+ Premium/i.test(l));
  if (weekend) deals.push({ id: 'sukiya-ocbc-weekend', ...base, benefit: weekend, deal_type: dealTypeOf(weekend), days: daysOf(weekend) });
  return deals;
}
