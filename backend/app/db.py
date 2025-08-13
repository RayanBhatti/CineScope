# backend/app/db.py
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv; load_dotenv()

DB_URL = os.environ["DATABASE_URL"]
engine = create_engine(DB_URL, pool_pre_ping=True)

def run_query(sql, params=None):
    with engine.connect() as conn:
        res = conn.execute(text(sql), params or {})
        return [dict(row) for row in res.mappings()]
