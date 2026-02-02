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
  'coquette outfit',
  'quiet luxury fashion',
  'cargo pants women',
  'linen summer dress',
  'minimalist outfit',
  'street style fashion',
  'oversized blazer',
  'wide leg jeans',
  'cottagecore dress',
  'y2k fashion',
  'athleisure outfit',
  'neutral tone outfit',
  'maxi skirt outfit',
  'blazer dress',
  'layered necklace outfit',
  'sustainable fashion',
  'vintage dress',
  'mom jeans',
  'cropped jacket',
  'slip dress',
  'tennis skirt',
  'ballet core fashion',
  'coastal grandmother style',
  'capsule wardrobe',
  'statement earrings',
  'leather jacket',
  'denim skirt',
  'knit sweater',
  'wide leg pants',
  'midi dress',
  'trending outfits 2025',
  'minimalist fashion',
  'oversized fit',
  'tailored trousers',
  'bomber jacket',
  'trench coat outfit',
  'satin dress',
  'ribbed knit',
  'pleated skirt',
  'platform shoes',
  'mary jane shoes',
  'bucket hat',
  'chain bag',
  'crossbody bag',
  'gold jewelry',
  'pearl necklace',
  'sheer top',
  'corset top',
  'cargo skirt',
  'flare pants',
  'straight leg jeans',
  'cropped cardigan',
  'vest outfit',
  'monochrome outfit',
  'color block fashion',
  'print mixing',
  'animal print',
  'striped shirt',
  'graphic tee outfit',
  'hoodie dress',
  'joggers outfit',
  'romper',
  'wrap dress',
  'bodycon dress',
  'shirt dress',
  'puff sleeve top',
  'square neck top',
  'halter top',
  'off shoulder top',
  'cold shoulder top',
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

/** Guaranteed queries that return many fashion images on Unsplash. */
const GUARANTEED_IMAGE_QUERIES = ['women fashion', 'fashion outfit', 'street style outfit', 'casual outfit'];

/**
 * Fetch image URLs from Unsplash Search API for a given search query.
 * Retries once on 429/503 to handle rate limits.
 */
async function fetchImagesForQuery(query, count, accessKey, retried = false) {
  if (!accessKey || accessKey === 'your_unsplash_access_key_here') {
    return [];
  }
  const encoded = encodeURIComponent(query);
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

/** Fallback search terms when primary keyword returns no images. */
function getFallbackSearchTerms(keyword) {
  const lower = keyword.toLowerCase();
  const fallbacks = {
    'oversized fit': ['oversized fashion', 'oversized clothing', 'street style outfit'],
    'cargo skirt': ['cargo skirt outfit', 'skirt outfit', 'utility skirt'],
    'color block fashion': ['colorful fashion', 'bold color outfit', 'women fashion'],
    'print mixing': ['pattern dress', 'mixed print', 'floral dress'],
    'neutral tone outfit': ['neutral outfit', 'beige outfit', 'minimal outfit'],
    'coastal grandmother style': ['linen outfit', 'relaxed fashion', 'summer dress'],
    'trending outfits 2025': ['fashion trends', 'women fashion', 'outfit'],
    'ballet core fashion': ['ballet aesthetic', 'pink outfit', 'feminine fashion'],
    'street style fashion': ['street style', 'urban outfit', 'women fashion'],
    'linen summer dress': ['linen dress', 'summer dress', 'casual dress'],
    'trench coat outfit': ['trench coat', 'coat outfit', 'women fashion'],
    'tailored trousers': ['tailored pants', 'wide leg pants', 'women fashion'],
    'coquette outfit': ['feminine outfit', 'lace dress', 'women fashion'],
    'maxi skirt outfit': ['maxi skirt', 'long skirt', 'women fashion'],
    'joggers outfit': ['joggers', 'athleisure', 'casual outfit'],
    'minimalist fashion': ['minimal outfit', 'simple fashion', 'women fashion'],
    'cottagecore dress': ['floral dress', 'cottage dress', 'women fashion'],
    'monochrome outfit': ['monochrome look', 'black white outfit', 'women fashion'],
    'cold shoulder top': ['cold shoulder', 'off shoulder top', 'women fashion'],
    'graphic tee outfit': ['graphic tee', 'printed t-shirt', 'casual outfit'],
    'minimalist outfit': ['minimal outfit', 'simple outfit', 'women fashion'],
    'quiet luxury fashion': ['minimal fashion', 'elegant outfit', 'women fashion'],
    'athleisure outfit': ['athleisure', 'sporty outfit', 'women fashion'],
    'neutral tone outfit': ['neutral outfit', 'beige fashion', 'women fashion'],
    'layered necklace outfit': ['layered necklace', 'jewelry outfit', 'women fashion'],
  };
  return fallbacks[lower] || [keyword.split(' ').slice(0, 2).join(' '), keyword.split(' ')[0], 'women fashion'];
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
  urls = await fetchImagesForQuery('women fashion', count, accessKey);
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
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    updateFrequency: '6 hours',
    trends,
  };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_FILE, '—', trends.length, 'trends');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
