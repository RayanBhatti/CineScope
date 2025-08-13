-- HR Attrition schema (IBM sample dataset)

DROP TABLE IF EXISTS hr_employees;

CREATE TABLE hr_employees (
  "Age" INT,
  "Attrition" TEXT,
  "BusinessTravel" TEXT,
  "DailyRate" INT,
  "Department" TEXT,
  "DistanceFromHome" INT,
  "Education" INT,
  "EducationField" TEXT,
  "EmployeeCount" INT,
  "EmployeeNumber" INT,
  "EnvironmentSatisfaction" INT,
  "Gender" TEXT,
  "HourlyRate" INT,
  "JobInvolvement" INT,
  "JobLevel" INT,
  "JobRole" TEXT,
  "JobSatisfaction" INT,
  "MaritalStatus" TEXT,
  "MonthlyIncome" INT,
  "MonthlyRate" INT,
  "NumCompaniesWorked" INT,
  "Over18" TEXT,
  "OverTime" TEXT,
  "PercentSalaryHike" INT,
  "PerformanceRating" INT,
  "RelationshipSatisfaction" INT,
  "StandardHours" INT,
  "StockOptionLevel" INT,
  "TotalWorkingYears" INT,
  "TrainingTimesLastYear" INT,
  "WorkLifeBalance" INT,
  "YearsAtCompany" INT,
  "YearsInCurrentRole" INT,
  "YearsSinceLastPromotion" INT,
  "YearsWithCurrManager" INT
);

-- Helpful indexes for analytics
CREATE INDEX IF NOT EXISTS idx_hr_attrition          ON hr_employees ("Attrition");
CREATE INDEX IF NOT EXISTS idx_hr_department         ON hr_employees ("Department");
CREATE INDEX IF NOT EXISTS idx_hr_jobrole            ON hr_employees ("JobRole");
CREATE INDEX IF NOT EXISTS idx_hr_overtime           ON hr_employees ("OverTime");
CREATE INDEX IF NOT EXISTS idx_hr_gender             ON hr_employees ("Gender");
CREATE INDEX IF NOT EXISTS idx_hr_age                ON hr_employees ("Age");
CREATE INDEX IF NOT EXISTS idx_hr_yearsatcompany     ON hr_employees ("YearsAtCompany");
CREATE INDEX IF NOT EXISTS idx_hr_monthlyincome      ON hr_employees ("MonthlyIncome");
