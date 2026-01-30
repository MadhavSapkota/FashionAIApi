from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

from services.google_trends_service import GoogleTrendsService
from services.ecommerce_service import EcommerceTrendsService
from services.tiktok_service import TikTokService
from services.instagram_service import InstagramService
from services.facebook_service import FacebookService
from services.pinterest_service import PinterestService
from services.trend_processor import TrendProcessor

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Fashion Trending API",
    description="API to fetch trending fashion and outfit data from Google Trends, TikTok, Instagram, Facebook, Pinterest, and E-commerce",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
google_trends_service = GoogleTrendsService()
ecommerce_service = EcommerceTrendsService()
tiktok_service = TikTokService()
instagram_service = InstagramService()
facebook_service = FacebookService()
pinterest_service = PinterestService()
trend_processor = TrendProcessor()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Fashion Trending API",
        "main_endpoint": "/trends",
        "description": "Use GET /trends?limit=10&region=US to get fashion trends"
    }


@app.get("/trends")
async def get_trends(
    limit: Optional[int] = 10,
    region: Optional[str] = None
):
    """
    Main API endpoint - Get fashion trends
    
    Returns trends in the format:
    {
        "week": "2026-W04",
        "region": "US",
        "trends": [
            {
                "name": "Trend Name",
                "status": "RISING|STABLE|DECLINING",
                "score": 0.82,
                "summary": "Description text"
            }
        ]
    }
    
    Args:
        limit: Number of top trends to return (default: 10)
        region: Optional region filter (default: US)
    """
    try:
        filters = {}
        if region:
            filters["region"] = region
        else:
            filters["region"] = "US"  # Default to US
        
        result = await trend_processor.get_trend_summary(
            limit=limit,
            filters=filters
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trend summary: {str(e)}")


@app.get("/api/fashion/all")
async def get_all_fashion(
    limit: Optional[int] = 10
):
    """
    Fetch trending fashion/outfit data from all platforms
    
    Args:
        limit: Number of trending items to return per platform (default: 10)
    """
    try:
        results = {
            "google_trends": [],
            "ecommerce": [],
            "tiktok": [],
            "instagram": [],
            "facebook": [],
            "pinterest": []
        }
        
        # Fetch from all platforms in parallel
        google_trends_data = await google_trends_service.get_trending_fashion(limit=limit)
        ecommerce_data = await ecommerce_service.get_trending_fashion(limit=limit)
        tiktok_data = await tiktok_service.get_trending_fashion(limit=limit)
        instagram_data = await instagram_service.get_trending_fashion(limit=limit)
        facebook_data = await facebook_service.get_trending_fashion(limit=limit)
        pinterest_data = await pinterest_service.get_trending_fashion(limit=limit)
        
        results["google_trends"] = google_trends_data
        results["ecommerce"] = ecommerce_data
        results["tiktok"] = tiktok_data
        results["instagram"] = instagram_data
        results["facebook"] = facebook_data
        results["pinterest"] = pinterest_data
        
        return {
            "category": "fashion",
            "platforms": ["google_trends", "ecommerce", "tiktok", "instagram", "facebook", "pinterest"],
            "data": results,
            "counts": {
                "google_trends": len(google_trends_data),
                "ecommerce": len(ecommerce_data),
                "tiktok": len(tiktok_data),
                "instagram": len(instagram_data),
                "facebook": len(facebook_data),
                "pinterest": len(pinterest_data)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching fashion trending data: {str(e)}")


@app.get("/api/trending/all")
async def get_all_trending(
    limit: Optional[int] = 10
):
    """
    Fetch trending data from all platforms (legacy endpoint - now returns fashion data)
    
    Args:
        limit: Number of trending items to return per platform (default: 10)
    """
    try:
        results = {
            "google_trends": [],
            "ecommerce": [],
            "tiktok": [],
            "instagram": [],
            "facebook": [],
            "pinterest": []
        }
        
        # Fetch from all platforms in parallel
        google_trends_data = await google_trends_service.get_trending_fashion(limit=limit)
        ecommerce_data = await ecommerce_service.get_trending_fashion(limit=limit)
        tiktok_data = await tiktok_service.get_trending_fashion(limit=limit)
        instagram_data = await instagram_service.get_trending_fashion(limit=limit)
        facebook_data = await facebook_service.get_trending_fashion(limit=limit)
        pinterest_data = await pinterest_service.get_trending_fashion(limit=limit)
        
        results["google_trends"] = google_trends_data
        results["ecommerce"] = ecommerce_data
        results["tiktok"] = tiktok_data
        results["instagram"] = instagram_data
        results["facebook"] = facebook_data
        results["pinterest"] = pinterest_data
        
        return {
            "platforms": ["google_trends", "ecommerce", "tiktok", "instagram", "facebook", "pinterest"],
            "data": results,
            "counts": {
                "google_trends": len(google_trends_data),
                "ecommerce": len(ecommerce_data),
                "tiktok": len(tiktok_data),
                "instagram": len(instagram_data),
                "facebook": len(facebook_data),
                "pinterest": len(pinterest_data)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trending data: {str(e)}")


@app.get("/api/fashion/trends/processed")
async def get_processed_trends(
    limit: Optional[int] = 20,
    sources: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = None
):
    """
    Get processed fashion trends through the complete pipeline:
    - Ingestion from all sources
    - Normalization & Cleaning
    - Classification
    - Scoring
    
    Args:
        limit: Number of top trends to return (default: 20)
        sources: Comma-separated list of sources (google_trends,ecommerce,tiktok,instagram,facebook,pinterest)
        region: Optional region filter
        category: Optional category filter
    """
    try:
        filters = {}
        if region:
            filters["region"] = region
        if category:
            filters["category"] = category
        
        source_list = None
        if sources:
            source_list = [s.strip() for s in sources.split(",")]
        
        result = await trend_processor.process_trends(
            limit_per_source=10,
            filters=filters,
            sources=source_list
        )
        
        # Return top N trends
        result["trends"] = result["trends"][:limit]
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing trends: {str(e)}")


@app.get("/api/fashion/trends/summary")
async def get_trend_summary(
    limit: Optional[int] = 10,
    region: Optional[str] = None,
    category: Optional[str] = None,
    sources: Optional[str] = None
):
    """
    Get trend summary formatted for API response
    
    Returns trends in the format:
    {
        "week": "2026-W04",
        "region": "US",
        "trends": [
            {
                "name": "Trend Name",
                "status": "RISING|STABLE|DECLINING",
                "score": 0.82,
                "summary": "Description text"
            }
        ]
    }
    
    Args:
        limit: Number of top trends to return (default: 10)
        region: Optional region filter (default: US)
        category: Optional category filter
        sources: Optional comma-separated sources (google_trends,ecommerce,tiktok,instagram,facebook,pinterest)
                 Use "google_trends" to get only real Google Trends data
                 Use "tiktok" to get only TikTok fashion trends (requires API credentials)
                 Use "instagram,facebook,pinterest" to get social media trends
    """
    try:
        filters = {}
        if region:
            filters["region"] = region
        else:
            filters["region"] = "US"  # Default to US
        if category:
            filters["category"] = category
        
        source_list = None
        if sources:
            source_list = [s.strip() for s in sources.split(",")]
        
        result = await trend_processor.get_trend_summary(
            limit=limit,
            filters=filters,
            sources=source_list
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trend summary: {str(e)}")


@app.get("/api/fashion/google-trends")
async def get_google_trends_fashion(
    limit: Optional[int] = 10,
    region: Optional[str] = None
):
    """Fetch trending fashion search terms from Google Trends"""
    try:
        data = await google_trends_service.get_trending_fashion(limit=limit, region=region)
        return {
            "platform": "google_trends",
            "category": "fashion",
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Google Trends data: {str(e)}")


@app.get("/api/fashion/ecommerce")
async def get_ecommerce_fashion(
    limit: Optional[int] = 10,
    platform: Optional[str] = None
):
    """Fetch trending fashion products from E-commerce platforms"""
    try:
        data = await ecommerce_service.get_trending_fashion(limit=limit, platform=platform)
        return {
            "platform": "ecommerce",
            "category": "fashion",
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching E-commerce data: {str(e)}")


@app.get("/api/fashion/tiktok")
async def get_tiktok_fashion(
    limit: Optional[int] = 10,
    region: Optional[str] = None
):
    """Fetch trending fashion videos from TikTok"""
    try:
        data = await tiktok_service.get_trending_fashion(limit=limit, region=region)
        return {
            "platform": "tiktok",
            "category": "fashion",
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching TikTok data: {str(e)}")


@app.get("/api/fashion/instagram")
async def get_instagram_fashion(
    limit: Optional[int] = 10,
    hashtag: Optional[str] = None
):
    """Fetch trending fashion posts from Instagram"""
    try:
        data = await instagram_service.get_trending_fashion(limit=limit, hashtag=hashtag)
        return {
            "platform": "instagram",
            "category": "fashion",
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Instagram data: {str(e)}")


@app.get("/api/fashion/facebook")
async def get_facebook_fashion(
    limit: Optional[int] = 10,
    category: Optional[str] = None
):
    """Fetch trending fashion posts from Facebook"""
    try:
        data = await facebook_service.get_trending_fashion(limit=limit, category=category)
        return {
            "platform": "facebook",
            "category": "fashion",
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Facebook data: {str(e)}")


@app.get("/api/fashion/pinterest")
async def get_pinterest_fashion(
    limit: Optional[int] = 10,
    board: Optional[str] = None
):
    """Fetch trending fashion pins from Pinterest"""
    try:
        data = await pinterest_service.get_trending_fashion(limit=limit, board=board)
        return {
            "platform": "pinterest",
            "category": "fashion",
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Pinterest data: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/status")
async def get_api_status():
    """Check API credentials status and data source"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    def is_valid_token(token):
        if not token:
            return False
        placeholder_values = [
            "your_access_token_here",
            "placeholder",
            ""
        ]
        return token not in placeholder_values
    
    # Check if Google Trends is actually using real data
    google_trends_real = google_trends_service.pytrends is not None
    google_trends_message = "✅ Using REAL data from Google Trends" if google_trends_real else "⚠️  Using MOCK data - pytrends not initialized (restart server)"
    
    # Check TikTok credentials (supports Research API or third-party APIs)
    tiktok_real = tiktok_service._has_any_api_access()
    if tiktok_service._is_valid_token():
        tiktok_message = "✅ Using REAL data from TikTok Research API (FREE)"
    elif tiktok_service.tikapi_key and tiktok_service.tikapi_key not in ["", "your_tikapi_key_here", "placeholder"]:
        tiktok_message = "✅ Using REAL data from TikAPI (paid)"
    elif tiktok_service.primeapi_key and tiktok_service.primeapi_key not in ["", "your_primeapi_key_here", "placeholder"]:
        tiktok_message = "✅ Using REAL data from PrimeAPI (paid)"
    else:
        tiktok_message = "⚠️  Using MOCK data - Apply for TikTok Research API (FREE, see GET_REAL_DATA.md)"
    
    # Check Instagram credentials
    instagram_real = instagram_service._is_valid_token()
    instagram_message = "✅ Using REAL data from Instagram" if instagram_real else "⚠️  Using MOCK data - Configure Instagram API credentials (see GET_REAL_DATA.md)"
    
    # Check Facebook credentials
    facebook_real = facebook_service._is_valid_token()
    facebook_message = "✅ Using REAL data from Facebook" if facebook_real else "⚠️  Using MOCK data - Configure Facebook API credentials (see GET_REAL_DATA.md)"
    
    # Check Pinterest credentials
    pinterest_real = pinterest_service._is_valid_token()
    pinterest_message = "✅ Using REAL data from Pinterest" if pinterest_real else "⚠️  Using MOCK data - Configure Pinterest API credentials (see GET_REAL_DATA.md)"
    
    status = {
        "google_trends": {
            "configured": True,
            "using_real_data": google_trends_real,
            "pytrends_initialized": google_trends_real,
            "message": google_trends_message
        },
        "tiktok": {
            "configured": tiktok_real,
            "using_real_data": tiktok_real,
            "message": tiktok_message
        },
        "instagram": {
            "configured": instagram_real,
            "using_real_data": instagram_real,
            "message": instagram_message
        },
        "facebook": {
            "configured": facebook_real,
            "using_real_data": facebook_real,
            "message": facebook_message
        },
        "pinterest": {
            "configured": pinterest_real,
            "using_real_data": pinterest_real,
            "message": pinterest_message
        },
        "ecommerce": {
            "configured": False,
            "using_real_data": False,
            "message": "⚠️  Using MOCK data - Configure e-commerce API keys for real data"
        },
        "setup_guide": "See GET_REAL_DATA.md for instructions on getting API credentials"
    }
    
    return status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
