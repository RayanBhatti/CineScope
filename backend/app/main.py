from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import run_query

app = FastAPI(title="CineScope API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your Vercel domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/top-genres")
def top_genres():
    sql = """
    SELECT g.name AS genre, COUNT(*)::int AS count
    FROM movies m
    JOIN movie_genres mg ON mg.movie_id = m.id
    JOIN genres g ON g.id = mg.genre_id
    GROUP BY g.name
    ORDER BY count DESC
    LIMIT 10;
    """
    return run_query(sql)
