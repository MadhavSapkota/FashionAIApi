/**
 * Shared occasion tagging for trends (used by generateTrends.js and node-trends-api).
 */

/** Occasion mapping for outfit categories */
const OCCASION_MAP = {
  'office outfit women': 'work and office',
  'work blazer outfit': 'work and office',
  'business casual women': 'work and office',
  'pencil skirt outfit': 'work and office',
  'blazer dress': 'work and office',
  'tailored trousers': 'work and office',
  'oversized blazer': 'work and office',
  'shirt dress': 'work and office',
  'midi dress': 'work and office',
  'trench coat outfit': 'work and office',
  'minimalist outfit': 'work and office',
  'quiet luxury fashion': 'work and office',
  'capsule wardrobe': 'work and office',

  'casual outfit women': 'casual',
  'weekend outfit': 'casual',
  'mom jeans': 'casual',
  'wide leg jeans': 'casual',
  'graphic tee outfit': 'casual',
  'hoodie dress': 'casual',
  'cargo pants women': 'casual',
  'striped shirt': 'casual',
  'denim skirt': 'casual',
  'bucket hat': 'casual',
  'crossbody bag': 'casual',
  'oversized fit': 'casual',
  'street style fashion': 'casual',
  'y2k fashion': 'casual',
  'straight leg jeans': 'casual',
  'cargo skirt': 'casual',
  'cold shoulder top': 'casual',

  'dating outfit women': 'date night',
  'dinner date outfit': 'date night',
  'romantic date outfit': 'date night',
  'date night outfit': 'date night',
  'slip dress': 'date night',
  'satin dress': 'date night',
  'bodycon dress': 'date night',
  'corset top': 'date night',
  'sheer top': 'date night',
  'halter top': 'date night',
  'off shoulder top': 'date night',
  'wrap dress': 'date night',
  'gold jewelry': 'date night',
  'chain bag': 'date night',
  'statement earrings': 'date night',

  'birthday party dress': 'birthday party',
  'birthday outfit women': 'birthday party',
  'birthday celebration outfit': 'birthday party',
  'party dress': 'birthday party',
  'party wear women': 'birthday party',
  'sequin dress': 'birthday party',
  'glitter dress': 'birthday party',
  'sparkle dress': 'birthday party',
  'celebration outfit': 'birthday party',
  'festive party dress': 'birthday party',
  'birthday glam outfit': 'birthday party',
  'animal print': 'birthday party',
  'platform shoes': 'birthday party',
  'pearl necklace': 'birthday party',
  'romper': 'birthday party',
  'puff sleeve top': 'birthday party',

  'graduation dress': 'graduation',
  'graduation outfit women': 'graduation',
  'graduation photo outfit': 'graduation',
  'graduation dress women': 'graduation',
  'graduation ceremony dress': 'graduation',
  'college graduation outfit': 'graduation',
  'graduation photos outfit': 'graduation',
  'white graduation dress': 'graduation',

  'bridal gown': 'marriage and bride',
  'wedding dress bride': 'marriage and bride',
  'bride outfit': 'marriage and bride',
  'bridal dress': 'marriage and bride',
  'bridal wear': 'marriage and bride',
  'bride lehenga': 'marriage and bride',
  'bridal saree': 'marriage and bride',
  'marriage dress': 'marriage and bride',
  'bride jewelry': 'marriage and bride',

  'festival outfit': 'festivals and events',
  'concert outfit': 'festivals and events',
  'coquette outfit': 'festivals and events',
  'cottagecore dress': 'festivals and events',
  'ballet core fashion': 'festivals and events',
  'color block fashion': 'festivals and events',
  'print mixing': 'festivals and events',
  'maxi skirt outfit': 'festivals and events',
  'cropped jacket': 'festivals and events',
  'boho dress': 'festivals and events',

  'brunch outfit women': 'brunch and cafes',
  'linen summer dress': 'brunch and cafes',
  'square neck top': 'brunch and cafes',
  'tennis skirt': 'brunch and cafes',
  'cropped cardigan': 'brunch and cafes',
  'layered necklace outfit': 'brunch and cafes',
  'coastal grandmother style': 'brunch and cafes',
  'sundress outfit': 'brunch and cafes',

  'vacation outfit women': 'vacation',
  'resort wear women': 'vacation',
  'beach outfit': 'vacation',
  'wide leg pants': 'vacation',
  'maxi dress': 'vacation',
  'summer dress outfit': 'vacation',

  'athleisure outfit': 'gym and athleisure',
  'joggers outfit': 'gym and athleisure',
  'gym outfit women': 'gym and athleisure',
  'leggings outfit': 'gym and athleisure',
  'sports bra outfit': 'gym and athleisure',
  'workout outfit': 'gym and athleisure',

  'formal outfit women': 'formal events',
  'gala dress': 'formal events',
  'cocktail dress': 'formal events',
  'vest outfit': 'formal events',
  'monochrome outfit': 'formal events',
  'leather jacket': 'formal events',
  'mary jane shoes': 'formal events',

  'sustainable fashion': 'casual',
  'neutral tone outfit': 'work and office',
  'ribbed knit': 'casual',
  'knit sweater': 'casual',
  'bomber jacket': 'casual',
  'trending outfits 2025': 'casual',
  'minimalist fashion': 'work and office',
};

