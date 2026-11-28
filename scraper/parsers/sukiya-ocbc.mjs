// Suki-Ya's own OCBC page (https://www.suki-ya.com.sg/promotions/ocbc). See _creative-eateries.mjs.
import { parseCreativeEateries } from './_creative-eateries.mjs';

export default function parse({ text }) {
  return parseCreativeEateries({ text, idPrefix: 'sukiya-ocbc' });
}
