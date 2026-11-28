// Suki-Ya's own Citibank page (https://www.suki-ya.com.sg/promotions/citibank-promo). See _creative-eateries.mjs.
import { parseCreativeEateries } from './_creative-eateries.mjs';

export default function parse({ text }) {
  return parseCreativeEateries({ text, idPrefix: 'sukiya-citi' });
}
