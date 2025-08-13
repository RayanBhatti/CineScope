# CineScope

CineScope is a full-stack, data-driven analytics application built using **React**, **FastAPI**, and **PostgreSQL**. It is designed to provide an interactive and visually engaging platform for exploring and analyzing datasets, offering a variety of charts and visualizations to help uncover patterns, trends, and relationships in the data. This app is designed to be viewed on a desktop computer and is not compatible with mobile viewports.

## [Live Demo →](https://cine-scope-azure.vercel.app/)

<img width="2529" height="1216" alt="image" src="https://github.com/user-attachments/assets/29bc95e7-56fc-4ae0-9ea2-54496ce2cc77" />


## About the Dataset

Uncover the factors that lead to employee attrition and explore important questions such as ‘show me a breakdown of distance from home by job role and attrition’ or ‘compare average monthly income by education and attrition’. This is a fictional data set created by IBM data scientists.

---

## Features

- **Full-Stack Architecture**:
  - **Frontend**: React (with Vite for bundling and development speed).
  - **Backend**: FastAPI serving RESTful API endpoints.
  - **Database**: PostgreSQL hosted on Neon for persistent data storage.
- **Data Visualization**:
  - Multiple chart types including bar charts, pie charts, scatter plots, histograms, and line graphs.
- **Dynamic API Integration**:
  - Backend endpoints provide aggregated and filtered dataset results.
  - Frontend consumes API data for live visual updates.
- **Responsive UI**:
  - Designed for usability on desktop and tablet
- **Deployment**:
  - Frontend deployed on Vercel.
  - Backend deployed on Render.
  - CORS support for cross-origin API calls.

---

## Tech Stack

### Frontend
- **React**: A JavaScript library for building dynamic and responsive user interfaces.
- **Vite**: Fast build tool and development server with hot module replacement.
- **Charting Libraries**: Used to generate multiple interactive and visually appealing charts.
- **Axios/Fetch**: For API requests to the backend.

### Backend
- **FastAPI**: High-performance Python framework for serving APIs.
- **SQLAlchemy**: ORM and query builder for database interaction.
- **PostgreSQL**: Relational database for storing structured datasets.
- **Neon**: Cloud-based PostgreSQL hosting with easy scaling.

### Deployment
- **Vercel**: Hosts the React frontend, offering automatic builds from GitHub.
- **Render**: Hosts the FastAPI backend and connects to the Neon PostgreSQL database.

---

## How It Works

1. **Data Storage**:
   - The PostgreSQL database contains the dataset to be analyzed. This can be any structured dataset, such as HR attrition records or movie genre statistics.
   - Tables are optimized for queries by the FastAPI backend.

2. **Backend Processing**:
   - FastAPI endpoints are created to query and aggregate the data concurrently.
   - Example: `/api/attrition/summary` aggregates data on employee attrition rates, while `/api/distribution/age` groups employee ages into buckets.
   - SQLAlchemy is used to build and execute queries securely with parameter binding.
   - API responses are returned in JSON format for the frontend.

3. **Frontend Rendering**:
   - The React frontend fetches data from the backend using environment variables (e.g., `VITE_API_BASE` to configure API URL).
   - Data is fed into charting components, which render multiple interactive visualizations.
   - The dashboard allows users to explore relationships, filter by criteria, and compare trends across datasets.

4. **Deployment Workflow**:
   - On pushing to the GitHub repository, Vercel automatically builds and deploys the frontend.
   - Render deploys the backend on commit or manual trigger.
   - The frontend fetches live data from the deployed backend using CORS-enabled endpoints.

---

## Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/RayanBhatti/CineScope.git
   cd CineScope
   ```

2. **Set up the backend**:
   ```bash
   cd backend
   pip install -r app/requirements.txt
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

3. **Set up the frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Environment Variables**:
   - `DATABASE_URL`: PostgreSQL connection string.
   - `VITE_API_BASE`: URL of the backend (e.g., http://127.0.0.1:8000 for local).

---

## Future Enhancements

- Add more dataset filters for targeted analysis.
- Introduce advanced analytics using statistical models or machine learning.
- Expand chart types to include heatmaps, treemaps, and time-series forecasting.
- Improve styling with a cohesive theme and accessibility enhancements.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
