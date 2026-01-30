"""
Trend Processor - Orchestrates the entire trend processing pipeline
"""
from typing import List, Dict, Any, Optional

from services.trend_ingestion import TrendIngestionLayer
from utils.normalization import TrendNormalizer
from utils.classification import TrendClassifier
from utils.scoring import TrendScoringEngine
from utils.trend_formatter import TrendFormatter


class TrendProcessor:
    """Processes trends through the complete pipeline"""
    
    def __init__(self):
        self.ingestion_layer = TrendIngestionLayer()
    
    async def process_trends(
        self,
        limit_per_source: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        sources: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Process trends through the complete pipeline:
        1. Ingestion
        2. Normalization & Cleaning
        3. Classification
        4. Scoring
        
        Args:
            limit_per_source: Number of items per source
            filters: Optional filters
            sources: Optional list of specific sources to use
        
        Returns:
            Processed trends with all metadata
        """
        # Step 1: Ingestion
        if sources:
            ingested = await self.ingestion_layer.ingest_specific_sources(
                sources=sources,
                limit_per_source=limit_per_source,
                filters=filters or {}
            )
        else:
            ingested = await self.ingestion_layer.ingest_all_trends(
                limit_per_source=limit_per_source,
                filters=filters or {}
            )
        
        # Step 2: Normalization & Cleaning
        normalized = TrendNormalizer.normalize_trends(ingested)
        
        # Step 3: Classification
        classified = TrendClassifier.classify_trends(normalized)
        
        # Step 4: Scoring
        scored = TrendScoringEngine.score_trends(classified)
        
        # Prepare final output
        return {
            "trends": scored,
            "metadata": {
                "total_trends": len(scored),
                "sources_used": list(ingested.keys()) if isinstance(ingested, dict) else [],
                "top_score": scored[0].get("trend_score", 0) if scored else 0,
                "average_score": sum(t.get("trend_score", 0) for t in scored) / len(scored) if scored else 0,
                "filters_applied": filters or {}
            }
        }
    
    async def get_trend_summary(
        self,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        sources: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get a summary of top trends formatted for API response
        
        Args:
            limit: Number of top trends to return
            filters: Optional filters (region, category, etc.)
        
        Returns:
            Formatted response with week, region, and trends
        """
        processed = await self.process_trends(
            limit_per_source=10,  # Get more data per source
            filters=filters,
            sources=sources  # Use provided sources or None for all
        )
        
        top_trends = processed["trends"][:limit]
        
        # Format using TrendFormatter
        region = filters.get("region", "US") if filters else "US"
        return TrendFormatter.format_trends_response(
            trends=top_trends,
            region=region
        )
    
    @staticmethod
    def _generate_trend_text(trend: Dict[str, Any]) -> str:
        """Generate human-readable text description of a trend"""
        title = trend.get("title", "Fashion Trend")
        classification = trend.get("classification", {})
        score = trend.get("trend_score", 0)
        
        # Build description
        parts = [f"Trending: {title}"]
        
        if classification.get("primary_style"):
            parts.append(f"Style: {classification['primary_style'].title()}")
        
        if classification.get("primary_season"):
            parts.append(f"Season: {classification['primary_season'].title()}")
        
        if classification.get("primary_category"):
            parts.append(f"Category: {classification['primary_category'].title()}")
        
        if classification.get("occasions"):
            occasions = ", ".join([o.title() for o in classification["occasions"][:2]])
            parts.append(f"Perfect for: {occasions}")
        
        parts.append(f"Trend Score: {score:.1f}/100")
        
        return " | ".join(parts)
