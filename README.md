# CineScope 🎬
A minimal full-stack demo using **React (Vite)** + **FastAPI** + **PostgreSQL**.

- Frontend: Vercel
- Backend: Render (or Railway)
- Database: Supabase (or Neon)

---
## Initial Setup Instructions

### 1) Clone & Install
```bash
git clone https://github.com/yourusername/cinescope.git
cd cinescope
```

### 2) Database (Choose one)
**Option A: Run SQL directly**
1. Create a Postgres DB on Supabase or Neon.
2. Copy your connection string as `DATABASE_URL`.
3. Run `cinescope/backend/app/models.sql` in your DB SQL editor.

**Option B: Supabase CLI (recommended)**
```bash
export SUPABASE_ACCESS_TOKEN=your_token
export SUPABASE_PROJECT_REF=your_project_ref
export DATABASE_URL='postgresql://postgres:YOURPASSWORD@db.YOURREF.supabase.co:5432/postgres'
bash cinescope/scripts/supabase-setup.sh
```

### 3) Backend (FastAPI) — local
```bash
cd cinescope/backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r app/requirements.txt
export DATABASE_URL='postgresql://...'
uvicorn app.main:app --reload
```
Visit: http://127.0.0.1:8000/api/health

### 4) Frontend (React) — local
```bash
cd cinescope/frontend
npm install
echo "VITE_API_BASE=http://127.0.0.1:8000" > .env.local
npm run dev
```
Visit: http://127.0.0.1:5173

---
## Deploy (Free)
### Backend → Render
- Root: `backend/`
- Start command:
  ```
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- Env:
  ```
  DATABASE_URL=postgresql://...
  ```

### Frontend → Vercel
- Root: `frontend/`
- Env:
  ```
  VITE_API_BASE=https://your-backend.onrender.com
  ```

---
## Endpoints
- `GET /api/health`
- `GET /api/top-genres`

---
## Notes
- Tighten CORS in `backend/app/main.py` for production.
- Replace sample seed data with your own dataset.
