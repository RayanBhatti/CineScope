from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal, List
import os, re

from .db import run_query

app = FastAPI(title="CineScope HR Analytics API")

allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
allowed_regex = os.getenv("ALLOWED_ORIGIN_REGEX")  # e.g. ^https://.*\.vercel\.app$

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed if not allowed_regex else [],   # exact origins list
    allow_origin_regex=allowed_regex,                     # OR one regex
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,  # set True only if you actually use cookies/auth
)

#  Health
@app.get("/api/health")
def health():
    try:
        ok = run_query("SELECT 1 AS ok;")[0]["ok"]
        return {"status": "ok", "db": int(ok)}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

#  Summary & Grouped
@app.get("/api/attrition/summary")
def attrition_summary():
    sql = """
    SELECT COUNT(*)                         AS n_total,
           SUM(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END) AS n_left,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v;
    """
    return run_query(sql)[0]

ALLOWED_DIMS = {
    "department","job_role","education_field","business_travel",
    "gender","marital_status","over_time"
}

@app.get("/api/attrition/by")
def attrition_by(dim: str = Query(..., description=f"One of: {', '.join(sorted(ALLOWED_DIMS))}")):
    if dim not in ALLOWED_DIMS:
        raise HTTPException(status_code=400, detail=f"Invalid dim '{dim}'")
    sql = f"""
    SELECT {dim} AS key,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    GROUP BY {dim}
    ORDER BY attrition_rate DESC, n DESC;
    """
    return run_query(sql)

#  Age histogram
@app.get("/api/distribution/age")
def age_hist(buckets: int = 9, min_age: int = 18, max_age: int = 60):
    if buckets <= 0: raise HTTPException(400, "buckets must be > 0")
    if min_age >= max_age: raise HTTPException(400, "min_age must be < max_age")
    sql = """
    SELECT width_bucket(age, :min_age, :max_age, :buckets) AS bucket,
           MIN(age) AS min_age,
           MAX(age) AS max_age,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    WHERE age IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket;
    """
    return run_query(sql, {"min_age": min_age, "max_age": max_age, "buckets": buckets})

#  Monthly income histogram
@app.get("/api/distribution/monthly_income")
def income_hist(buckets: int = 20):
    if buckets <= 0: raise HTTPException(400, "buckets must be > 0")
    # auto-range from data (min/max)
    bounds = run_query("SELECT MIN(monthly_income) AS lo, MAX(monthly_income) AS hi FROM hr_employees_v")[0]
    lo, hi = bounds["lo"], bounds["hi"]
    sql = """
    SELECT width_bucket(monthly_income, :lo, :hi, :buckets) AS bucket,
           MIN(monthly_income) AS min_income,
           MAX(monthly_income) AS max_income,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    WHERE monthly_income IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket;
    """
    return run_query(sql, {"lo": lo, "hi": hi, "buckets": buckets})

#  Tenure curve (attrition vs years_at_company buckets)
@app.get("/api/attrition/tenure_curve")
def tenure_curve(max_years: int = 40):
    if max_years <= 0: raise HTTPException(400, "max_years must be > 0")
    sql = """
    WITH b AS (
      SELECT GREATEST(0, LEAST(:max_years, years_at_company))::int AS y
      FROM hr_employees_v
      WHERE years_at_company IS NOT NULL
    )
    SELECT y AS years_at_company,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN (SELECT attrition FROM hr_employees_v h
                                WHERE h.years_at_company = b.y LIMIT 1)='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM b
    GROUP BY y
    ORDER BY y;
    """
    # The above "lookup" can be simplified by grouping directly; keeping structure clear
    sql = """
    SELECT years_at_company,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    WHERE years_at_company IS NOT NULL
    GROUP BY years_at_company
    ORDER BY years_at_company
    LIMIT :max_years;
    """
    return run_query(sql, {"max_years": max_years})

#  Two-way breakdown
ALLOWED_DIMS_TWO = list(ALLOWED_DIMS)

@app.get("/api/attrition/by_two")
def attrition_by_two(
    dim1: str = Query(..., description=f"dim1 in: {', '.join(sorted(ALLOWED_DIMS_TWO))}"),
    dim2: str = Query(..., description=f"dim2 in: {', '.join(sorted(ALLOWED_DIMS_TWO))}")
):
    if dim1 not in ALLOWED_DIMS_TWO or dim2 not in ALLOWED_DIMS_TWO:
        raise HTTPException(400, "Invalid dim1 or dim2")
    if dim1 == dim2:
        raise HTTPException(400, "dim1 and dim2 must differ")
    sql = f"""
    SELECT {dim1} AS k1, {dim2} AS k2,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    GROUP BY {dim1}, {dim2}
    ORDER BY k1, k2;
    """
    return run_query(sql)

#  Correlations vs numeric features 
NUMERIC_COLS: List[str] = [
    "age","daily_rate","distance_from_home","education","environment_satisfaction",
    "hourly_rate","job_involvement","job_level","job_satisfaction","monthly_income",
    "monthly_rate","num_companies_worked","percent_salary_hike","performance_rating",
    "relationship_satisfaction","stock_option_level","total_working_years",
    "training_times_last_year","work_life_balance","years_at_company",
    "years_in_current_role","years_since_last_promotion","years_with_curr_manager"
]

