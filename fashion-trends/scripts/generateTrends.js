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

/**
 * Fetch image URLs from Unsplash Search API.
 */
async function fetchImagesForKeyword(keyword, count, accessKey) {
  if (!accessKey || accessKey === 'your_unsplash_access_key_here') {
    return [];
  }
  const query = encodeURIComponent(keyword);
  const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=${Math.min(count, 10)}&client_id=${accessKey}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  const results = data.results || [];
  return results
    .slice(0, count)
    .map((p) => p.urls?.regular || p.urls?.small || p.urls?.thumb)
    .filter(Boolean);
}

async function main() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY || '';

  console.log('Fetching Google Trends for', KEYWORDS.length, 'fashion keywords...');
  const metricsList = await Promise.all(KEYWORDS.map((kw) => fetchTrendMetrics(kw)));

  const filtered = metricsList
    .filter((m) => m.score >= TREND_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  console.log('Trends above threshold:', filtered.length);

  const imagesByKeyword = {};
  for (const m of filtered) {
    imagesByKeyword[m.keyword] = await fetchImagesForKeyword(m.keyword, IMAGES_PER_TREND, accessKey);
    await new Promise((r) => setTimeout(r, 200));
  }

  const trends = filtered.map((m) => ({
    name: m.keyword,
    score: m.score,
    averageInterest: m.averageInterest,
    trendSlope: m.trendSlope,
    images: imagesByKeyword[m.keyword] || [],
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
