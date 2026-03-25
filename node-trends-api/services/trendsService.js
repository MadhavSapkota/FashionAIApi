const path = require('path');
const googleTrends = require('google-trends-api');
const { computeHarmonyScore } = require(path.join(__dirname, '../../fashion-trends/scripts/harmonyScore.js'));

const DEFAULT_GEO = 'US';
const BATCH_SIZE = 5;
const DEFAULT_DAYS_AGO = 90;

/**
 * Fetch interest-over-time; returns score, averageInterest, trendSlope (aligned with generateTrends.js).
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
        return { keyword, averageInterest: 0, trendSlope: 0, score: 0, harmonyScore: 0 };
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
        return { keyword, averageInterest: 0, trendSlope: 0, score: 0, harmonyScore: 0 };
      }

      const averageInterest = values.reduce((a, b) => a + b, 0) / values.length;
      const first = values[0];
      const last = values[values.length - 1];
      const trendSlope = values.length > 1 ? (last - first) / (values.length - 1) : 0;
      const score = Math.round(
        Math.min(100, Math.max(0, averageInterest + Math.max(0, trendSlope) * 2))
      );
      const harmonyScore = computeHarmonyScore({
        score,
        averageInterest: Math.round(averageInterest * 10) / 10,
        trendSlope: Math.round(trendSlope * 100) / 100,
      });

      return {
        keyword,
        averageInterest: Math.round(averageInterest * 10) / 10,
        trendSlope: Math.round(trendSlope * 100) / 100,
        score,
        harmonyScore,
      };
    })
    .catch((err) => {
      console.error(`Google Trends error for "${keyword}":`, err.message);
      return { keyword, averageInterest: 0, trendSlope: 0, score: 0, harmonyScore: 0 };
    });
}

/**
 * Validate trend strength for a list of keywords.
 * Returns only keywords with score >= threshold, sorted by score descending.
 */
async function getValidatedTrends(keywords, threshold = 10) {
  const results = await Promise.all(keywords.map((kw) => getInterestForKeyword(kw)));
  return results
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  getInterestForKeyword,
  getValidatedTrends,
};
