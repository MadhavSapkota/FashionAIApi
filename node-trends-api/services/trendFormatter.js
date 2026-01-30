/**
 * Generate whyTrending and season from keyword and score.
 * Text-only, no external APIs; Play Store safe.
 */

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
  if (score >= 70) {
    return `Strong search interest for "${keyword}" on Google Trends this period.`;
  }
  if (score >= 40) {
    return `Growing search interest for "${keyword}" on Google Trends.`;
  }
  return `Steady search interest for "${keyword}" on Google Trends.`;
}

module.exports = {
  getSeason,
  getWhyTrending,
};
