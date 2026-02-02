#!/usr/bin/env node
/**
 * Fashion Trends Data Extraction Script
 * Runs in GitHub Actions every 6 hours. Fetches Google Trends + Unsplash,
 * computes averageInterest, trendSlope, score; writes data/trends.json.
 * No server, no Express — static JSON for GitHub Pages.
 */

const fs = require('fs');
const path = require('path');
const googleTrends = require('google-trends-api');

const KEYWORDS = [
  // Work and Office
  'office outfit women',
  'work blazer outfit',
  'business casual women',
  'pencil skirt outfit',
  'blazer dress',
  'tailored trousers',
  'oversized blazer',
  'shirt dress',
  'midi dress',
  'trench coat outfit',
  'minimalist outfit',
  'quiet luxury fashion',
  'capsule wardrobe',
  
  // Casual
  'casual outfit women',
  'weekend outfit',
  'mom jeans',
  'wide leg jeans',
  'graphic tee outfit',
  'hoodie dress',
  'cargo pants women',
  'striped shirt',
  'denim skirt',
  'bucket hat',
  'crossbody bag',
  'oversized fit',
  'street style fashion',
  'y2k fashion',
  
  // Date Night
  'date night outfit',
  'slip dress',
  'satin dress',
  'bodycon dress',
  'corset top',
  'sheer top',
  'halter top',
  'off shoulder top',
  'wrap dress',
  'gold jewelry',
  'chain bag',
  'statement earrings',
  
  // Birthday Party
  'birthday outfit women',
  'party dress',
  'sequin dress',
  'animal print',
  'platform shoes',
  'pearl necklace',
  'romper',
  'puff sleeve top',
  
  // Marriage and Bride
  'bridal gown',
  'wedding dress bride',
  'bride outfit',
  'bridal dress',
  'bridal wear',
  'bride lehenga',
  'bridal saree',
  'marriage dress',
  'bride jewelry',
  
  // Festivals and Events
  'festival outfit',
  'concert outfit',
  'coquette outfit',
  'cottagecore dress',
  'ballet core fashion',
  'color block fashion',
  'print mixing',
  'maxi skirt outfit',
  'cropped jacket',
  'boho dress',
  
  // Brunch and Cafes
  'brunch outfit women',
  'linen summer dress',
  'square neck top',
  'tennis skirt',
  'cropped cardigan',
  'layered necklace outfit',
  'coastal grandmother style',
  'sundress outfit',
  
  // Vacation
  'vacation outfit women',
  'resort wear women',
  'beach outfit',
  'wide leg pants',
  'maxi dress',
  'summer dress outfit',
  
  // Gym and Athleisure
  'athleisure outfit',
  'joggers outfit',
  'gym outfit women',
  'leggings outfit',
  'sports bra outfit',
  'workout outfit',
  
  // Formal Events
  'formal outfit women',
  'gala dress',
  'cocktail dress',
  'vest outfit',
  'monochrome outfit',
  'leather jacket',
  'mary jane shoes',
  
  // Extra trending items
  'sustainable fashion',
  'neutral tone outfit',
  'straight leg jeans',
  'cargo skirt',
  'ribbed knit',
  'knit sweater',
  'bomber jacket',
  'cold shoulder top',
  'trending outfits 2025',
  'minimalist fashion',
];

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'trends.json');
const TREND_SCORE_THRESHOLD = Number(process.env.TREND_SCORE_THRESHOLD) ?? 0;
const IMAGES_PER_TREND = Math.min(5, Math.max(3, Number(process.env.IMAGES_PER_TREND) || 4));
const DAYS_AGO = 90;
const GEO = 'US';
const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 2500;

const SEASON_KEYWORDS = {
  summer: ['summer', 'linen', 'sundress', 'beach', 'resort'],
  winter: ['winter', 'coat', 'wool', 'layered', 'boots'],
  fall: ['fall', 'autumn', 'sweater', 'jacket', 'plaid'],
  spring: ['spring', 'floral', 'pastel', 'light'],
};

