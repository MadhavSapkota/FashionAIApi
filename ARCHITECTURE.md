# Fashion Trend API Architecture

## Complete Pipeline Architecture

```
Pinterest Trends API
Google Trends API
E-commerce Trend Feeds
Facebook API
Instagram API
TikTok API
        ↓
Trend Ingestion Layer
        ↓
Normalization & Cleaning
        ↓
Trend Classification
        ↓
Trend Scoring Engine
        ↓
Trend Text Output (API for your app)
```

## Components

### 1. Trend Ingestion Layer
**File**: `services/trend_ingestion.py`

Aggregates data from all sources:
- **Facebook**: Fashion pages and posts
- **Instagram**: Fashion hashtags and posts
- **TikTok**: Fashion videos
- **Pinterest**: Fashion pins
- **Google Trends**: Fashion search trends
- **E-commerce**: Trending fashion products

**Features**:
- Parallel data fetching from all sources
- Configurable source selection
- Filter support (region, category, etc.)

### 2. Normalization & Cleaning
**File**: `utils/normalization.py`

Standardizes data from different sources into a common format:
- **Title extraction**: Unified title field
- **Image URLs**: Standardized image access
- **Engagement metrics**: Normalized likes, comments, shares, views
- **Hashtags**: Extracted and normalized
- **Timestamps**: ISO format standardization
- **Text cleaning**: Removes noise, normalizes whitespace

**Output Format**:
```json
{
  "id": "unique_id",
  "source": "instagram",
  "title": "Clean Title",
  "description": "Cleaned description",
  "image_url": "https://...",
  "url": "https://...",
  "engagement_metrics": {
    "likes": 1000,
    "comments": 50,
    "shares": 20,
    "views": 5000,
    "score": 1500
  },
  "hashtags": ["fashion", "ootd", "style"],
  "category": "fashion",
  "timestamp": "2025-01-26T10:00:00+00:00"
}
```

### 3. Trend Classification
**File**: `utils/classification.py`

Classifies trends into categories:
- **Styles**: Casual, Formal, Streetwear, Vintage, Bohemian, Minimalist, Glam, Grunge
- **Seasons**: Spring, Summer, Fall, Winter
- **Categories**: Tops, Bottoms, Dresses, Outerwear, Footwear, Accessories
- **Occasions**: Work, Casual, Party, Date, Sport, Formal Event

**Classification Output**:
```json
{
  "classification": {
    "styles": ["casual", "streetwear"],
    "seasons": ["summer"],
    "categories": ["tops", "bottoms"],
    "occasions": ["casual", "weekend"],
    "primary_style": "casual",
    "primary_season": "summer",
    "primary_category": "tops"
  }
}
```

### 4. Trend Scoring Engine
**File**: `utils/scoring.py`

Scores trends based on multiple factors:
- **Engagement Score (40%)**: Likes, comments, shares, views
- **Recency Score (30%)**: How recent the trend is
- **Source Credibility (20%)**: Platform trustworthiness
- **Classification Completeness (10%)**: How well-classified the trend is

**Scoring Factors**:
- Google Trends: 1.2x weight (highly credible)
- Instagram/TikTok: 1.0x weight
- Facebook/Pinterest: 0.9x weight
- E-commerce: 0.8x weight

**Recency Decay**:
- 0-24 hours: 100-80 points
- 24-72 hours: 80-60 points
- 72-168 hours: 60-40 points
- Older: 40-0 points

### 5. Trend Text Output API
**File**: `services/trend_processor.py`

Main API endpoint that outputs processed trend text:

**Endpoint**: `/api/fashion/trends/summary`

**Output Format**:
```json
{
  "summary": {
    "total_trends_analyzed": 60,
    "top_trends_count": 10,
    "average_score": 75.5
  },
  "trends": [
    {
      "trend_id": "ig_fashion_1",
      "score": 92.5,
      "text": "Trending: Summer Outfit Ideas | Style: Casual | Season: Summer | Category: Tops | Perfect for: Casual, Weekend | Trend Score: 92.5/100",
      "source": "instagram",
      "classification": {
        "primary_style": "casual",
        "primary_season": "summer",
        "primary_category": "tops"
      },
      "url": "https://...",
      "image_url": "https://..."
    }
  ]
}
```

## API Endpoints

### Main Endpoints

1. **`GET /api/fashion/trends/summary`** - Main API for your app
   - Returns processed trends with text descriptions
   - Query params: `limit`, `region`, `category`

2. **`GET /api/fashion/trends/processed`** - Complete processed trends
   - Returns full processed data with all metadata
   - Query params: `limit`, `sources`, `region`, `category`

### Individual Source Endpoints

- `GET /api/fashion/facebook`
- `GET /api/fashion/instagram`
- `GET /api/fashion/tiktok`
- `GET /api/fashion/pinterest`
- `GET /api/fashion/google-trends`
- `GET /api/fashion/ecommerce`

## Usage Examples

### Get Top 10 Fashion Trends
```bash
curl http://localhost:8000/api/fashion/trends/summary?limit=10
```

### Get Trends from Specific Sources
```bash
curl "http://localhost:8000/api/fashion/trends/processed?sources=instagram,tiktok&limit=20"
```

### Get Trends for Specific Region
```bash
curl "http://localhost:8000/api/fashion/trends/summary?region=US&limit=15"
```

## Data Flow

1. **Ingestion**: Fetch from 6 sources in parallel
2. **Normalization**: Convert to common format
3. **Classification**: Categorize trends
4. **Scoring**: Calculate trend scores
5. **Output**: Return top trends with text descriptions

## Performance

- **Parallel Processing**: All sources fetched simultaneously
- **Efficient Scoring**: Logarithmic scaling for engagement
- **Smart Caching**: Can be added for frequently accessed trends
- **Configurable Limits**: Control data volume per source

## Extensibility

The architecture is designed to be easily extended:
- Add new sources by implementing the service interface
- Add new classification categories
- Adjust scoring weights
- Customize output format
