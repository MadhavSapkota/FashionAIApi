import os
import httpx
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class InstagramService:
    """Service to fetch trending data from Instagram Graph API"""
    
    def __init__(self):
        self.access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
        self.api_version = os.getenv("INSTAGRAM_API_VERSION", "v18.0")
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.instagram_business_account_id = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
        
    def _is_valid_token(self) -> bool:
        """Check if access token is valid (not None, empty, or placeholder)"""
        if not self.access_token:
            return False
        placeholder_values = [
            "your_instagram_access_token_here",
            "your_access_token_here",
            "placeholder",
            ""
        ]
        return self.access_token not in placeholder_values
    
    async def get_trending_fashion(self, limit: int = 10, hashtag: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch trending fashion/outfit posts from Instagram
        
        Note: Instagram Graph API requires business account and proper permissions.
        This implementation fetches fashion-related hashtags and posts.
        """
        if not self._is_valid_token():
            # Return mock data for development
            print("⚠️  WARNING: Using MOCK data. To get REAL fashion outfits, add your API credentials to .env file.")
            print("📖 See SETUP_GUIDE.md for instructions on getting API credentials.")
            return self._get_fashion_mock_data(limit, hashtag)
        
        try:
            async with httpx.AsyncClient() as client:
                # Default to fashion hashtags if none specified
                fashion_hashtags = [
                    "fashion", "outfit", "ootd", "fashionstyle", "outfitoftheday",
                    "fashionista", "style", "fashionblogger", "streetstyle", "fashionweek"
                ]
                
                if hashtag:
                    search_hashtag = hashtag
                else:
                    # Use popular fashion hashtags
                    search_hashtag = "fashion"
                
                # Fetch posts by hashtag
                hashtag_id = await self._get_hashtag_id(search_hashtag)
                if hashtag_id:
                    url = f"{self.base_url}/{hashtag_id}/top_media"
                    params = {
                        "access_token": self.access_token,
                        "limit": limit,
                        "fields": "id,caption,like_count,comments_count,timestamp,media_type,media_url,permalink,thumbnail_url"
                    }
                else:
                    return self._get_fashion_mock_data(limit, hashtag)
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Transform the data
                trending_items = []
                for item in data.get("data", [])[:limit]:
                    caption = item.get("caption", "") or ""
                    # Extract hashtags from caption
                    hashtags = [tag for tag in caption.split() if tag.startswith("#")]
                    
                    trending_items.append({
                        "id": item.get("id"),
                        "caption": caption[:200],
                        "hashtags": hashtags[:10],  # Limit to 10 hashtags
                        "like_count": item.get("like_count", 0),
                        "comments_count": item.get("comments_count", 0),
                        "timestamp": item.get("timestamp"),
                        "media_type": item.get("media_type"),
                        "media_url": item.get("media_url") or item.get("thumbnail_url"),
                        "permalink": item.get("permalink"),
                        "platform": "instagram",
                        "category": "fashion"
                    })
                
                return trending_items
                
        except Exception as e:
            print(f"Error fetching Instagram fashion data: {str(e)}")
            # Return mock data on error
            return self._get_fashion_mock_data(limit, hashtag)
    
    async def get_trending(self, limit: int = 10, hashtag: Optional[str] = None) -> List[Dict[str, Any]]:
        """Legacy method - redirects to fashion trending"""
        return await self.get_trending_fashion(limit=limit, hashtag=hashtag)
    
    async def _get_hashtag_id(self, hashtag: str) -> Optional[str]:
        """Get Instagram hashtag ID"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ig_hashtag_search"
                params = {
                    "user_id": self.instagram_business_account_id,
                    "q": hashtag,
                    "access_token": self.access_token
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [{}])[0].get("id") if data.get("data") else None
        except:
            return None
    
    def _get_fashion_mock_data(self, limit: int, hashtag: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return mock fashion trending data for development/testing"""
        fashion_captions = [
            "🔥 OOTD: Perfect summer outfit vibes! #fashion #outfit #ootd #style",
            "✨ This outfit is everything! Loving these pieces #fashionista #outfitoftheday",
            "💫 Street style inspiration for your wardrobe #streetstyle #fashion #trending",
            "👗 Casual chic look that's perfect for any occasion #fashion #casualchic",
            "🌟 Evening wear that will turn heads #eveningwear #fashion #glam",
            "💼 Work outfit inspiration for the modern professional #workwear #fashion",
            "🎉 Weekend style that's comfortable and chic #weekendstyle #fashion",
            "💕 Date night outfit ideas that are absolutely stunning #datenight #fashion",
            "🎊 Party outfit that's sure to make a statement #partyoutfit #fashion",
            "🏃‍♀️ Athleisure style that's both functional and fashionable #athleisure #fashion"
        ]
        
        fashion_hashtags_list = [
            ["#fashion", "#outfit", "#ootd", "#style", "#fashionista"],
            ["#outfitoftheday", "#fashionblogger", "#streetstyle", "#fashionweek"],
            ["#style", "#fashionstyle", "#ootdinspiration", "#fashiontrends"],
            ["#casualchic", "#fashion", "#outfitideas", "#styletips"],
            ["#eveningwear", "#glam", "#fashion", "#redcarpet"],
            ["#workwear", "#professional", "#fashion", "#officeoutfit"],
            ["#weekendstyle", "#casual", "#fashion", "#comfortable"],
            ["#datenight", "#romantic", "#fashion", "#elegant"],
            ["#partyoutfit", "#celebration", "#fashion", "#festive"],
            ["#athleisure", "#activewear", "#fashion", "#sporty"]
        ]
        
        mock_data = []
        for i in range(1, limit + 1):
            caption_idx = (i - 1) % len(fashion_captions)
            hashtags = fashion_hashtags_list[(i - 1) % len(fashion_hashtags_list)]
            if hashtag:
                hashtags.insert(0, f"#{hashtag}")
            
            mock_data.append({
                "id": f"ig_fashion_{i}",
                "caption": fashion_captions[caption_idx],
                "hashtags": hashtags,
                "like_count": 75000 - (i * 750),
                "comments_count": 8000 - (i * 80),
                "timestamp": "2025-01-26T10:00:00+0000",
                "media_type": "IMAGE",
                "media_url": f"https://example.com/instagram/fashion-outfit-{i}.jpg",
                "permalink": f"https://www.instagram.com/p/fashion_outfit_{i}/",
                "platform": "instagram",
                "category": "fashion"
            })
        return mock_data
