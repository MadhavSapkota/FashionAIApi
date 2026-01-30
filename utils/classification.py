"""
Trend Classification Layer
Classifies trends into categories, styles, seasons, etc.
"""
from typing import List, Dict, Any, Optional
import re


class TrendClassifier:
    """Classifies fashion trends into various categories"""
    
    # Fashion style keywords
    STYLE_KEYWORDS = {
        "casual": ["casual", "everyday", "comfortable", "relaxed", "simple"],
        "formal": ["formal", "business", "professional", "office", "corporate"],
        "streetwear": ["street", "urban", "hip-hop", "sneaker", "athletic"],
        "vintage": ["vintage", "retro", "classic", "old-school", "throwback"],
        "bohemian": ["boho", "bohemian", "hippie", "free-spirited", "flowy"],
        "minimalist": ["minimal", "simple", "clean", "basic", "neutral"],
        "glam": ["glam", "glamorous", "elegant", "luxury", "fancy"],
        "grunge": ["grunge", "edgy", "punk", "alternative", "dark"]
    }
    
    # Season keywords
    SEASON_KEYWORDS = {
        "spring": ["spring", "floral", "pastel", "light", "fresh"],
        "summer": ["summer", "beach", "vacation", "hot", "sunny", "tropical"],
        "fall": ["fall", "autumn", "cozy", "warm", "layered"],
        "winter": ["winter", "cold", "warm", "layered", "cozy", "snow"]
    }
    
    # Category keywords
    CATEGORY_KEYWORDS = {
        "tops": ["top", "shirt", "blouse", "sweater", "hoodie", "tank", "crop"],
        "bottoms": ["pants", "jeans", "skirt", "shorts", "leggings", "trousers"],
        "dresses": ["dress", "gown", "frock"],
        "outerwear": ["jacket", "coat", "blazer", "cardigan", "trench"],
        "footwear": ["shoes", "boots", "sneakers", "heels", "sandals", "flats"],
        "accessories": ["bag", "hat", "jewelry", "belt", "scarf", "sunglasses"]
    }
    
    # Occasion keywords
    OCCASION_KEYWORDS = {
        "work": ["work", "office", "professional", "business", "corporate"],
        "casual": ["casual", "everyday", "weekend", "relaxed"],
        "party": ["party", "night", "club", "celebration", "festive"],
        "date": ["date", "romantic", "dinner", "evening"],
        "sport": ["sport", "athletic", "gym", "workout", "active"],
        "formal_event": ["formal", "wedding", "gala", "event", "ceremony"]
    }
    
    @staticmethod
    def classify_trend(trend: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classify a single trend item
        
        Args:
            trend: Normalized trend item
        
        Returns:
            Trend item with classification added
        """
        text = f"{trend.get('title', '')} {trend.get('description', '')}".lower()
        hashtags = [tag.lower() for tag in trend.get('hashtags', [])]
        all_text = f"{text} {' '.join(hashtags)}"
        
        classification = {
            "styles": TrendClassifier._classify_styles(all_text),
            "seasons": TrendClassifier._classify_seasons(all_text),
            "categories": TrendClassifier._classify_categories(all_text),
            "occasions": TrendClassifier._classify_occasions(all_text),
            "primary_style": TrendClassifier._get_primary_style(all_text),
            "primary_season": TrendClassifier._get_primary_season(all_text),
            "primary_category": TrendClassifier._get_primary_category(all_text)
        }
        
        trend["classification"] = classification
        return trend
    
    @staticmethod
    def _classify_styles(text: str) -> List[str]:
        """Classify fashion styles"""
        matched_styles = []
        for style, keywords in TrendClassifier.STYLE_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                matched_styles.append(style)
        return matched_styles
    
    @staticmethod
    def _classify_seasons(text: str) -> List[str]:
        """Classify seasons"""
        matched_seasons = []
        for season, keywords in TrendClassifier.SEASON_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                matched_seasons.append(season)
        return matched_seasons
    
    @staticmethod
    def _classify_categories(text: str) -> List[str]:
        """Classify clothing categories"""
        matched_categories = []
        for category, keywords in TrendClassifier.CATEGORY_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                matched_categories.append(category)
        return matched_categories
    
    @staticmethod
    def _classify_occasions(text: str) -> List[str]:
        """Classify occasions"""
        matched_occasions = []
        for occasion, keywords in TrendClassifier.OCCASION_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                matched_occasions.append(occasion)
        return matched_occasions
    
    @staticmethod
    def _get_primary_style(text: str) -> Optional[str]:
        """Get primary style"""
        styles = TrendClassifier._classify_styles(text)
        return styles[0] if styles else None
    
    @staticmethod
    def _get_primary_season(text: str) -> Optional[str]:
        """Get primary season"""
        seasons = TrendClassifier._classify_seasons(text)
        return seasons[0] if seasons else None
    
    @staticmethod
    def _get_primary_category(text: str) -> Optional[str]:
        """Get primary category"""
        categories = TrendClassifier._classify_categories(text)
        return categories[0] if categories else None
    
    @staticmethod
    def classify_trends(trends: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Classify multiple trends
        
        Args:
            trends: List of normalized trend items
        
        Returns:
            List of trends with classification added
        """
        classified = []
        for trend in trends:
            try:
                classified_trend = TrendClassifier.classify_trend(trend)
                classified.append(classified_trend)
            except Exception as e:
                print(f"Error classifying trend: {str(e)}")
                trend["classification"] = {}
                classified.append(trend)
        
        return classified
