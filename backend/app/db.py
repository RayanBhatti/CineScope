import os
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DB_URL, pool_pre_ping=True)

def run_query(sql, params=None):
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        return [dict(row) for row in result.mappings()]