const OCCASION_EXTRAS = {
  'birthday party': ['casual', 'festivals and events'],
  graduation: ['formal events', 'work and office', 'date night'],
  'date night': ['casual', 'formal events'],
  'marriage and bride': ['formal events', 'date night'],
  'work and office': ['casual'],
  'festivals and events': ['casual', 'birthday party'],
  'formal events': ['date night'],
  'brunch and cafes': ['casual', 'date night'],
  vacation: ['casual', 'date night'],
  'gym and athleisure': ['casual'],
  casual: ['date night'],
};

function getOccasion(keyword) {
  const lower = keyword.toLowerCase();
  if (OCCASION_MAP[lower]) return OCCASION_MAP[lower];

  if (lower.includes('blazer') || lower.includes('trousers') || lower.includes('office')) return 'work and office';
  if (lower.includes('jogger') || lower.includes('athleisure') || lower.includes('sport')) return 'gym and athleisure';
  if (
    lower.includes('party') ||
    lower.includes('sequin') ||
    lower.includes('glitter') ||
    lower.includes('sparkle') ||
    lower.includes('celebration') ||
    lower.includes('festive') ||
    lower.includes('birthday')
  )
    return 'birthday party';
  if (lower.includes('bridal') || lower.includes('bride') || lower.includes('marriage') || lower.includes('lehenga') || lower.includes('saree'))
    return 'marriage and bride';
  if (lower.includes('formal') || lower.includes('elegant')) return 'formal events';
  if (lower.includes('beach') || lower.includes('vacation') || lower.includes('resort')) return 'vacation';
  if (lower.includes('brunch') || lower.includes('cafe') || lower.includes('sunday')) return 'brunch and cafes';
  if (lower.includes('festival') || lower.includes('concert') || lower.includes('boho')) return 'festivals and events';
  if (lower.includes('graduation') || lower.includes('cap and gown')) return 'graduation';
  if (lower.includes('dating') || lower.includes('dinner date') || lower.includes('romantic date')) return 'date night';
  if (lower.includes('date') || lower.includes('night') || lower.includes('dinner')) return 'date night';

  return 'casual';
}

function getOccasionTags(keyword) {
  const primary = getOccasion(keyword);
  const tags = new Set([primary]);
  const extras = OCCASION_EXTRAS[primary];
  if (extras) extras.forEach((t) => tags.add(t));
  return [...tags];
}

module.exports = {
  OCCASION_MAP,
  OCCASION_EXTRAS,
  getOccasion,
  getOccasionTags,
};
