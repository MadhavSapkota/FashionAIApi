# Setup Guide: Getting Real Fashion Data

To see **real fashion outfits** from Facebook, Instagram, and TikTok, you need to set up API credentials. This guide will walk you through the process.

## Quick Start: Instagram (Easiest to Start)

Instagram is the easiest platform to get started with for fashion data.

### Step 1: Create a Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as the app type
4. Fill in your app details

### Step 2: Add Instagram Product
1. In your app dashboard, go to "Add Products"
2. Find "Instagram" and click "Set Up"
3. Choose "Instagram Basic Display API" or "Instagram Graph API"

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
INSTAGRAM_ACCESS_TOKEN=your_actual_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id_here
```

## Facebook Setup

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
FACEBOOK_ACCESS_TOKEN=your_actual_token_here
FACEBOOK_API_VERSION=v18.0
```

## TikTok Setup

### Step 1: Create TikTok Developer Account
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Sign up for a developer account
3. Create a new app

### Step 2: Get Credentials
1. In your app dashboard, you'll get:
   - Client Key
   - Client Secret

### Step 3: Generate Access Token
1. Use OAuth 2.0 flow to get access token
2. Or use the Research API if you qualify

### Step 4: Update .env File
```env
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
TIKTOK_ACCESS_TOKEN=your_access_token_here
```

## Testing Your Setup

After adding credentials to `.env`, restart your API:

```bash
python3 start.py
```

Then test:
```bash
curl http://localhost:8000/api/fashion/instagram?limit=5
```

If you see real data (not mock data), your setup is working!

## Alternative: Using Public Hashtag Data

If you want to test without full API setup, you can use Instagram's public hashtag pages, but this requires web scraping which may violate Terms of Service. We recommend using official APIs.

## Troubleshooting

### "Invalid Token" Errors
- Make sure your token hasn't expired
- Check that you have the right permissions
- Verify your app is in "Live" mode (not Development mode for some features)

### "No Data Returned"
- Check that your Instagram account is a Business Account
- Verify your Facebook Page is connected
- Make sure you're using the correct API version

### Rate Limits
- Instagram: 200 requests per hour per user
- Facebook: Varies by app
- TikTok: Check your plan limits

## Need Help?

- Facebook/Instagram: [Facebook Developers Support](https://developers.facebook.com/support/)
- TikTok: [TikTok Developer Support](https://developers.tiktok.com/doc/)
