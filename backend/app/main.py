from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os

from .db import run_query

app = FastAPI(title="CineScope HR Analytics API")

# --- CORS --------------------------------------------------------------------
allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
allowed_regex = os.getenv("ALLOWED_ORIGIN_REGEX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed if not allowed_regex else [],
    allow_origin_regex=allowed_regex,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# --- Health (kept, harmless + useful) ----------------------------------------
@app.get("/api/health")
def health():
    try:
        ok = run_query("SELECT 1 AS ok;", cache_key="health")[0]["ok"]
        return {"status": "ok", "db": int(ok)}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

# --- Summary -----------------------------------------------------------------
@app.get("/api/attrition/summary")
def attrition_summary():
    sql = """
    SELECT COUNT(*) AS n_total,
           SUM(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END) AS n_left,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v;
    """
    return run_query(sql, cache_key="attrition_summary")[0]

# --- By Dimension ------------------------------------------------------------
ALLOWED_DIMS = {
    "department","job_role","education_field","business_travel",
    "gender","marital_status","over_time"
}

@app.get("/api/attrition/by")
def attrition_by(dim: str = Query(..., description=f"One of: {', '.join(sorted(ALLOWED_DIMS))}")):
    if dim not in ALLOWED_DIMS:
        raise HTTPException(400, f"Invalid dim '{dim}'")
    sql = f"""
    SELECT {dim} AS key,
           COUNT(*) AS n,
           ROUND(AVG(CASE WHEN attrition='Yes' THEN 1 ELSE 0 END)::numeric, 4) AS attrition_rate
    FROM hr_employees_v
    GROUP BY {dim}
    ORDER BY attrition_rate DESC, n DESC;
    """
    return run_query(sql, cache_key=f"attrition_by_{dim}")

# --- Age Histogram -----------------------------------------------------------
@app.get("/api/distribution/age")
def age_hist(buckets: int = 9, min_age: int = 18, max_age: int = 60):
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
    params = {"min_age": min_age, "max_age": max_age, "buckets": buckets}
    return run_query(sql, params, cache_key=f"age_hist_{buckets}_{min_age}_{max_age}")

# --- Monthly income histogram (used by frontend in some views) ---------------
@app.get("/api/distribution/monthly_income")
def income_hist(buckets: int = 20):
    bounds = run_query(
        "SELECT MIN(monthly_income) AS lo, MAX(monthly_income) AS hi "
        "FROM hr_employees_v WHERE monthly_income IS NOT NULL",
        cache_key="income_bounds"
    )[0]
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
    return run_query(sql, {"lo": lo, "hi": hi, "buckets": buckets}, cache_key=f"income_hist_{buckets}")

# --- Tenure curve ------------------------------------------------------------
@app.get("/api/attrition/tenure_curve")
def tenure_curve(max_years: int = 40):
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
    return run_query(sql, {"max_years": max_years}, cache_key=f"tenure_curve_{max_years}")

# --- Two-way breakdown (dept x overtime etc) --------------------------------
@app.get("/api/attrition/by_two")
def attrition_by_two(dim1: str, dim2: str):
    if dim1 not in ALLOWED_DIMS or dim2 not in ALLOWED_DIMS:
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
    return run_query(sql, cache_key=f"attrition_by_two_{dim1}_{dim2}")

# --- Correlations (numeric features) ----------------------------------------
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
        res = run_query(sql, cache_key=f"corr_{col}")[0]
        rows.append(res)
    # sort client-ready
    return sorted(rows, key=lambda r: (r["corr"] is None, abs(r["corr"] or 0)), reverse=True)

# --- Box-plot stats (income by role) ----------------------------------------
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
    return run_query(sql, cache_key="income_by_role")

# --- Scatter: Age vs Income --------------------------------------------------
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
    return run_query(sql, {"limit": limit}, cache_key=f"scatter_age_income_{limit}")

# --- Radar-friendly satisfaction profile ------------------------------------
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
    return run_query(sql, cache_key="radar_satisfaction")

# --- Gender pie --------------------------------------------------------------
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
    return run_query(sql, cache_key="gender_pie")

# Attrition vs Minimum Income =================================
@app.get("/api/line/attrition_vs_min_income")
def attrition_vs_min_income(buckets: int = 20):
    # bounds cached separately
    bounds = run_query(
        "SELECT MIN(monthly_income) AS lo, MAX(monthly_income) AS hi "
        "FROM hr_employees_v WHERE monthly_income IS NOT NULL",
        cache_key="income_bounds"
    )[0]
    lo, hi = bounds["lo"], bounds["hi"]
    # group by min-income bucket and compute attrition rate
    sql = """
    SELECT bkt AS bucket,
           MIN(monthly_income) AS min_income,
           COUNT(*) FILTER (WHERE attrition='Yes')::float / NULLIF(COUNT(*),0) AS attrition_rate
    FROM (
      SELECT width_bucket(monthly_income, :lo, :hi, :buckets) AS bkt,
             monthly_income, attrition
      FROM hr_employees_v
      WHERE monthly_income IS NOT NULL
    ) s
    GROUP BY bkt
    ORDER BY bkt;
    """
    params = {"lo": lo, "hi": hi, "buckets": buckets}
    return run_query(sql, params, cache_key=f"attr_vs_min_income_{buckets}")

# Attrition by Job Satisfaction ===============================
@app.get("/api/line/attrition_by_job_satisfaction")
def attrition_by_job_satisfaction():
    sql = """
    SELECT job_satisfaction,
           COUNT(*) FILTER (WHERE attrition='Yes')::float / NULLIF(COUNT(*),0) AS attrition_rate
    FROM hr_employees_v
    WHERE job_satisfaction IS NOT NULL
    GROUP BY job_satisfaction
    ORDER BY job_satisfaction;
    """
    return run_query(sql, cache_key="attr_by_job_sat")
