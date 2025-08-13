import os
from sqlalchemy import create_engine, text

# Load .env in local dev (safe no-op in prod)
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

DB_URL = os.environ["DATABASE_URL"]
engine = create_engine(DB_URL, pool_pre_ping=True)

def run_query(sql: str, params=None):
    """Execute a SQL string with optional params and return list[dict]."""
    with engine.connect() as conn:
        res = conn.execute(text(sql), params or {})
        return [dict(row) for row in res.mappings()]