/** Occasion mapping for outfit categories */
const OCCASION_MAP = {
  // Work and Office
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
  
  // Casual
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
  
  // Date Night
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
  
  // Birthday Party
  'birthday outfit women': 'birthday party',
  'party dress': 'birthday party',
  'sequin dress': 'birthday party',
  'animal print': 'birthday party',
  'platform shoes': 'birthday party',
  'pearl necklace': 'birthday party',
  'romper': 'birthday party',
  'puff sleeve top': 'birthday party',
  
  // Marriage and Bride
  'bridal gown': 'marriage and bride',
  'wedding dress bride': 'marriage and bride',
  'bride outfit': 'marriage and bride',
  'bridal dress': 'marriage and bride',
  'bridal wear': 'marriage and bride',
  'bride lehenga': 'marriage and bride',
  'bridal saree': 'marriage and bride',
  'marriage dress': 'marriage and bride',
  'bride jewelry': 'marriage and bride',
  
  // Festivals and Events
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
  
  // Brunch and Cafes
  'brunch outfit women': 'brunch and cafes',
  'linen summer dress': 'brunch and cafes',
  'square neck top': 'brunch and cafes',
  'tennis skirt': 'brunch and cafes',
  'cropped cardigan': 'brunch and cafes',
  'layered necklace outfit': 'brunch and cafes',
  'coastal grandmother style': 'brunch and cafes',
  'sundress outfit': 'brunch and cafes',
  
  // Vacation
  'vacation outfit women': 'vacation',
  'resort wear women': 'vacation',
  'beach outfit': 'vacation',
  'wide leg pants': 'vacation',
  'maxi dress': 'vacation',
  'summer dress outfit': 'vacation',
  
  // Gym and Athleisure
  'athleisure outfit': 'gym and athleisure',
  'joggers outfit': 'gym and athleisure',
  'gym outfit women': 'gym and athleisure',
  'leggings outfit': 'gym and athleisure',
  'sports bra outfit': 'gym and athleisure',
  'workout outfit': 'gym and athleisure',
  
  // Formal Events
  'formal outfit women': 'formal events',
  'gala dress': 'formal events',
  'cocktail dress': 'formal events',
  'vest outfit': 'formal events',
  'monochrome outfit': 'formal events',
  'leather jacket': 'formal events',
  'mary jane shoes': 'formal events',
  
  // Extra items with sensible defaults
  'sustainable fashion': 'casual',
  'neutral tone outfit': 'work and office',
  'ribbed knit': 'casual',
  'knit sweater': 'casual',
  'bomber jacket': 'casual',
  'trending outfits 2025': 'casual',
  'minimalist fashion': 'work and office',
};

function getOccasion(keyword) {
  const lower = keyword.toLowerCase();
  if (OCCASION_MAP[lower]) return OCCASION_MAP[lower];
  
  // Fallback detection based on keyword content
  if (lower.includes('blazer') || lower.includes('trousers') || lower.includes('office')) return 'work and office';
  if (lower.includes('jogger') || lower.includes('athleisure') || lower.includes('sport')) return 'gym and athleisure';
  if (lower.includes('party') || lower.includes('sequin') || lower.includes('glitter')) return 'birthday party';
  if (lower.includes('bridal') || lower.includes('bride') || lower.includes('marriage') || lower.includes('lehenga') || lower.includes('saree')) return 'marriage and bride';
  if (lower.includes('formal') || lower.includes('elegant')) return 'formal events';
  if (lower.includes('beach') || lower.includes('vacation') || lower.includes('resort')) return 'vacation';
  if (lower.includes('brunch') || lower.includes('cafe') || lower.includes('sunday')) return 'brunch and cafes';
  if (lower.includes('festival') || lower.includes('concert') || lower.includes('boho')) return 'festivals and events';
  if (lower.includes('date') || lower.includes('night') || lower.includes('dinner')) return 'date night';
  
  return 'casual';
}

