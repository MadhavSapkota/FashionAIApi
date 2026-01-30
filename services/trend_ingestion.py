"""
Trend Ingestion Layer
Aggregates data from all sources: Google Trends, E-commerce, TikTok, Instagram, Facebook, Pinterest
"""
from typing import List, Dict, Any, Optional
import asyncio

from services.google_trends_service import GoogleTrendsService
from services.ecommerce_service import EcommerceTrendsService
from services.tiktok_service import TikTokService
from services.instagram_service import InstagramService
from services.facebook_service import FacebookService
from services.pinterest_service import PinterestService


class TrendIngestionLayer:
    """Ingests trends from all available sources"""
    
    def __init__(self):
        self.google_trends_service = GoogleTrendsService()
        self.ecommerce_service = EcommerceTrendsService()
        self.tiktok_service = TikTokService()
        self.instagram_service = InstagramService()
        self.facebook_service = FacebookService()
        self.pinterest_service = PinterestService()
    
    async def ingest_all_trends(
        self,
        limit_per_source: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Ingest trends from all sources in parallel
        
        Args:
            limit_per_source: Number of items to fetch from each source
            filters: Optional filters (region, category, etc.)
        
        Returns:
            Dictionary with trends from each source
        """
        filters = filters or {}
        
        # Fetch from all sources in parallel
        results = await asyncio.gather(
            self.google_trends_service.get_trending_fashion(
                limit=limit_per_source,
                region=filters.get("region")
            ),
            self.ecommerce_service.get_trending_fashion(
                limit=limit_per_source,
                platform=filters.get("platform")
            ),
            self.tiktok_service.get_trending_fashion(
                limit=limit_per_source,
                region=filters.get("region")
            ),
            self.instagram_service.get_trending_fashion(
                limit=limit_per_source,
                hashtag=filters.get("hashtag")
            ),
            self.facebook_service.get_trending_fashion(
                limit=limit_per_source,
                category=filters.get("category")
            ),
            self.pinterest_service.get_trending_fashion(
                limit=limit_per_source,
                board=filters.get("board")
            ),
            return_exceptions=True
        )
        
        # Structure the results
        ingested_trends = {
            "google_trends": results[0] if not isinstance(results[0], Exception) else [],
            "ecommerce": results[1] if not isinstance(results[1], Exception) else [],
            "tiktok": results[2] if not isinstance(results[2], Exception) else [],
            "instagram": results[3] if not isinstance(results[3], Exception) else [],
            "facebook": results[4] if not isinstance(results[4], Exception) else [],
            "pinterest": results[5] if not isinstance(results[5], Exception) else []
        }
        
        # Add metadata
        ingested_trends["metadata"] = {
            "total_sources": 6,
            "items_per_source": limit_per_source,
            "total_items": sum(len(items) for items in ingested_trends.values() if isinstance(items, list)),
            "filters_applied": filters
        }
        
        return ingested_trends
    
    async def ingest_specific_sources(
        self,
        sources: List[str],
        limit_per_source: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Ingest trends from specific sources only
        
        Args:
            sources: List of source names (google_trends, ecommerce, tiktok, instagram, facebook, pinterest)
            limit_per_source: Number of items per source
            filters: Optional filters
        """
        filters = filters or {}
        source_map = {
            "google_trends": self.google_trends_service.get_trending_fashion,
            "ecommerce": self.ecommerce_service.get_trending_fashion,
            "tiktok": self.tiktok_service.get_trending_fashion,
            "instagram": self.instagram_service.get_trending_fashion,
            "facebook": self.facebook_service.get_trending_fashion,
            "pinterest": self.pinterest_service.get_trending_fashion
        }
        source_filter_keys = {
            "google_trends": ["region"],
            "ecommerce": ["platform"],
            "tiktok": ["region"],
            "instagram": ["hashtag"],
            "facebook": ["category"],
            "pinterest": ["board"],
        }
        
        tasks = []
        for source in sources:
            if source in source_map:
                allowed = source_filter_keys.get(source, [])
                kwargs = {k: v for k, v in filters.items() if k in allowed}
                tasks.append(source_map[source](limit=limit_per_source, **kwargs))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        ingested_trends = {}
        for i, source in enumerate(sources):
            if source in source_map:
                ingested_trends[source] = results[i] if not isinstance(results[i], Exception) else []
        
        return ingested_trends
