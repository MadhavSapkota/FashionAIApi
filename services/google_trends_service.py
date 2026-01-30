import os
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Try to import pytrends, fallback to mock if not available
try:
    from pytrends.request import TrendReq
    PYTRENDS_AVAILABLE = True
except ImportError:
    PYTRENDS_AVAILABLE = False
    print("⚠️  pytrends not installed. Install with: pip install pytrends pandas")


class GoogleTrendsService:
    """Service to fetch trending fashion data from Google Trends"""
    
    def __init__(self):
        self.pytrends = None
        if PYTRENDS_AVAILABLE:
            try:
                # Initialize pytrends (hl='en-US', tz=360 for US timezone)
                self.pytrends = TrendReq(hl='en-US', tz=360, timeout=(10, 25))
            except Exception as e:
                print(f"Warning: Could not initialize pytrends: {str(e)}")
                self.pytrends = None
        
    async def get_trending_fashion(self, limit: int = 10, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch trending fashion search terms from Google Trends
        
        Uses pytrends library to fetch real Google Trends data.
        """
        if not PYTRENDS_AVAILABLE or not self.pytrends:
            print("⚠️  Using MOCK Google Trends data. Install pytrends for real data: pip install pytrends pandas")
            return self._get_fashion_trends_data([], region)
        
        try:
            # Fashion-related search terms to track
            fashion_keywords = [
                "fashion trends", "outfit ideas", "summer fashion", "winter outfits",
                "street style", "fashion week", "ootd", "fashion inspiration",
                "trending outfits", "fashion style", "spring fashion", "fall outfits"
            ]
            
            # Fetch real data from Google Trends
            return await self._fetch_real_trends(fashion_keywords[:limit], region)
            
        except Exception as e:
            print(f"Error fetching Google Trends data: {str(e)}")
            print("⚠️  Falling back to mock data")
            return self._get_fashion_trends_data([], region)
    
    async def _fetch_real_trends(self, keywords: List[str], region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch real trends from Google Trends using pytrends"""
        import asyncio
        
        try:
            # Run pytrends in executor since it's synchronous
            loop = asyncio.get_event_loop()
            
            def fetch_trends():
                # Build payload for the keywords
                geo = region or "US"
                timeframe = "today 3-m"  # Last 3 months
                
                self.pytrends.build_payload(keywords, geo=geo, timeframe=timeframe)
                
                # Get interest over time
                interest_data = self.pytrends.interest_over_time()
                
                # Get related queries
                related_queries = self.pytrends.related_queries()
                
                return interest_data, related_queries
            
            # Run in executor to avoid blocking
            interest_data, related_queries = await loop.run_in_executor(None, fetch_trends)
            
            trends = []
            for i, keyword in enumerate(keywords[:10], 1):
                # Calculate average interest score
                if interest_data is not None and not interest_data.empty and keyword in interest_data.columns:
                    avg_interest = float(interest_data[keyword].mean())
                    max_interest = float(interest_data[keyword].max())
                else:
                    avg_interest = 50.0
                    max_interest = 50.0
                
                # Get related rising queries
                rising_queries_list = []
                if related_queries and keyword in related_queries and related_queries[keyword].get('rising') is not None:
                    rising_df = related_queries[keyword]['rising']
                    if rising_df is not None and not rising_df.empty:
                        rising_queries_list = rising_df['query'].head(3).tolist()
                
                trends.append({
                    "id": f"gt_fashion_{i}",
                    "keyword": keyword,
                    "trend_score": min(100, max(0, int(max_interest))),
                    "search_volume": int(avg_interest * 1000),  # Approximate
                    "growth_rate": f"+{int((max_interest - avg_interest) / avg_interest * 100) if avg_interest > 0 else 0}%",
                    "region": region or "US",
                    "category": "fashion",
                    "platform": "google_trends",
                    "timestamp": datetime.now().isoformat(),
                    "related_queries": rising_queries_list
                })
            
            return trends
            
        except Exception as e:
            print(f"Error in _fetch_real_trends: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._get_fashion_trends_data(keywords, region)
    
    def _get_fashion_trends_data(self, keywords: List[str], region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return fashion trends data"""
        if not keywords:
            keywords = [
                "fashion trends 2025", "outfit ideas", "summer fashion",
                "street style", "fashion week", "ootd inspiration"
            ]
        
        mock_data = []
        for i, keyword in enumerate(keywords[:10], 1):
            # Simulate trend score (0-100)
            trend_score = 100 - (i * 5) + (hash(keyword) % 20)
            
            mock_data.append({
                "id": f"gt_fashion_{i}",
                "keyword": keyword,
                "trend_score": min(100, max(0, trend_score)),
                "search_volume": 100000 - (i * 5000),
                "growth_rate": f"+{(20 - i * 2)}%",
                "region": region or "US",
                "category": "fashion",
                "platform": "google_trends",
                "timestamp": datetime.now().isoformat()
            })
        
        return mock_data