@app.get("/api/correlation/numeric")
def correlation_numeric():
    rows = []
    for col in NUMERIC_COLS:
        sql = f"""
        SELECT '{col}' AS feature,
               corr(CASE WHEN attrition='Yes' THEN 1.0 ELSE 0.0 END, {col}::float) AS corr
        FROM hr_employees_v
        WHERE {col} IS NOT NULL;
        """
        res = run_query(sql)[0]
        rows.append(res)
    # sort in Python so client can display top/bottom easily
    rows_sorted = sorted(rows, key=lambda r: (r["corr"] is None, abs(r["corr"] or 0)), reverse=True)
    return rows_sorted

#  Box-plot stats (income by role)
@app.get("/api/boxplot/income_by_role")
def income_box_by_role():
    sql = """
    SELECT job_role,
           MIN(monthly_income)::int AS min,
           PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY monthly_income)::int AS q1,
           PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY monthly_income)::int AS median,
           PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY monthly_income)::int AS q3,
           MAX(monthly_income)::int AS max
    FROM hr_employees_v
    WHERE monthly_income IS NOT NULL
    GROUP BY job_role
    ORDER BY job_role;
    """
    return run_query(sql)

#  Scatter: age vs income (+ attrition flag)
@app.get("/api/scatter/age_income")
def scatter_age_income(limit: int = 1000):
    sql = """
    SELECT age::int AS age,
           monthly_income::int AS monthly_income,
           CASE WHEN attrition='Yes' THEN 1 ELSE 0 END AS left_flag
    FROM hr_employees_v
    WHERE age IS NOT NULL AND monthly_income IS NOT NULL
    ORDER BY random()
    LIMIT :limit;
    """
    return run_query(sql, {"limit": limit})

#  Radar-friendly satisfaction profile 
@app.get("/api/radar/satisfaction")
def radar_satisfaction():
    sql = """
    SELECT
      CASE WHEN attrition='Yes' THEN 'Left' ELSE 'Stayed' END AS group_name,
      ROUND(AVG(environment_satisfaction)::numeric, 2)  AS environment,
      ROUND(AVG(job_satisfaction)::numeric, 2)          AS job,
      ROUND(AVG(relationship_satisfaction)::numeric, 2) AS relationship,
      ROUND(AVG(work_life_balance)::numeric, 2)         AS work_life
    FROM hr_employees_v
    GROUP BY group_name
    ORDER BY group_name;
    """
    return run_query(sql)

#  Gender pie
@app.get("/api/pie/gender")
def gender_pie():
    sql = """
    SELECT gender,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    GROUP BY gender
    ORDER BY n DESC;
    """
    return run_query(sql)

# --- NEW: Attrition vs Minimum Income (bucketed by income; X= bucket min, Y= attrition rate) ---
@app.get("/api/line/attrition_vs_min_income")
def attrition_vs_min_income(buckets: int = 30):
    if buckets <= 0:
        raise HTTPException(status_code=400, detail="buckets must be > 0")

    # determine range from data
    bounds = run_query("""
        SELECT MIN(monthly_income) AS lo, MAX(monthly_income) AS hi
        FROM hr_employees_v
        WHERE monthly_income IS NOT NULL
    """)[0]
    lo, hi = bounds["lo"], bounds["hi"]
    if lo is None or hi is None or lo == hi:
        return []

    # bucket by income and compute attrition in each bucket
    sql = """
    WITH b AS (
      SELECT
        width_bucket(monthly_income, :lo, :hi, :buckets) AS bk,
        monthly_income,
        CASE WHEN attrition='Yes' THEN 1 ELSE 0 END AS left_flag
      FROM hr_employees_v
      WHERE monthly_income IS NOT NULL
    )
    SELECT
      MIN(monthly_income)::int AS min_income,
      ROUND(AVG(left_flag)::numeric, 4) AS attrition_rate
    FROM b
    GROUP BY bk
    ORDER BY bk;
    """
    return run_query(sql, {"lo": lo, "hi": hi, "buckets": buckets})


# --- NEW: Attrition by Employee Number (X = employee_number or row index, Y = 0/1) ---
@app.get("/api/line/attrition_by_employee_index")
def attrition_by_employee_index():
    # prefer employee_number if present
    try:
        rows = run_query("""
            SELECT employee_number::int AS idx,
                   CASE WHEN attrition='Yes' THEN 1 ELSE 0 END AS left_flag
            FROM hr_employees_v
            WHERE employee_number IS NOT NULL
            ORDER BY employee_number;
        """)
        if rows and rows[0].get("idx") is not None:
            return rows
    except Exception:
        pass

    # fallback to row_number if the column doesn't exist
    sql = """
    SELECT
      row_number() OVER (ORDER BY (SELECT 1))::int AS idx,
      CASE WHEN attrition='Yes' THEN 1 ELSE 0 END AS left_flag
    FROM hr_employees_v;
    """
    return run_query(sql)