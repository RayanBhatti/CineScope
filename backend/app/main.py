# backend/app/main.py
import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from .db import run_query

app = FastAPI()

ALLOWED = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/api/health")
def health():
    try:
        from .db import run_query
        row = run_query("SELECT 1 AS ok;")[0]
        return {"status": "ok", "db": row["ok"]}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}


@app.get("/api/attrition/summary")
def attrition_summary():
    sql = """
    SELECT COUNT(*) AS n_total,
           SUM(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END) AS n_left,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v;
    """
    return run_query(sql)[0]

ALLOWED = {"department","job_role","education_field","business_travel","gender","marital_status","over_time"}

@app.get("/api/attrition/by")
def attrition_by(dim: str = Query(..., description="One of: " + ", ".join(sorted(ALLOWED)))):
    if dim not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"Invalid dimension '{dim}'")
    sql = f"""
    SELECT {dim} AS key,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    GROUP BY {dim}
    ORDER BY attrition_rate DESC, n DESC;
    """
    return run_query(sql)

@app.get("/api/distribution/age")
def age_hist(buckets: int = 9, min_age: int = 18, max_age: int = 60):
    # Basic param validation to avoid Postgres errors
    if buckets <= 0:
        raise HTTPException(status_code=400, detail="buckets must be > 0")
    if min_age >= max_age:
        raise HTTPException(status_code=400, detail="min_age must be < max_age")

    sql = """
    SELECT
        width_bucket(age, :min_age, :max_age, :buckets) AS bucket,
        MIN(age) AS min_age,
        MAX(age) AS max_age,
        COUNT(*) AS n,
        ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    WHERE age IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket;
    """
    try:
        return run_query(sql, {"min_age": min_age, "max_age": max_age, "buckets": buckets})
    except SQLAlchemyError as e:
        # Surface the DB error message to the client (useful for prod debugging)
        raise HTTPException(status_code=500, detail=f"DB error: {e.__class__.__name__}: {e}")
