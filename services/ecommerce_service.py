import os
import httpx
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class EcommerceTrendsService:
    """Service to fetch trending fashion data from E-commerce platforms"""
    
    def __init__(self):
        # Can integrate with various e-commerce APIs
        # Examples: Shopify, Amazon Product Advertising API, eBay API, etc.
        self.shopify_api_key = os.getenv("SHOPIFY_API_KEY")
        self.amazon_access_key = os.getenv("AMAZON_ACCESS_KEY")
        
    def _is_valid_config(self) -> bool:
        """Check if any e-commerce API is configured"""
        return bool(self.shopify_api_key or self.amazon_access_key)
    
    async def get_trending_fashion(self, limit: int = 10, platform: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch trending fashion products from e-commerce platforms
        
        Supports: Shopify, Amazon, general product trends
        """
        if not self._is_valid_config():
            print("⚠️  WARNING: Using MOCK data. Configure e-commerce API keys for real data.")
            return self._get_fashion_mock_data(limit, platform)
        
        try:
            # In a real implementation, fetch from actual e-commerce APIs
            # This is a placeholder structure
            return self._get_fashion_mock_data(limit, platform)
        except Exception as e:
            print(f"Error fetching e-commerce fashion data: {str(e)}")
            return self._get_fashion_mock_data(limit, platform)
    
    def _get_fashion_mock_data(self, limit: int, platform: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return mock e-commerce fashion trending data"""
        trending_products = [
            {"name": "Oversized Blazer", "category": "Jackets", "trend_score": 95},
            {"name": "Cargo Pants", "category": "Bottoms", "trend_score": 92},
            {"name": "Platform Sneakers", "category": "Footwear", "trend_score": 90},
            {"name": "Mini Skirt", "category": "Bottoms", "trend_score": 88},
            {"name": "Crop Top", "category": "Tops", "trend_score": 87},
            {"name": "Wide Leg Jeans", "category": "Bottoms", "trend_score": 85},
            {"name": "Chunky Boots", "category": "Footwear", "trend_score": 83},
            {"name": "Trench Coat", "category": "Outerwear", "trend_score": 82},
            {"name": "Mesh Top", "category": "Tops", "trend_score": 80},
            {"name": "Cargo Skirt", "category": "Bottoms", "trend_score": 78}
        ]
        
        mock_data = []
        for i, product in enumerate(trending_products[:limit], 1):
            mock_data.append({
                "id": f"ecom_fashion_{i}",
                "product_name": product["name"],
                "category": product["category"],
                "trend_score": product["trend_score"],
                "sales_volume": 5000 - (i * 50),
                "price_range": f"${20 + i * 10}-${50 + i * 10}",
                "platform": platform or "general",
                "source": "ecommerce",
                "category": "fashion"
            })
        
        return mock_data
