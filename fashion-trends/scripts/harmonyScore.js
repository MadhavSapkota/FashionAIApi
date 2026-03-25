/**
 * Harmony score 0–100: how cohesive the trend signal is for outfit curation —
 * blends search strength, average interest, and momentum steadiness (smooth growth
 * reads as more "harmonious" than chaotic spikes).
 */
function computeHarmonyScore({ score, averageInterest, trendSlope }) {
  const ai = typeof averageInterest === 'number' ? averageInterest : 0;
  const slope = typeof trendSlope === 'number' ? trendSlope : 0;
  const steadiness = Math.max(0, 100 - Math.min(100, Math.abs(slope) * 8));
  const momentum = Math.max(0, Math.min(100, 50 + slope * 3));
  const raw = 0.4 * score + 0.25 * Math.min(100, ai) + 0.2 * steadiness + 0.15 * momentum;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

module.exports = { computeHarmonyScore };
