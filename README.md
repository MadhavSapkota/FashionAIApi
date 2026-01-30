# Fashion Trending API

A comprehensive FastAPI-based REST API that fetches, processes, and analyzes **trending fashion and outfit data** from multiple sources through a complete pipeline.

## 🏗️ Architecture

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for complete architecture documentation.

> ⚠️ **Important**: By default, the API returns MOCK data for testing. To see **REAL fashion outfits**, you need to set up API credentials. See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

## Features

- 🔥 Fetch trending data from Facebook
- 📸 Fetch trending posts/hashtags from Instagram
- 🎵 Fetch trending videos from TikTok
- 🌐 Combined endpoint to get trending data from all platforms
- 🚀 Fast and async implementation using FastAPI

## Setup

### 1. Create Virtual Environment (Recommended)

```bash
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

Or install directly:
```bash
pip install fastapi "uvicorn[standard]" httpx python-dotenv pydantic
```

### 3. Configure Environment Variables (Required for Real Data)

**⚠️ To see REAL fashion outfits (not mock data), you MUST configure API credentials.**

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. **Follow the detailed setup guide**: See [SETUP_GUIDE.md](SETUP_GUIDE.md) for step-by-step instructions on getting API credentials from Facebook, Instagram, and TikTok.

3. Edit `.env` with your actual API keys:

```env
# Facebook API Configuration
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token_here
FACEBOOK_API_VERSION=v18.0

# Instagram API Configuration
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
INSTAGRAM_API_VERSION=v18.0
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id_here

# TikTok API Configuration
TIKTOK_CLIENT_KEY=your_tiktok_client_key_here
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret_here
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token_here
```

### 4. Run the API

**Option 1: Using the run script (easiest)**
```bash
./run.sh
```

**Option 2: Activate venv and run directly**
```bash
source venv/bin/activate  # On macOS/Linux
python main.py
```

**Option 3: Using uvicorn directly**
```bash
source venv/bin/activate  # On macOS/Linux
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Note:** Make sure to activate the virtual environment before running the API!

The API will be available at `http://localhost:8000`

## API Endpoints

### 🎯 Main Endpoints (Recommended)

- **`GET /api/fashion/trends/summary`** - **Main API endpoint** - Returns processed trends with text descriptions
  - Query params: `limit`, `region`, `category`
  - Example: `/api/fashion/trends/summary?limit=10&region=US`

- **`GET /api/fashion/trends/processed`** - Complete processed trends with full metadata
  - Query params: `limit`, `sources`, `region`, `category`
  - Example: `/api/fashion/trends/processed?sources=instagram,tiktok&limit=20`

### Individual Source Endpoints

- `GET /api/fashion/facebook` - Facebook fashion trends
- `GET /api/fashion/instagram` - Instagram fashion trends
- `GET /api/fashion/tiktok` - TikTok fashion trends
- `GET /api/fashion/pinterest` - Pinterest fashion trends
- `GET /api/fashion/google-trends` - Google Trends fashion search terms
- `GET /api/fashion/ecommerce` - E-commerce fashion product trends

### Utility Endpoints

- `GET /api/status` - Check which platforms are using real data vs mock data
- `GET /health` - Health check endpoint
- `GET /` - API information and available endpoints

## API Documentation

Once the server is running, you can access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Getting Real Fashion Data

**📖 See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete step-by-step instructions!**

The API requires valid API credentials to fetch real fashion outfits. Without credentials, it returns mock data for testing.

### Quick Status Check

Check if you're getting real data:
```bash
curl http://localhost:8000/api/status
```

This will show you which platforms are configured and using real data vs mock data.

### Why Mock Data?

- **Mock data** is returned when API credentials are missing or invalid
- This allows you to test the API structure without setting up accounts
- To see **real fashion outfits**, you must configure API credentials (see SETUP_GUIDE.md)

## Example Usage

```bash
# Get trending from Facebook
curl http://localhost:8000/api/facebook/trending?limit=5

# Get trending from Instagram
curl http://localhost:8000/api/instagram/trending?limit=5

# Get trending from TikTok
curl http://localhost:8000/api/tiktok/trending?limit=5&region=US

# Get trending from all platforms
curl http://localhost:8000/api/trending/all?limit=5
```

## Project Structure

```
FashionAIApi/
├── main.py                 # FastAPI application and routes
├── services/
│   ├── __init__.py
│   ├── facebook_service.py # Facebook API integration
│   ├── instagram_service.py # Instagram API integration
│   └── tiktok_service.py   # TikTok API integration
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file
└── README.md              # This file
```

## Notes

- The API uses async/await for better performance
- Mock data is returned when API credentials are not configured
- Each service can be extended with additional filtering and sorting options
- CORS is enabled for all origins (adjust in production)

## License

MIT
