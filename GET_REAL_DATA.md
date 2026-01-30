# Getting Real Fashion Trend Data

Currently, the API is returning **MOCK data** because API credentials are not configured. Here's how to get **REAL data**:

## Current Status

Check your current status:
```bash
curl http://localhost:8000/api/status
```

**Important:** If you get `{"detail":"Not Found"}` on `/api/fashion/instagram` or empty `trends` for `sources=instagram,facebook`, **restart the API server** so it loads the latest routes and ingestion changes:
```bash
# Stop the current server (Ctrl+C), then:
python3 start.py
```

## Quick Fix: Google Trends (Easiest - No Auth Required!)

Google Trends can provide real data without authentication:

### Step 1: Install pytrends
```bash
cd /Users/madhavsapkota/Downloads/FashionAIApi
source venv/bin/activate
pip install pytrends pandas
```

### Step 2: Restart Server
```bash
python3 start.py
```

Google Trends will now return **REAL data** automatically!

---

## Next: Instagram & Facebook (Priority)

**TikTok later** — focus on Instagram and Facebook first. Both use **Facebook Developers** (one app can cover both).

### Quick: Instagram + Facebook only

**Get trends from Instagram and Facebook only** (skip TikTok, etc.):
```bash
# Summary from Instagram + Facebook only
curl "http://localhost:8000/api/fashion/trends/summary?limit=10&sources=instagram,facebook"

# Processed trends from Instagram + Facebook only
curl "http://localhost:8000/api/fashion/trends/processed?limit=20&sources=instagram,facebook"

# Individual endpoints
curl "http://localhost:8000/api/fashion/instagram?limit=5"
curl "http://localhost:8000/api/fashion/facebook?limit=5"
```

See **Instagram API Setup** and **Facebook API Setup** below. Add tokens to `.env`, restart, then use the curls above.

---

## Instagram API Setup (do this next)

### Step 1: Create a Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as the app type
4. Fill in your app details

### Step 2: Add Instagram Product
1. In your app dashboard, go to "Add Products"
2. Find "Instagram" and click "Set Up"
3. Choose "Instagram Graph API" (for business accounts)

### Step 3: Get Access Token
1. Go to "Tools" → "Graph API Explorer"
2. Select your app
3. Generate a User Token with these permissions:
   - `instagram_basic`
   - `pages_show_list`
   - `instagram_content_publish` (if needed)

### Step 4: Get Instagram Business Account ID
1. You need an Instagram Business Account
2. Connect it to a Facebook Page
3. Get your Instagram Business Account ID from the Graph API Explorer

### Step 5: Update .env File
```env
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
INSTAGRAM_API_VERSION=v18.0
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id_here
```

### Step 6: Test Instagram Endpoint
```bash
curl "http://localhost:8000/api/fashion/instagram?limit=5"
```

---

## Facebook API Setup (do this next)

### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app (or use existing)
3. Add "Facebook Login" product

### Step 2: Get Access Token
1. Go to Graph API Explorer
2. Select your app
3. Generate token with permissions:
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `public_profile`

### Step 3: Update .env File
```env
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token_here
FACEBOOK_API_VERSION=v18.0
```

### Step 4: Test Facebook Endpoint
```bash
curl "http://localhost:8000/api/fashion/facebook?limit=5"
```

**Tip:** Use the same Facebook App for both Instagram and Facebook. Get Instagram + Facebook tokens, add both to `.env`, then:
```bash
curl "http://localhost:8000/api/fashion/trends/summary?limit=10&sources=instagram,facebook"
```

---

## Pinterest API Setup

### Step 1: Create Pinterest App
1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Create a new app
3. Get your App ID and App Secret

### Step 2: Get Access Token
1. Use OAuth 2.0 to authenticate
2. Generate an access token with `pins:read` scope

### Step 3: Update .env File
```env
PINTEREST_ACCESS_TOKEN=your_pinterest_access_token_here
PINTEREST_API_VERSION=v5
```

### Step 4: Test Pinterest Endpoint
```bash
curl "http://localhost:8000/api/fashion/pinterest?limit=5"
```

---

## TikTok (Later)

Focus on **Instagram & Facebook** first. When you’re ready for TikTok:

- **Research API** (FREE): [TikTok for Developers](https://developers.tiktok.com/) → Research API → apply (approval ~4 weeks).
- **Paid**: TikAPI / PrimeAPI — add `TIKAPI_KEY` or `PRIMEAPI_KEY` to `.env`.

```bash
curl "http://localhost:8000/api/fashion/tiktok?limit=5&region=US"
```

---

## E-commerce Data

For e-commerce trends, you can integrate with:
- **Shopify API**: For Shopify store data
- **Amazon Product Advertising API**: For Amazon product trends
- **eBay API**: For eBay marketplace data

Update `.env`:
```env
SHOPIFY_API_KEY=your_shopify_api_key_here
AMAZON_ACCESS_KEY=your_amazon_access_key_here
```

## Verify Real Data

After setting up credentials, test:

```bash
# Check status (see which sources use real data)
curl http://localhost:8000/api/status

# All sources
curl "http://localhost:8000/api/fashion/trends/summary?limit=5&region=US"

# Instagram + Facebook only (recommended next)
curl "http://localhost:8000/api/fashion/trends/summary?limit=10&sources=instagram,facebook"
```

## Priority Order

1. **Google Trends** (Easiest - just install pytrends) ✅  
2. **Instagram & Facebook** (Next - one Facebook App, two tokens) ⭐  
3. **Pinterest** (Optional)  
4. **TikTok** (Later - Research API approval or paid APIs)  
5. **E-commerce** (Optional - depends on platform)

## Troubleshooting

### "pytrends not installed"
```bash
pip install pytrends pandas
```

### "Invalid Token" Errors
- Make sure tokens haven't expired
- Check that you have the right permissions
- Verify your app is in "Live" mode

### Still Seeing Mock Data?
1. Check `/api/status` to see which sources are configured
2. Restart the server after updating `.env`
3. Make sure `.env` file is in the project root
