const googleTrends = require('google-trends-api');

const DEFAULT_GEO = 'US';
const BATCH_SIZE = 5; // Google Trends allows limited keywords per request
const DEFAULT_DAYS_AGO = 90;

/**
 * Fetch interest-over-time data for a single keyword from Google Trends.
 * Returns a score 0-100 (average of timeline values, or 0 if no data).
 */
function getInterestForKeyword(keyword, geo = DEFAULT_GEO) {
  const endTime = new Date();
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - DEFAULT_DAYS_AGO);

  return googleTrends
    .interestOverTime({
      keyword,
      startTime,
      endTime,
      geo,
    })
    .then((res) => {
      const data = JSON.parse(res);
      const timeline = data?.default?.timelineData || data?.default?.timeline_data || [];
      if (!Array.isArray(timeline) || timeline.length === 0) {
        return { keyword, score: 0 };
      }
      const values = timeline
        .map((d) => {
          if (d.values && d.values[0]) {
            const v = d.values[0];
            const n =
              typeof v.extracted_value !== 'undefined'
                ? Number(v.extracted_value)
                : typeof v.value !== 'undefined'
                  ? Number(v.value)
                  : Number(v);
            return Number.isNaN(n) ? 0 : n;
          }
          if (typeof d.extracted_value !== 'undefined') return Number(d.extracted_value);
          if (typeof d.value !== 'undefined') return Number(d.value);
          return 0;
        })
        .filter((v) => !Number.isNaN(v) && v >= 0);
      const max = values.length ? Math.max(...values) : 0;
      const score = Math.round(Math.min(100, Math.max(0, max)));
      return { keyword, score };
    })
    .catch((err) => {
      console.error(`Google Trends error for "${keyword}":`, err.message);
      return { keyword, score: 0 };
    });
}

/**
 * Validate trend strength for a list of keywords.
 * Returns only keywords with score >= threshold, sorted by score descending.
 */
async function getValidatedTrends(keywords, threshold = 10) {
  const results = await Promise.all(
    keywords.map((kw) => getInterestForKeyword(kw))
  );
  return results
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  getInterestForKeyword,
  getValidatedTrends,
};
