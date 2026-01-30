import os
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()


class TikTokService:
    """Service to fetch trending data from TikTok API"""
    
    def __init__(self):
        self.client_key = os.getenv("TIKTOK_CLIENT_KEY")
        self.client_secret = os.getenv("TIKTOK_CLIENT_SECRET")
        self.access_token = os.getenv("TIKTOK_ACCESS_TOKEN")
        self.base_url = "https://open.tiktokapis.com/v2"
        
        # Third-party API support (alternative to Research API)
        self.primeapi_key = os.getenv("PRIMEAPI_KEY")  # Optional: for PrimeAPI
        self.tikapi_key = os.getenv("TIKAPI_KEY")  # Optional: for TikAPI
        
    def _is_valid_token(self) -> bool:
        """Check if access token is valid (not None, empty, or placeholder)"""
        if not self.access_token:
            return False
        placeholder_values = [
            "your_tiktok_access_token_here",
            "your_access_token_here",
            "placeholder",
            ""
        ]
        return self.access_token not in placeholder_values
    
    def _has_any_api_access(self) -> bool:
        """Check if any API access method is configured"""
        return (self._is_valid_token() or 
                (self.tikapi_key and self.tikapi_key not in ["", "your_tikapi_key_here", "placeholder"]) or
                (self.primeapi_key and self.primeapi_key not in ["", "your_primeapi_key_here", "placeholder"]))
    
    async def get_trending_fashion(self, limit: int = 10, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch trending fashion/outfit videos from TikTok
        
        Tries multiple methods in order:
        1. TikTok Research API (FREE but requires approval)
        2. Paid third-party APIs (TikAPI/PrimeAPI) if configured
        3. Mock data as fallback
        """
        # Try Research API first (FREE if approved)
        if self._is_valid_token():
            try:
                return await self._fetch_from_research_api(limit, region)
            except Exception as e:
                print(f"⚠️  Research API failed: {str(e)}")
                print("🔄 Trying alternative methods...")
        
        # Try paid third-party APIs
        if self.tikapi_key:
            try:
                return await self._fetch_from_tikapi(limit, region)
            except Exception as e:
                print(f"⚠️  TikAPI failed: {str(e)}")
        
        if self.primeapi_key:
            try:
                return await self._fetch_from_primeapi(limit, region)
            except Exception as e:
                print(f"⚠️  PrimeAPI failed: {str(e)}")
        
        # Fallback to mock data
        print("⚠️  WARNING: Using MOCK data. To get REAL TikTok trends:")
        print("   1. Apply for TikTok Research API (FREE, requires approval) - see GET_REAL_DATA.md")
        print("   2. OR use paid APIs (TikAPI/PrimeAPI) - add API key to .env")
        return self._get_fashion_mock_data(limit, region)
    
    async def _fetch_from_research_api(self, limit: int, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch from TikTok Research API (official, requires approval)"""
        
        async with httpx.AsyncClient() as client:
            # TikTok Research API endpoint for trending videos
            url = f"{self.base_url}/research/video/query/"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Search for fashion-related content
            from datetime import datetime, timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            payload = {
                "query": {
                    "and": [
                        {
                            "operation": "EQ",
                            "field_name": "region_code",
                            "field_values": [region or "US"]
                        },
                        {
                            "operation": "IN",
                            "field_name": "hashtag_name",
                            "field_values": ["fashion", "outfit", "ootd", "fashionstyle", "outfitoftheday"]
                        }
                    ]
                },
                "max_count": limit,
                "start_date": start_date.strftime("%Y%m%d"),
                "end_date": end_date.strftime("%Y%m%d")
            }
            
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Transform the data
            trending_items = []
            for item in data.get("data", {}).get("videos", [])[:limit]:
                # Extract hashtags if available
                hashtags = item.get("hashtag_names", []) or []
                
                trending_items.append({
                    "id": item.get("id"),
                    "title": item.get("title", ""),
                    "description": item.get("description", "")[:200],
                    "hashtags": hashtags[:10],  # Limit to 10 hashtags
                    "view_count": item.get("view_count", 0),
                    "like_count": item.get("like_count", 0),
                    "comment_count": item.get("comment_count", 0),
                    "share_count": item.get("share_count", 0),
                    "created_time": item.get("create_time"),
                    "video_url": item.get("video_url"),
                    "cover_image_url": item.get("cover_image_url"),
                    "region": region or "US",
                    "platform": "tiktok",
                    "category": "fashion"
                })
            
            return trending_items
    
    async def _fetch_from_tikapi(self, limit: int, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch from TikAPI (third-party API - easier to get access)"""
        async with httpx.AsyncClient() as client:
            # Get trending posts
            url = "https://tikapi.io/api/public/trending"
            headers = {
                "X-API-KEY": self.tikapi_key
            }
            params = {
                "count": limit
            }
            
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Filter for fashion-related content and transform
            trending_items = []
            fashion_keywords = ["fashion", "outfit", "ootd", "style", "fashionista"]
            
            for item in data.get("itemList", [])[:limit]:
                # Check if it's fashion-related
                desc = (item.get("desc", "") or "").lower()
                hashtags = [tag.get("name", "").lower() for tag in item.get("textExtra", [])]
                
                if any(keyword in desc or any(keyword in tag for tag in hashtags) for keyword in fashion_keywords):
                    trending_items.append({
                        "id": item.get("id"),
                        "title": item.get("desc", "")[:100],
                        "description": item.get("desc", "")[:200],
                        "hashtags": hashtags[:10],
                        "view_count": item.get("stats", {}).get("playCount", 0),
                        "like_count": item.get("stats", {}).get("diggCount", 0),
                        "comment_count": item.get("stats", {}).get("commentCount", 0),
                        "share_count": item.get("stats", {}).get("shareCount", 0),
                        "created_time": item.get("createTime"),
                        "video_url": item.get("video", {}).get("downloadAddr", ""),
                        "cover_image_url": item.get("video", {}).get("cover", ""),
                        "region": region or "US",
                        "platform": "tiktok",
                        "category": "fashion"
                    })
            
            return trending_items if trending_items else self._get_fashion_mock_data(limit, region)
    
    async def _fetch_from_primeapi(self, limit: int, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch from PrimeAPI (third-party API - paid)"""
        async with httpx.AsyncClient() as client:
            url = "https://api.primeapi.co/trending-posts"
            headers = {
                "X-API-KEY": self.primeapi_key
            }
            params = {
                "count": limit
            }
            
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Filter and transform
            trending_items = []
            fashion_keywords = ["fashion", "outfit", "ootd", "style"]
            
            for item in data.get("data", [])[:limit]:
                desc = (item.get("caption", "") or "").lower()
                if any(keyword in desc for keyword in fashion_keywords):
                    trending_items.append({
                        "id": item.get("id"),
                        "title": item.get("caption", "")[:100],
                        "description": item.get("caption", "")[:200],
                        "hashtags": item.get("hashtags", [])[:10],
                        "view_count": item.get("view_count", 0),
                        "like_count": item.get("like_count", 0),
                        "comment_count": item.get("comment_count", 0),
                        "share_count": item.get("share_count", 0),
                        "created_time": item.get("timestamp"),
                        "video_url": item.get("video_url", ""),
                        "cover_image_url": item.get("cover_image_url", ""),
                        "region": region or "US",
                        "platform": "tiktok",
                        "category": "fashion"
                    })
            
            return trending_items if trending_items else self._get_fashion_mock_data(limit, region)
    
    async def get_trending(self, limit: int = 10, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Legacy method - redirects to fashion trending"""
        return await self.get_trending_fashion(limit=limit, region=region)
    
    def _get_fashion_mock_data(self, limit: int, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return mock fashion trending data for development/testing"""
        fashion_titles = [
            "🔥 OOTD that's trending right now!",
            "✨ This outfit combo is EVERYTHING",
            "💫 Street style outfit inspiration",
            "👗 Casual chic look for everyday",
            "🌟 Evening outfit that's absolutely stunning",
            "💼 Work outfit ideas for the modern woman",
            "🎉 Weekend outfit that's comfy and cute",
            "💕 Date night outfit that will impress",
            "🎊 Party outfit ideas that are fire",
            "🏃‍♀️ Athleisure outfit that's both stylish and functional"
        ]
        
        fashion_hashtags = [
            ["fashion", "outfit", "ootd", "style", "fashionista"],
            ["outfitoftheday", "fashionstyle", "trending", "outfitideas"],
            ["streetstyle", "fashion", "styleinspo", "outfit"],
            ["casualchic", "fashion", "everydaystyle", "outfit"],
            ["eveningwear", "glam", "fashion", "outfit"],
            ["workwear", "professional", "fashion", "outfit"],
            ["weekendstyle", "casual", "fashion", "outfit"],
            ["datenight", "romantic", "fashion", "outfit"],
            ["partyoutfit", "celebration", "fashion", "outfit"],
            ["athleisure", "activewear", "fashion", "outfit"]
        ]
        
        mock_data = []
        for i in range(1, limit + 1):
            title_idx = (i - 1) % len(fashion_titles)
            hashtags = fashion_hashtags[(i - 1) % len(fashion_hashtags)]
            
            mock_data.append({
                "id": f"tt_fashion_{i}",
                "title": fashion_titles[title_idx],
                "description": f"Check out this amazing fashion outfit! Perfect for any occasion. #{' #'.join(hashtags[:3])}",
                "hashtags": hashtags,
                "view_count": 15000000 - (i * 150000),
                "like_count": 800000 - (i * 8000),
                "comment_count": 60000 - (i * 600),
                "share_count": 15000 - (i * 150),
                "created_time": "2025-01-26T10:00:00+0000",
                "video_url": f"https://example.com/tiktok/fashion-video-{i}.mp4",
                "cover_image_url": f"https://example.com/tiktok/fashion-cover-{i}.jpg",
                "region": region or "US",
                "platform": "tiktok",
                "category": "fashion"
            })
        return mock_data
