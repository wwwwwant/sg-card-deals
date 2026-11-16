// Template for a source parser. Copy to scraper/parsers/<source-id>.mjs.
// Receives the rendered page text and links; returns deals matching schema/deal.schema.json.
// Only return what the page actually says — never guess dates, days or amounts.
export default function parse({ text, links, source }) {
  const deals = [];
  // Example: find promotion links on a catalogue page, one deal per card.
  // for (const l of links.filter((l) => /promotions\//.test(l.href))) {
  //   deals.push({
  //     id: `${source.id}:${l.href.split('/').pop()}`,
  //     merchant: l.text.split('\n')[0],
  //     benefit: l.text.split('\n')[1] ?? '',
  //     source_url: l.href,
  //   });
  // }
  return deals;
}
