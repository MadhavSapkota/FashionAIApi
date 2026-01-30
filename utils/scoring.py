"""
Trend Scoring Engine
Scores trends based on engagement, recency, source credibility, etc.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import math


class TrendScoringEngine:
    """Scores fashion trends based on multiple factors"""
    
    # Source credibility weights (higher = more credible)
    SOURCE_WEIGHTS = {
        "google_trends": 1.2,
        "tiktok": 1.0,
        "pinterest": 0.9,
        "instagram": 1.0,
        "facebook": 0.9,
        "ecommerce": 0.8,
    }
    
    # Engagement weight multipliers
    ENGAGEMENT_WEIGHTS = {
        "likes": 1.0,
        "comments": 2.0,  # Comments are more valuable
        "shares": 3.0,    # Shares are most valuable
        "views": 0.1,     # Views are less valuable
        "score": 1.0      # Generic score
    }
    
    @staticmethod
    def calculate_trend_score(trend: Dict[str, Any]) -> float:
        """
        Calculate overall trend score for a single trend
        
        Args:
            trend: Classified trend item
        
        Returns:
            Trend score (0-100)
        """
        # Base score from engagement
        engagement_score = TrendScoringEngine._calculate_engagement_score(trend)
        
        # Recency score (newer = higher)
        recency_score = TrendScoringEngine._calculate_recency_score(trend)
        
        # Source credibility
        source_score = TrendScoringEngine._calculate_source_score(trend)
        
        # Classification completeness
        classification_score = TrendScoringEngine._calculate_classification_score(trend)
        
        # Combine scores with weights
        final_score = (
            engagement_score * 0.4 +
            recency_score * 0.3 +
            source_score * 0.2 +
            classification_score * 0.1
        )
        
        # Normalize to 0-100
        return min(100, max(0, final_score))
    
    @staticmethod
    def _calculate_engagement_score(trend: Dict[str, Any]) -> float:
        """Calculate score based on engagement metrics"""
        engagement = trend.get("engagement_metrics", {})
        
        total_engagement = 0
        for metric, value in engagement.items():
            if metric in TrendScoringEngine.ENGAGEMENT_WEIGHTS:
                weight = TrendScoringEngine.ENGAGEMENT_WEIGHTS[metric]
                total_engagement += value * weight
        
        # Normalize using log scale (diminishing returns)
        if total_engagement > 0:
            score = math.log10(total_engagement + 1) * 10
            return min(100, score)
        
        return 0
    
    @staticmethod
    def _calculate_recency_score(trend: Dict[str, Any]) -> float:
        """Calculate score based on how recent the trend is"""
        try:
            timestamp_str = trend.get("timestamp", "")
            if not timestamp_str:
                return 50  # Neutral score if no timestamp
            
            trend_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            now = datetime.now(trend_time.tzinfo) if trend_time.tzinfo else datetime.now()
            
            age_hours = (now - trend_time).total_seconds() / 3600
            
            # Score decreases with age
            # 0-24 hours: 100-80
            # 24-72 hours: 80-60
            # 72-168 hours (1 week): 60-40
            # Older: 40-0
            
            if age_hours <= 24:
                score = 100 - (age_hours / 24) * 20
            elif age_hours <= 72:
                score = 80 - ((age_hours - 24) / 48) * 20
            elif age_hours <= 168:
                score = 60 - ((age_hours - 72) / 96) * 20
            else:
                score = max(0, 40 - ((age_hours - 168) / 168) * 40)
            
            return max(0, min(100, score))
        except:
            return 50  # Neutral if parsing fails
    
    @staticmethod
    def _calculate_source_score(trend: Dict[str, Any]) -> float:
        """Calculate score based on source credibility"""
        source = trend.get("source", "")
        weight = TrendScoringEngine.SOURCE_WEIGHTS.get(source, 0.8)
        return weight * 100
    
    @staticmethod
    def _calculate_classification_score(trend: Dict[str, Any]) -> float:
        """Calculate score based on classification completeness"""
        classification = trend.get("classification", {})
        
        score = 0
        if classification.get("primary_style"):
            score += 25
        if classification.get("primary_season"):
            score += 25
        if classification.get("primary_category"):
            score += 25
        if classification.get("occasions"):
            score += 25
        
        return score
    
    @staticmethod
    def score_trends(trends: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Score multiple trends and sort by score
        
        Args:
            trends: List of classified trend items
        
        Returns:
            List of trends with scores, sorted by score (descending)
        """
        scored_trends = []
        for trend in trends:
            try:
                score = TrendScoringEngine.calculate_trend_score(trend)
                trend["trend_score"] = round(score, 2)
                scored_trends.append(trend)
            except Exception as e:
                print(f"Error scoring trend: {str(e)}")
                trend["trend_score"] = 0
                scored_trends.append(trend)
        
        # Sort by score (descending)
        scored_trends.sort(key=lambda x: x.get("trend_score", 0), reverse=True)
        
        return scored_trends
