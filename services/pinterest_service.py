import os
import httpx
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class PinterestService:
    """Service to fetch trending fashion data from Pinterest API"""
    
    def __init__(self):
        self.access_token = os.getenv("PINTEREST_ACCESS_TOKEN")
        self.api_version = os.getenv("PINTEREST_API_VERSION", "v5")
        self.base_url = f"https://api.pinterest.com/{self.api_version}"
        
    def _is_valid_token(self) -> bool:
        """Check if access token is valid"""
        if not self.access_token:
            return False
        placeholder_values = [
            "your_pinterest_access_token_here",
            "your_access_token_here",
            "placeholder",
            ""
        ]
        return self.access_token not in placeholder_values
    
    async def get_trending_fashion(self, limit: int = 10, board: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch trending fashion pins from Pinterest
        
        Note: Pinterest API requires authentication and proper permissions.
        """
        if not self._is_valid_token():
            print("⚠️  WARNING: Using MOCK data. To get REAL fashion outfits, add your API credentials to .env file.")
            return self._get_fashion_mock_data(limit)
        
        try:
            async with httpx.AsyncClient() as client:
                # Search for fashion-related pins
                url = f"{self.base_url}/search/pins"
                params = {
                    "query": "fashion outfit style",
                    "access_token": self.access_token,
                    "limit": limit
                }
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Transform the data
                trending_items = []
                for item in data.get("data", [])[:limit]:
                    trending_items.append({
                        "id": item.get("id"),
                        "title": item.get("title", ""),
                        "description": item.get("description", "")[:200],
                        "image_url": item.get("image", {}).get("original", {}).get("url"),
                        "pin_url": item.get("url"),
                        "like_count": item.get("like_count", 0),
                        "comment_count": item.get("comment_count", 0),
                        "board_name": item.get("board_name", ""),
                        "created_at": item.get("created_at"),
                        "platform": "pinterest",
                        "category": "fashion"
                    })
                
                return trending_items
                
        except Exception as e:
            print(f"Error fetching Pinterest fashion data: {str(e)}")
            return self._get_fashion_mock_data(limit)
    
    def _get_fashion_mock_data(self, limit: int) -> List[Dict[str, Any]]:
        """Return mock Pinterest fashion trending data"""
        fashion_topics = [
            "Summer Outfit Ideas", "Street Style Inspiration", "Casual Chic Looks",
            "Evening Wear Trends", "Work Outfit Ideas", "Weekend Style",
            "Date Night Outfits", "Party Fashion", "Athleisure Trends", "Vintage Style"
        ]
        
        mock_data = []
        for i in range(1, limit + 1):
            topic = fashion_topics[(i - 1) % len(fashion_topics)]
            mock_data.append({
                "id": f"pin_fashion_{i}",
                "title": f"{topic} - Trending Now",
                "description": f"Discover the latest {topic.lower()} trends and get inspired!",
                "image_url": f"https://example.com/pinterest/fashion-{i}.jpg",
                "pin_url": f"https://www.pinterest.com/pin/fashion-outfit-{i}/",
                "like_count": 12000 - (i * 120),
                "comment_count": 500 - (i * 5),
                "board_name": "Fashion Trends",
                "created_at": "2025-01-26T10:00:00+0000",
                "platform": "pinterest",
                "category": "fashion"
            })
        return mock_data
