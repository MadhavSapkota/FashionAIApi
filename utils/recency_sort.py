"""Sort feeds and trends with newest content first (descending time)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List


def epoch_from_raw_value(val: Any) -> float:
    """Parse API timestamps (ISO strings, Unix seconds, or ms) to epoch seconds."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        ts = float(val)
        if ts > 1e12:
            ts /= 1000.0
        return ts
    if isinstance(val, str):
        s = val.strip()
        if s.isdigit():
            return epoch_from_raw_value(int(s))
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt.timestamp()
        except ValueError:
            return 0.0
    return 0.0


def raw_item_recency_epoch(item: Dict[str, Any], source: str) -> float:
    """Best-effort recency for raw platform payloads before normalization."""
    if source == "facebook":
        lp = item.get("latest_post") or {}
        return epoch_from_raw_value(lp.get("created_time"))
    if source == "instagram":
        return epoch_from_raw_value(item.get("timestamp"))
    if source == "tiktok":
        return epoch_from_raw_value(item.get("created_time"))
    if source == "pinterest":
        return epoch_from_raw_value(item.get("created_at"))
    if source in ("google_trends", "ecommerce"):
        return epoch_from_raw_value(item.get("timestamp"))
    return 0.0


def sort_raw_platform_items(items: List[Dict[str, Any]], source: str) -> List[Dict[str, Any]]:
    """Newest-first; stable tie-break preserves original order among equal timestamps."""
    if not items:
        return items
    return [
        pair[1]
        for pair in sorted(
            enumerate(items),
            key=lambda e: (-raw_item_recency_epoch(e[1], source), e[0]),
        )
    ]


def normalized_timestamp_epoch(trend: Dict[str, Any]) -> float:
    """Recency for normalized / classified trend dicts (ISO `timestamp` field)."""
    return epoch_from_raw_value(trend.get("timestamp"))
