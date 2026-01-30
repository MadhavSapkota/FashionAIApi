# Fashion Trends API (Node.js)

Backend for **Trending Fashion**: Google Trends (trend signal) + Unsplash (real outfit images).  
Play Store safe, no OAuth, no scraping. Ready for Android (Jetpack Compose).

## Endpoint

- **GET /api/trends** – Returns validated fashion trends with real Unsplash image URLs.

## Setup

1. **Install dependencies**
   ```bash
   cd node-trends-api
   npm install
   ```

2. **Unsplash API key**
   - Go to [Unsplash Developers](https://unsplash.com/developers)
   - Create an application and copy the **Access Key**
   - Create a `.env` file (copy from `env.example.txt`):
     ```bash
     cp env.example.txt .env
     ```
   - Set in `.env`:
     ```
     UNSPLASH_ACCESS_KEY=your_actual_access_key
     ```

3. **Run**
   ```bash
   npm start
   ```
   API: `http://localhost:3000`

## Response format

```json
{
  "generatedAt": "2026-01-27T12:00:00.000Z",
  "trends": [
    {
      "name": "linen summer dress",
      "score": 72,
      "images": ["https://images.unsplash.com/...", "..."],
      "whyTrending": "Strong search interest for \"linen summer dress\" on Google Trends this period.",
      "season": "summer"
    }
  ]
}
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UNSPLASH_ACCESS_KEY` | Yes | Unsplash API Access Key |
| `PORT` | No | Server port (default 3000) |
| `TREND_SCORE_THRESHOLD` | No | Min score 0–100 to include keyword (default 10) |
| `IMAGES_PER_TREND` | No | Images per trend, 3–5 (default 4) |

## Architecture

- **config/keywords.js** – Predefined fashion keywords.
- **services/trendsService.js** – Google Trends: validate keyword interest, filter low scores.
- **services/imageService.js** – Unsplash Search: fetch image URLs per keyword.
- **services/trendFormatter.js** – whyTrending and season (text-only).
- **routes/trends.js** – GET /api/trends: orchestrate services, return JSON.

No mock data; no Etsy, Pinterest, Instagram, TikTok, or scraping.  
Later you can add Etsy (or other sources) without changing the Android app contract.
