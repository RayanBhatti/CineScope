# backend/app/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .db import run_query  # uses DATABASE_URL from env

app = FastAPI()

# In prod, set to your Vercel domain instead of "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    try:
        # lightweight DB ping
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
    sql = text("""
    SELECT width_bucket(age, :min_age, :max_age, :buckets) AS bucket,
           MIN(age) AS min_age,
           MAX(age) AS max_age,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    WHERE age IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket;
    """)
    return run_query(sql, {"min_age": min_age, "max_age": max_age, "buckets": buckets})
