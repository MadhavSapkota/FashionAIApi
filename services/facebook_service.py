import os
import httpx
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class FacebookService:
    """Service to fetch trending fashion content from Facebook Graph API."""

    def __init__(self):
        self.access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
        self.api_version = os.getenv("FACEBOOK_API_VERSION", "v18.0")
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        # Optional: comma-separated page IDs to use if Pages Search is not available
        self.fashion_page_ids = os.getenv("FACEBOOK_FASHION_PAGE_IDS", "").strip().split(",")
        self.fashion_page_ids = [x.strip() for x in self.fashion_page_ids if x.strip()]

    def _is_valid_token(self) -> bool:
        if not self.access_token:
            return False
        placeholders = [
            "your_facebook_access_token_here",
            "your_access_token_here",
            "placeholder",
            "",
        ]
        return self.access_token not in placeholders

    async def get_trending_fashion(
        self, limit: int = 10, category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch trending fashion posts from Facebook.

        Uses Pages Search API to find fashion-related pages, then fetches
        published_posts with engagement. Falls back to configured page IDs
        if search is unavailable, then to mock data.
        """
        if not self._is_valid_token():
            print(
                "⚠️  Facebook: Using MOCK data. Set FACEBOOK_ACCESS_TOKEN in .env for real data."
            )
            return self._get_fashion_mock_data(limit)

        try:
            page_ids = await self._get_fashion_page_ids(category or "fashion")
            if not page_ids:
                print("⚠️  Facebook: No pages found; using MOCK data.")
                return self._get_fashion_mock_data(limit)

            posts = await self._fetch_posts_from_pages(page_ids, limit)
            if not posts:
                return self._get_fashion_mock_data(limit)

            return posts[:limit]
        except Exception as e:
            print(f"Error fetching Facebook fashion data: {e}")
            return self._get_fashion_mock_data(limit)

    async def _get_fashion_page_ids(self, category: str) -> List[str]:
        """Resolve fashion page IDs via Pages Search or env config."""
        if self.fashion_page_ids:
            return self.fashion_page_ids[:10]

        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/pages/search"
            params = {
                "q": category,
                "fields": "id,name,fan_count",
                "access_token": self.access_token,
                "limit": 10,
            }
            try:
                r = await client.get(url, params=params)
                r.raise_for_status()
                data = r.json()
                pages = data.get("data", [])
                return [p["id"] for p in pages if p.get("id")]
            except Exception as e:
                print(f"Facebook Pages Search failed: {e}")
                return []

    async def _fetch_posts_from_pages(
        self, page_ids: List[str], limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch published_posts from given pages and return as trending items."""
        post_fields = (
            "message,created_time,full_picture,permalink_url,shares,"
            "reactions.summary(true),comments.summary(true)"
        )
        all_posts: List[Dict[str, Any]] = []
        per_page = max(2, (limit // len(page_ids)) + 2)

        async with httpx.AsyncClient() as client:
            for pid in page_ids:
                try:
                    url = f"{self.base_url}/{pid}/published_posts"
                    params = {
                        "fields": post_fields,
                        "access_token": self.access_token,
                        "limit": per_page,
                    }
                    r = await client.get(url, params=params)
                    r.raise_for_status()
                    data = r.json()
                    raw = data.get("data", [])
                    for p in raw:
                        engagement = self._engagement_from_post(p)
                        msg = (p.get("message") or "").strip()
                        if not msg:
                            msg = "Photo"
                        all_posts.append({
                            "id": p.get("id"),
                            "name": None,
                            "fan_count": 0,
                            "permalink": p.get("permalink_url"),
                            "platform": "facebook",
                            "type": "post",
                            "category": "fashion",
                            "latest_post": {
                                "message": msg[:200],
                                "likes": engagement["likes"],
                                "comments": engagement["comments"],
                                "shares": engagement.get("shares", 0),
                                "image": p.get("full_picture"),
                                "created_time": p.get("created_time"),
                            },
                            "engagement": engagement["score"],
                        })
                except Exception as e:
                    print(f"Facebook published_posts for page {pid}: {e}")
                    continue

        all_posts.sort(key=lambda x: x["engagement"], reverse=True)
        return all_posts

    def _engagement_from_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """Extract likes, comments, shares, and score from post."""
        reactions = post.get("reactions", {}).get("summary", {}) or {}
        comments = post.get("comments", {}).get("summary", {}) or {}
        likes = int(reactions.get("total_count", 0) or 0)
        comments_count = int(comments.get("total_count", 0) or 0)
        sh = post.get("shares")
        shares = int(sh.get("count", 0) or 0) if isinstance(sh, dict) else 0
        score = likes + (comments_count * 2) + (shares * 3)
        return {"likes": likes, "comments": comments_count, "shares": shares, "score": score}

    async def get_trending(
        self, limit: int = 10, category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return await self.get_trending_fashion(limit=limit, category=category)

    def _get_fashion_mock_data(self, limit: int) -> List[Dict[str, Any]]:
        fashion_brands = [
            "Zara Fashion",
            "H&M Style",
            "Forever 21 Outfits",
            "ASOS Fashion",
            "Fashion Nova",
            "Shein Style",
            "Boohoo Fashion",
            "PrettyLittleThing",
            "Missguided Style",
            "Nasty Gal Fashion",
        ]
        outfit_types = [
            "Summer Outfit",
            "Winter Look",
            "Street Style",
            "Casual Chic",
            "Evening Wear",
            "Work Outfit",
            "Weekend Style",
            "Date Night Look",
            "Party Outfit",
            "Athleisure Style",
        ]
        out = []
        for i in range(1, limit + 1):
            brand = fashion_brands[(i - 1) % len(fashion_brands)]
            outfit = outfit_types[(i - 1) % len(outfit_types)]
            out.append({
                "id": f"fb_fashion_{i}",
                "name": brand,
                "fan_count": 1500000 - (i * 15000),
                "platform": "facebook",
                "type": "fashion_page",
                "category": "fashion",
                "latest_post": {
                    "message": f"🔥 Trending {outfit} Alert! Check out this amazing look #{i}",
                    "likes": 50000 - (i * 500),
                    "comments": 5000 - (i * 50),
                    "shares": 2000 - (i * 20),
                    "image": f"https://example.com/fashion-outfit-{i}.jpg",
                    "created_time": "2025-01-26T10:00:00+0000",
                },
                "engagement": 57000 - (i * 570),
            })
        return out
