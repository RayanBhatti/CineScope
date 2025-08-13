import os
from sqlalchemy import create_engine, text
from sqlalchemy.sql import TextClause

DB_URL = os.environ["DATABASE_URL"]
engine = create_engine(DB_URL, pool_pre_ping=True)

def run_query(sql, params=None):
    with engine.connect() as conn:
        if isinstance(sql, TextClause):
            res = conn.execute(sql, params or {})
        else:
            res = conn.execute(text(sql), params or {})
        return [dict(row) for row in res.mappings()]