function getSeason(keyword) {
  const lower = keyword.toLowerCase();
  for (const [season, terms] of Object.entries(SEASON_KEYWORDS)) {
    if (terms.some((t) => lower.includes(t))) return season;
  }
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function getWhyTrending(keyword, score) {
  if (score >= 70) return `Strong search interest for "${keyword}" on Google Trends this period.`;
  if (score >= 40) return `Growing search interest for "${keyword}" on Google Trends.`;
  return `Steady search interest for "${keyword}" on Google Trends.`;
}

/**
 * Fetch interest-over-time from Google Trends; return { averageInterest, trendSlope, score }.
 */
function fetchTrendMetrics(keyword) {
  const endTime = new Date();
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - DAYS_AGO);

  return googleTrends
    .interestOverTime({ keyword, startTime, endTime, geo: GEO })
    .then((res) => {
      const data = JSON.parse(res);
      const timeline = data?.default?.timelineData || data?.default?.timeline_data || [];
      if (!Array.isArray(timeline) || timeline.length === 0) {
        return { keyword, averageInterest: 0, trendSlope: 0, score: 0 };
      }

      const values = timeline
        .map((d) => {
          if (d.values?.[0] != null) {
            const v = d.values[0];
            const n = typeof v.extracted_value !== 'undefined' ? Number(v.extracted_value) : Number(v.value ?? v);
            return Number.isNaN(n) ? 0 : Math.max(0, n);
          }
          if (typeof d.value !== 'undefined') return Number(d.value);
          if (typeof d.extracted_value !== 'undefined') return Number(d.extracted_value);
          return 0;
        })
        .filter((v) => !Number.isNaN(v) && v >= 0);

      if (values.length === 0) {
        return { keyword, averageInterest: 0, trendSlope: 0, score: 0 };
      }

      const averageInterest = values.reduce((a, b) => a + b, 0) / values.length;
      const first = values[0];
      const last = values[values.length - 1];
      const trendSlope = values.length > 1 ? (last - first) / (values.length - 1) : 0;
      const score = Math.round(
        Math.min(100, Math.max(0, averageInterest + Math.max(0, trendSlope) * 2))
      );

      return {
        keyword,
        averageInterest: Math.round(averageInterest * 10) / 10,
        trendSlope: Math.round(trendSlope * 100) / 100,
        score,
      };
    })
    .catch((err) => {
      console.error(`Google Trends error for "${keyword}":`, err.message);
      return { keyword, averageInterest: 0, trendSlope: 0, score: 0 };
    });
}

/** Guaranteed queries — women's fashion only. */
const GUARANTEED_IMAGE_QUERIES = [
  'women fashion outfit',
  'women street style fashion',
  'women clothing style',
  'womenswear outfit style',
];

/**
 * Ensure every search query includes women's fashion context to avoid random/male images.
 */
function makeFashionQuery(query) {
  const lower = query.toLowerCase();
  const hasWomen = lower.includes('women') || lower.includes('woman') || lower.includes('female') || lower.includes('womenswear');
  const hasFashion = lower.includes('fashion') || lower.includes('outfit') || lower.includes('dress') || lower.includes('clothing');
  if (hasWomen && hasFashion) {
    return query;
  }
  if (hasFashion) {
    return `women ${query}`;
  }
  return `women ${query} fashion outfit`;
}

/**
 * Fetch image URLs from Unsplash Search API for a given search query.
 * Retries once on 429/503 to handle rate limits.
 */
