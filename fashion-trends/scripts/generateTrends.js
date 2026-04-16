#!/usr/bin/env node
/**
 * Fashion Trends Data Extraction Script
 * Runs in GitHub Actions every 6 hours. Fetches Google Trends + Unsplash,
 * computes averageInterest, trendSlope, score; writes data/trends.json
 * (trends ordered: strongest rise / “new” momentum first, then score).
 * No server, no Express — static JSON for GitHub Pages.
 */

const fs = require('fs');
const path = require('path');
const googleTrends = require('google-trends-api');
const { getOccasion, getOccasionTags } = require('./occasionLib');
const { computeHarmonyScore } = require('./harmonyScore');

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
  
  // Date Night / Dating
  'dating outfit women',
  'dinner date outfit',
  'romantic date outfit',
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
  'birthday party dress',
  'birthday outfit women',
  'birthday celebration outfit',
  'party dress',
  'party wear women',
  'sequin dress',
  'glitter dress',
  'sparkle dress',
  'celebration outfit',
  'festive party dress',
  'birthday glam outfit',
  'animal print',
  'platform shoes',
  'pearl necklace',
  'romper',
  'puff sleeve top',
  
  // Graduation
  'graduation dress',
  'graduation outfit women',
  'graduation photo outfit',
  'graduation dress women',
  'graduation ceremony dress',
  'college graduation outfit',
  'graduation photos outfit',
  'white graduation dress',
  
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
/** If true (default), prepend fresh run to prior `trends.json` entries (same `name` kept once — new wins). */
const MERGE_PREVIOUS_TRENDS =
  process.env.MERGE_PREVIOUS_TRENDS !== '0' && process.env.MERGE_PREVIOUS_TRENDS !== 'false';
/** Max rows after merge (0 = unlimited). Keeps new run first; trims oldest from the tail. */
const MERGED_TRENDS_MAX = Math.max(0, Number(process.env.MERGED_TRENDS_MAX) || 0);
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
    'birthday party dress': ['birthday outfit', 'party dress', 'sequin dress outfit'],
    'birthday celebration outfit': ['birthday outfit', 'party dress', 'celebration dress'],
    'party wear women': ['party dress', 'party outfit', 'celebration outfit'],
    'glitter dress': ['sequin dress', 'sparkle dress', 'party dress outfit'],
    'sparkle dress': ['sequin dress', 'party dress', 'glitter outfit'],
    'celebration outfit': ['party dress', 'birthday outfit', 'festive dress'],
    'festive party dress': ['party dress', 'sequin dress', 'celebration outfit'],
    'graduation dress': ['graduation outfit', 'formal dress', 'white dress outfit'],
    'graduation outfit women': ['graduation dress', 'formal dress women', 'elegant dress'],
    'graduation photo outfit': ['graduation dress', 'formal outfit', 'white dress'],
    'graduation dress women': ['graduation outfit', 'formal dress', 'elegant dress outfit'],
    'graduation ceremony dress': ['graduation dress', 'formal dress', 'ceremony outfit'],
    'college graduation outfit': ['graduation dress', 'graduation outfit', 'formal dress women'],
    'dating outfit women': ['date night outfit', 'romantic outfit', 'women dress'],
    'dinner date outfit': ['date night dress', 'elegant outfit', 'women fashion'],
    'romantic date outfit': ['date night outfit', 'romantic dress', 'women fashion'],
    'graduation photos outfit': ['graduation dress', 'formal dress', 'white dress'],
    'white graduation dress': ['graduation dress', 'white dress formal', 'women fashion'],
    'birthday glam outfit': ['party dress', 'glitter dress', 'birthday outfit'],
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

function loadPreviousTrendsForMerge() {
  try {
    if (!fs.existsSync(OUTPUT_FILE)) return [];
    const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
    const prev = JSON.parse(raw);
    return Array.isArray(prev.trends) ? prev.trends : [];
  } catch (e) {
    console.warn('Merge: could not read previous trends.json —', e.message);
    return [];
  }
}

/**
 * New run first, then older rows not in this run (by `name`). Dedupes the tail by name.
 */
function mergeNewTrendsFirst(freshTrends, previousList) {
  const seen = new Set(freshTrends.map((t) => t.name));
  const carry = [];
  for (const t of previousList) {
    if (!t || typeof t.name !== 'string' || seen.has(t.name)) continue;
    seen.add(t.name);
    carry.push(t);
  }
  let merged = [...freshTrends, ...carry];
  if (MERGED_TRENDS_MAX > 0 && merged.length > MERGED_TRENDS_MAX) {
    merged = merged.slice(0, MERGED_TRENDS_MAX);
  }
  return { merged, carryCount: carry.length };
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

  // ALWAYS output every keyword: merge Google data with full list — newest momentum first
  // (trendSlope = recent rise; then score so clients see “what’s heating up” at the top)
  const byKw = new Map(metricsList.map((m) => [m.keyword, m]));
  const toOutput = KEYWORDS.map((kw) => byKw.get(kw) || { keyword: kw, averageInterest: 0, trendSlope: 0, score: 0 })
    .sort((a, b) => {
      const dSlope = b.trendSlope - a.trendSlope;
      if (dSlope !== 0) return dSlope;
      return b.score - a.score;
    });

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

  const trends = toOutput.map((m) => {
    const occasion = getOccasion(m.keyword);
    const occasions = getOccasionTags(m.keyword);
    const harmonyScore = computeHarmonyScore({
      score: m.score,
      averageInterest: m.averageInterest,
      trendSlope: m.trendSlope,
    });
    return {
      name: m.keyword,
      score: m.score,
      harmonyScore,
      averageInterest: m.averageInterest,
      trendSlope: m.trendSlope,
      images: (imagesByKeyword[m.keyword]?.length ? imagesByKeyword[m.keyword] : imagePool.slice(0, IMAGES_PER_TREND)) || [],
      whyTrending: getWhyTrending(m.keyword, m.score),
      season: getSeason(m.keyword),
      occasion,
      occasions,
    };
  });

  let trendsForPayload = trends;
  if (MERGE_PREVIOUS_TRENDS) {
    const previous = loadPreviousTrendsForMerge();
    const { merged, carryCount } = mergeNewTrendsFirst(trends, previous);
    trendsForPayload = merged;
    console.log(`Merge: fresh ${trends.length} + carried ${carryCount} → ${merged.length} total`);
  }

  const byOccasion = {};
  for (const t of trendsForPayload) {
    for (const occ of t.occasions || []) {
      if (!byOccasion[occ]) byOccasion[occ] = [];
      byOccasion[occ].push(t);
    }
  }
  byOccasion.all = [...trendsForPayload];
  byOccasion.dating = byOccasion['date night'] ? [...byOccasion['date night']] : [];

  const occasionKeys = [
    'all',
    'dating',
    'date night',
    'birthday party',
    'graduation',
    'marriage and bride',
    'work and office',
    'casual',
    'formal events',
    'festivals and events',
    'brunch and cafes',
    'vacation',
    'gym and athleisure',
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    updateFrequency: '24 hours',
    trends: trendsForPayload,
    occasionKeys,
    byOccasion,
    graduation: byOccasion.graduation ? [...byOccasion.graduation] : [],
  };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_FILE, '—', trendsForPayload.length, 'trends');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
