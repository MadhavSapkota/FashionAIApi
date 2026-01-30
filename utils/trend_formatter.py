"""
Trend Formatter
Formats trends into the required API response format
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
import calendar


class TrendFormatter:
    """Formats trends into standardized API response"""
    
    @staticmethod
    def get_iso_week() -> str:
        """Get current ISO week format (e.g., 2026-W04)"""
        now = datetime.now()
        year, week, _ = now.isocalendar()
        return f"{year}-W{week:02d}"
    
    @staticmethod
    def determine_status(score: float, previous_score: Optional[float] = None) -> str:
        """
        Determine trend status based on score
        
        Args:
            score: Current trend score (0-100)
            previous_score: Previous score for comparison (optional)
        
        Returns:
            Status: RISING, STABLE, or DECLINING
        """
        if previous_score is None:
            # Without historical data, use score thresholds
            if score >= 70:
                return "RISING"
            elif score >= 50:
                return "STABLE"
            else:
                return "DECLINING"
        
        # With historical data, compare
        change = score - previous_score
        if change > 5:
            return "RISING"
        elif change < -5:
            return "DECLINING"
        else:
            return "STABLE"
    
    @staticmethod
    def normalize_score(score: float) -> float:
        """Normalize score from 0-100 to 0-1 range"""
        return round(score / 100.0, 2)
    
    @staticmethod
    def generate_summary(trend: Dict[str, Any]) -> str:
        """
        Generate a human-readable summary for a trend
        
        Args:
            trend: Trend item with classification and metadata
        
        Returns:
            Summary text
        """
        classification = trend.get("classification", {})
        title = trend.get("title", "Fashion Trend")
        
        # Extract key information
        style = classification.get("primary_style")
        season = classification.get("primary_season")
        category = classification.get("primary_category")
        occasions = classification.get("occasions", [])
        
        # Build summary
        parts = []
        
        # Style description
        if style:
            style_descriptions = {
                "casual": "casual and comfortable",
                "formal": "formal and professional",
                "streetwear": "urban street style",
                "vintage": "vintage-inspired",
                "bohemian": "bohemian and free-spirited",
                "minimalist": "minimal and clean",
                "glam": "glamorous and elegant",
                "grunge": "edgy and alternative"
            }
            parts.append(style_descriptions.get(style, style))
        
        # Category
        if category:
            category_descriptions = {
                "tops": "tops and blouses",
                "bottoms": "pants and skirts",
                "dresses": "dresses",
                "outerwear": "jackets and coats",
                "footwear": "shoes and boots",
                "accessories": "accessories"
            }
            parts.append(category_descriptions.get(category, category))
        
        # Season
        if season:
            parts.append(f"perfect for {season}")
        
        # Occasions
        if occasions:
            occasion_text = ", ".join(occasions[:2])
            parts.append(f"ideal for {occasion_text}")
        
        # Build final summary
        if parts:
            summary = f"{title.title()} featuring {', '.join(parts)} is gaining popularity this week."
        else:
            summary = f"{title.title()} is trending this week."
        
        # Add engagement context if available
        engagement = trend.get("engagement_metrics", {})
        if engagement.get("likes", 0) > 10000:
            summary += " High engagement and growing interest."
        elif engagement.get("score", 0) > 5000:
            summary += " Strong engagement across platforms."
        
        return summary
    
    @staticmethod
    def format_trends_response(
        trends: List[Dict[str, Any]],
        region: Optional[str] = None,
        week: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Format trends into the required API response format
        
        Args:
            trends: List of processed trend items
            region: Region code (default: US)
            week: ISO week format (default: current week)
        
        Returns:
            Formatted response
        """
        if not week:
            week = TrendFormatter.get_iso_week()
        
        if not region:
            region = "US"
        
        formatted_trends = []
        for trend in trends:
            score = trend.get("trend_score", 0)
            normalized_score = TrendFormatter.normalize_score(score)
            status = TrendFormatter.determine_status(score)
            summary = TrendFormatter.generate_summary(trend)
            
            formatted_trends.append({
                "name": trend.get("title", "Fashion Trend"),
                "status": status,
                "score": normalized_score,
                "summary": summary
            })
        
        return {
            "week": week,
            "region": region,
            "trends": formatted_trends
        }