async function fetchImagesForQuery(query, count, accessKey, retried = false) {
  if (!accessKey || accessKey === 'your_unsplash_access_key_here') {
    return [];
  }
  const fashionQuery = makeFashionQuery(query);
  const encoded = encodeURIComponent(fashionQuery);
  const url = `https://api.unsplash.com/search/photos?query=${encoded}&per_page=${Math.min(count, 10)}&client_id=${accessKey}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    if ((res.status === 429 || res.status === 503) && !retried) {
      await new Promise((r) => setTimeout(r, 2000));
      return fetchImagesForQuery(query, count, accessKey, true);
    }
    return [];
  }
  const data = await res.json();
  const results = data.results || [];
  return results
    .slice(0, count)
    .map((p) => p.urls?.regular || p.urls?.small || p.urls?.thumb)
    .filter(Boolean);
}

/** Fallback search terms — all fashion/outfit/dress/clothing to avoid random images. */
function getFallbackSearchTerms(keyword) {
  const lower = keyword.toLowerCase();
  const fallbacks = {
    'oversized fit': ['oversized fashion outfit', 'oversized clothing', 'street style fashion'],
    'cargo skirt': ['cargo skirt outfit', 'skirt outfit fashion', 'utility skirt outfit'],
    'color block fashion': ['colorful fashion outfit', 'bold color dress', 'women fashion outfit'],
    'print mixing': ['pattern dress fashion', 'mixed print dress', 'floral dress outfit'],
    'neutral tone outfit': ['neutral fashion outfit', 'beige outfit dress', 'minimal fashion outfit'],
    'coastal grandmother style': ['linen outfit fashion', 'relaxed fashion style', 'summer dress outfit'],
    'trending outfits 2025': ['fashion trends outfit', 'women fashion 2025', 'fashion outfit style'],
    'ballet core fashion': ['ballet core outfit', 'pink fashion dress', 'feminine fashion outfit'],
    'street style fashion': ['street style outfit', 'urban fashion outfit', 'women fashion street'],
    'linen summer dress': ['linen dress outfit', 'summer dress fashion', 'casual dress outfit'],
    'trench coat outfit': ['trench coat fashion', 'coat outfit women', 'women fashion coat'],
    'tailored trousers': ['tailored pants outfit', 'wide leg pants fashion', 'women fashion trousers'],
    'coquette outfit': ['feminine fashion outfit', 'lace dress outfit', 'women fashion dress'],
    'maxi skirt outfit': ['maxi skirt fashion', 'long skirt dress', 'women fashion skirt'],
    'joggers outfit': ['joggers outfit fashion', 'athleisure outfit', 'casual fashion outfit'],
    'minimalist fashion': ['minimal fashion outfit', 'simple fashion dress', 'women fashion minimal'],
    'cottagecore dress': ['floral dress outfit', 'cottagecore fashion', 'women fashion dress'],
    'monochrome outfit': ['monochrome fashion outfit', 'black white dress', 'women fashion monochrome'],
    'cold shoulder top': ['cold shoulder dress', 'off shoulder top fashion', 'women fashion top'],
    'graphic tee outfit': ['graphic tee fashion', 'printed t-shirt outfit', 'casual fashion outfit'],
    'minimalist outfit': ['minimal fashion outfit', 'simple outfit dress', 'women fashion outfit'],
    'quiet luxury fashion': ['minimal fashion elegant', 'elegant outfit fashion', 'women fashion luxury'],
    'athleisure outfit': ['athleisure fashion outfit', 'sporty outfit fashion', 'women fashion athleisure'],
    'neutral tone outfit': ['neutral fashion outfit', 'beige fashion dress', 'women fashion outfit'],
    'layered necklace outfit': ['layered necklace fashion', 'jewelry fashion outfit', 'women fashion accessories'],
    'bridal gown': ['wedding dress bride', 'bride dress', 'women wedding dress'],
    'wedding dress bride': ['bridal dress', 'wedding dress', 'bride outfit'],
    'bride outfit': ['wedding dress', 'bridal wear', 'bride dress'],
    'bridal dress': ['wedding dress', 'bridal gown', 'bride dress'],
    'bridal wear': ['wedding dress', 'bridal gown', 'bride outfit'],
    'bride lehenga': ['lehenga bride', 'indian bride', 'wedding dress'],
    'bridal saree': ['bride saree', 'wedding saree', 'indian wedding dress'],
    'marriage dress': ['wedding dress', 'bridal dress', 'bride outfit'],
    'bride jewelry': ['bridal jewelry', 'wedding jewelry', 'bride accessories'],
  };
  const w1 = keyword.split(' ')[0];
  const w2 = keyword.split(' ').slice(0, 2).join(' ');
  return fallbacks[lower] || [
    keyword.includes('outfit') || keyword.includes('dress') || keyword.includes('fashion') ? keyword : `${w2} fashion`,
    `${w1} fashion outfit`,
    'women fashion outfit',
  ];
}

/**
 * Fetch images for keyword, with fallbacks if primary search returns nothing.
 */
async function fetchImagesForKeyword(keyword, count, accessKey) {
  let urls = await fetchImagesForQuery(keyword, count, accessKey);
  if (urls.length > 0) return urls;
  const fallbacks = getFallbackSearchTerms(keyword);
  for (const term of fallbacks) {
    urls = await fetchImagesForQuery(term, count, accessKey);
    if (urls.length > 0) return urls;
    await new Promise((r) => setTimeout(r, 200));
  }
  urls = await fetchImagesForQuery('women fashion outfit style', count, accessKey);
  return urls;
}

async function main() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY || '';

  // Fetch Google Trends in batches to avoid rate limiting (more keywords return real data)
  const metricsList = [];
  for (let i = 0; i < KEYWORDS.length; i += BATCH_SIZE) {
    const batch = KEYWORDS.slice(i, i + BATCH_SIZE);
    console.log('Fetching batch', Math.floor(i / BATCH_SIZE) + 1, '—', batch.length, 'keywords');
    const results = await Promise.all(batch.map((kw) => fetchTrendMetrics(kw)));
    metricsList.push(...results);
    if (i + BATCH_SIZE < KEYWORDS.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // ALWAYS output every keyword: merge Google data with full list, sort by score desc
  const byKw = new Map(metricsList.map((m) => [m.keyword, m]));
  const toOutput = KEYWORDS.map((kw) => byKw.get(kw) || { keyword: kw, averageInterest: 0, trendSlope: 0, score: 0 })
    .sort((a, b) => b.score - a.score);

  console.log('Trends to output:', toOutput.length, '(with score > 0:', toOutput.filter((m) => m.score > 0).length, ')');

  // Build guaranteed image pool first — real Unsplash URLs for trends with no results
  let imagePool = [];
  if (accessKey) {
    for (const q of GUARANTEED_IMAGE_QUERIES) {
      const urls = await fetchImagesForQuery(q, 15, accessKey);
      imagePool.push(...urls);
      await new Promise((r) => setTimeout(r, 300));
    }
    imagePool = [...new Set(imagePool)];
    console.log('Image pool size:', imagePool.length);
  }

  let poolOffset = 0;
  const imagesByKeyword = {};
  for (const m of toOutput) {
    let urls = await fetchImagesForKeyword(m.keyword, IMAGES_PER_TREND, accessKey);
    if (urls.length === 0 && imagePool.length > 0) {
      const start = poolOffset % imagePool.length;
      urls = [];
      for (let i = 0; i < IMAGES_PER_TREND; i++) {
        urls.push(imagePool[(start + i) % imagePool.length]);
      }
      poolOffset += IMAGES_PER_TREND;
    }
    imagesByKeyword[m.keyword] = urls;
    await new Promise((r) => setTimeout(r, 250));
  }

  const trends = toOutput.map((m) => ({
    name: m.keyword,
    score: m.score,
    averageInterest: m.averageInterest,
    trendSlope: m.trendSlope,
    images: (imagesByKeyword[m.keyword]?.length ? imagesByKeyword[m.keyword] : imagePool.slice(0, IMAGES_PER_TREND)) || [],
    whyTrending: getWhyTrending(m.keyword, m.score),
    season: getSeason(m.keyword),
    occasion: getOccasion(m.keyword),
  }));

  const byOccasion = {};
  for (const t of trends) {
    const occ = t.occasion || 'casual';
    if (!byOccasion[occ]) byOccasion[occ] = [];
    byOccasion[occ].push(t);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    updateFrequency: '6 hours',
    trends,
    byOccasion,
  };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_FILE, '—', trends.length, 'trends');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
