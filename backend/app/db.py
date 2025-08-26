import os, time
from typing import Any, Dict, Optional
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from cachetools import LRUCache

# --- Database Engine ---------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args={"connect_timeout": 5},
)

# --- Infinite Cache ----------------------------------------------------------
# Stores last successful query forever (up to maxsize entries)
_query_cache: LRUCache[str, Dict[str, Any]] = LRUCache(maxsize=256)

def _make_key(sql: str, params: Optional[Dict[str, Any]]) -> str:
    return f"{sql}||{tuple(sorted((params or {}).items()))}"

def run_query(sql: str, params: Optional[Dict[str, Any]] = None, cache_key: Optional[str] = None):
    """
    Run a query. Try DB first. On failure, return cached data if available.
    Cache never expires (infinite snapshot).
    """
    key = cache_key or _make_key(sql, params)

    try:
        with engine.connect() as conn:
            res = conn.execute(text(sql), params or {})
            cols = list(res.keys())
            rows = [dict(zip(cols, row)) for row in res.fetchall()]
            _query_cache[key] = {
                "data": rows,
                "cached_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            return rows
    except OperationalError:
        if key in _query_cache:
            return _query_cache[key]["data"]
        raise HTTPException(status_code=503, detail="Database unavailable and no cached data")

def run_query_with_meta(sql: str, params: Optional[Dict[str, Any]] = None, cache_key: Optional[str] = None):
    """
    Same as run_query, but also returns cached_at metadata.
    Useful if you want freshness info in responses.
    """
    key = cache_key or _make_key(sql, params)
    rows = run_query(sql, params, cache_key)
    cached_at = _query_cache[key]["cached_at"]
    return {"cached_at": cached_at, "data": rows}
