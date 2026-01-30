"""
Normalization & Cleaning Layer
Standardizes data from different sources into a common format
"""
from typing import List, Dict, Any, Optional
import re
from datetime import datetime


class TrendNormalizer:
    """Normalizes and cleans trend data from various sources"""
    
    @staticmethod
    def normalize_trend_item(item: Dict[str, Any], source: str) -> Dict[str, Any]:
        """
        Normalize a single trend item to common format
        
        Args:
            item: Raw trend item from source
            source: Source platform name
        
        Returns:
            Normalized trend item
        """
        normalized = {
            "id": item.get("id", ""),
            "source": source,
            "title": TrendNormalizer._extract_title(item, source),
            "description": TrendNormalizer._clean_text(item.get("caption") or item.get("description") or item.get("title") or ""),
            "image_url": TrendNormalizer._extract_image_url(item, source),
            "url": TrendNormalizer._extract_url(item, source),
            "engagement_metrics": TrendNormalizer._normalize_engagement(item, source),
            "hashtags": TrendNormalizer._extract_hashtags(item, source),
            "category": item.get("category", "fashion"),
            "timestamp": TrendNormalizer._normalize_timestamp(item, source),
            "raw_data": item  # Keep original for reference
        }
        
        return normalized
    
    @staticmethod
    def _extract_title(item: Dict[str, Any], source: str) -> str:
        """Extract and clean title"""
        title_fields = {
            "tiktok": ["title", "description"],
            "pinterest": ["title"],
            "google_trends": ["keyword"],
            "ecommerce": ["product_name"],
            "instagram": ["caption", "title"],
            "facebook": ["latest_post", "name"],
        }
        
        for field in title_fields.get(source, ["title", "name"]):
            if field == "latest_post" and item.get("latest_post"):
                title = item["latest_post"].get("message", "")
                if title:
                    return TrendNormalizer._clean_text(title[:100])
            elif item.get(field):
                return TrendNormalizer._clean_text(str(item[field])[:100])
        
        return "Fashion Trend"
    
    @staticmethod
    def _extract_image_url(item: Dict[str, Any], source: str) -> Optional[str]:
        """Extract image URL"""
        image_fields = {
            "tiktok": ["cover_image_url"],
            "pinterest": ["image_url"],
            "google_trends": [],
            "ecommerce": ["image_url"],
            "instagram": ["media_url", "thumbnail_url"],
            "facebook": ["latest_post"],
        }
        
        for field in image_fields.get(source, ["image_url", "image"]):
            if field == "latest_post" and item.get("latest_post"):
                return item["latest_post"].get("image") or item["latest_post"].get("full_picture")
            elif item.get(field):
                return item[field]
        
        return None
    
    @staticmethod
    def _extract_url(item: Dict[str, Any], source: str) -> Optional[str]:
        """Extract URL"""
        url_fields = {
            "tiktok": ["video_url", "permalink"],
            "pinterest": ["pin_url"],
            "google_trends": [],
            "ecommerce": ["product_url"],
            "instagram": ["permalink"],
            "facebook": ["permalink"],
        }
        
        for field in url_fields.get(source, ["url", "permalink"]):
            if item.get(field):
                return item[field]
        
        return None
    
    @staticmethod
    def _normalize_engagement(item: Dict[str, Any], source: str) -> Dict[str, int]:
        """Normalize engagement metrics"""
        engagement = {
            "likes": 0,
            "comments": 0,
            "shares": 0,
            "views": 0,
            "score": 0
        }
        
        if source == "tiktok":
            engagement["likes"] = item.get("like_count", 0)
            engagement["comments"] = item.get("comment_count", 0)
            engagement["shares"] = item.get("share_count", 0)
            engagement["views"] = item.get("view_count", 0)
            engagement["score"] = engagement["views"] // 1000 + engagement["likes"] + (engagement["shares"] * 5)
        elif source == "pinterest":
            engagement["likes"] = item.get("like_count", 0)
            engagement["comments"] = item.get("comment_count", 0)
            engagement["score"] = engagement["likes"] + (engagement["comments"] * 3)
        elif source == "google_trends":
            engagement["score"] = item.get("trend_score", 0)
        elif source == "ecommerce":
            engagement["score"] = item.get("trend_score", 0)
            engagement["views"] = item.get("sales_volume", 0)
        elif source == "instagram":
            engagement["likes"] = item.get("like_count", 0)
            engagement["comments"] = item.get("comments_count", 0)
            engagement["score"] = engagement["likes"] + (engagement["comments"] * 2)
        elif source == "facebook":
            lp = item.get("latest_post") or {}
            engagement["likes"] = lp.get("likes", 0)
            engagement["comments"] = lp.get("comments", 0)
            engagement["shares"] = lp.get("shares", 0)
            engagement["score"] = item.get("engagement", 0) or (engagement["likes"] + engagement["comments"] * 2 + engagement["shares"] * 3)
        
        return engagement
    
    @staticmethod
    def _extract_hashtags(item: Dict[str, Any], source: str) -> List[str]:
        """Extract and normalize hashtags"""
        hashtags = []
        
        if source == "tiktok":
            hashtags = item.get("hashtags", [])
        elif source == "pinterest":
            desc = item.get("description", "")
            hashtags = re.findall(r'#\w+', desc)
        elif source == "instagram":
            hashtags = item.get("hashtags", [])
        elif source == "facebook":
            lp = item.get("latest_post") or {}
            msg = lp.get("message", "") or ""
            hashtags = re.findall(r'#\w+', msg)
        
        # Normalize hashtags (remove # if present, lowercase)
        normalized = []
        for tag in hashtags:
            if isinstance(tag, str):
                tag = tag.lstrip('#').lower()
                if tag and tag not in normalized:
                    normalized.append(tag)
        
        return normalized[:10]  # Limit to 10 hashtags
    
    @staticmethod
    def _normalize_timestamp(item: Dict[str, Any], source: str) -> str:
        """Normalize timestamp to ISO format"""
        timestamp_fields = {
            "tiktok": ["created_time"],
            "pinterest": ["created_at"],
            "google_trends": ["timestamp"],
            "ecommerce": ["timestamp"],
            "instagram": ["timestamp"],
            "facebook": ["latest_post"],
        }
        
        for field in timestamp_fields.get(source, ["timestamp", "created_at", "created_time"]):
            if field == "latest_post" and item.get("latest_post"):
                ts = item["latest_post"].get("created_time")
                if ts:
                    return TrendNormalizer._parse_timestamp(ts)
            elif item.get(field):
                return TrendNormalizer._parse_timestamp(item[field])
        
        return datetime.now().isoformat()
    
    @staticmethod
    def _parse_timestamp(ts: Any) -> str:
        """Parse various timestamp formats to ISO"""
        if isinstance(ts, str):
            # Try to parse common formats
            try:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                return dt.isoformat()
            except:
                return datetime.now().isoformat()
        return datetime.now().isoformat()
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s#@.,!?-]', '', text)
        return text.strip()
    
    @staticmethod
    def normalize_trends(
        trends_by_source: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """
        Normalize all trends from multiple sources into a unified list
        
        Args:
            trends_by_source: Dictionary mapping source names to lists of trend items
        
        Returns:
            List of normalized trend items
        """
        normalized_trends = []
        
        for source, items in trends_by_source.items():
            if source == "metadata":
                continue
            for item in items:
                try:
                    normalized = TrendNormalizer.normalize_trend_item(item, source)
                    normalized_trends.append(normalized)
                except Exception as e:
                    print(f"Error normalizing item from {source}: {str(e)}")
                    continue
        
        return normalized_trends
