const path = require('path');
const express = require('express');
const router = express.Router();
const keywords = require('../config/keywords');
const trendsService = require('../services/trendsService');
const imageService = require('../services/imageService');
const trendFormatter = require('../services/trendFormatter');
const { getOccasion, getOccasionTags } = require(path.join(__dirname, '../../fashion-trends/scripts/occasionLib.js'));

const THRESHOLD = Number(process.env.TREND_SCORE_THRESHOLD) || 10;
const IMAGES_PER_TREND = Math.min(5, Math.max(3, Number(process.env.IMAGES_PER_TREND) || 4));
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

/**
 * GET /api/trends
 *
 * 1. Validate predefined fashion keywords with Google Trends
 * 2. Filter out low-interest keywords
 * 3. Fetch 3–5 Unsplash images per approved keyword
 * 4. Return trends with name, score, harmonyScore, occasion(s), images, whyTrending, season
 */
router.get('/', async (req, res) => {
  try {
    if (!UNSPLASH_KEY || UNSPLASH_KEY === 'your_unsplash_access_key_here') {
      return res.status(503).json({
        error: 'Unsplash API key not configured',
        message: 'Set UNSPLASH_ACCESS_KEY in .env. Get a key at https://unsplash.com/developers',
      });
    }

    const validated = await trendsService.getValidatedTrends(keywords, THRESHOLD);
    if (validated.length === 0) {
      return res.json({
        generatedAt: new Date().toISOString(),
        trends: [],
        message: 'No keywords met the trend score threshold. Try lowering TREND_SCORE_THRESHOLD.',
      });
    }

    const trends = [];
    for (const row of validated) {
      const { keyword, score, harmonyScore, averageInterest, trendSlope } = row;
      let imageUrls = [];
      try {
        imageUrls = await imageService.fetchImagesForKeyword(
          keyword,
          IMAGES_PER_TREND,
          UNSPLASH_KEY
        );
      } catch (err) {
        console.error(`Unsplash error for "${keyword}":`, err.message);
      }

      trends.push({
        name: keyword,
        score,
        harmonyScore,
        averageInterest,
        trendSlope,
        occasion: getOccasion(keyword),
        occasions: getOccasionTags(keyword),
        images: imageUrls,
        whyTrending: trendFormatter.getWhyTrending(keyword, score),
        season: trendFormatter.getSeason(keyword),
      });
    }

    const graduation = trends.filter((t) => t.occasion === 'graduation' || t.occasions.includes('graduation'));

    res.json({
      generatedAt: new Date().toISOString(),
      trends,
      graduation,
    });
  } catch (err) {
    console.error('GET /api/trends error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
});

module.exports = router;
