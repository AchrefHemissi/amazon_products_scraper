# Amazon Products Scraper — README

A compact end-to-end repository that scrapes Amazon product data (CSV), ingests it into MongoDB, and exposes a FastAPI HTTP API with a small demo frontend. This README explains the architecture, how to run the system locally (including Docker for MongoDB), available endpoints, and troubleshooting tips.

Table of contents
- Overview
- Features
- Project layout
- Prerequisites
- Environment variables
- Quick start (recommended)
- Running components (MongoDB, ingest, API, frontend)
- API reference (examples)
- /best-deals scoring
- Indexes and performance
- Troubleshooting
- Next steps & improvements
- Legal & license

Overview
--------
This project demonstrates a pipeline:
1. Scrape Amazon (CSV) — fields: category, title, brand, price, original_price, discount_%, rating, reviews, product_link, image, availability.
2. Ingest CSV into MongoDB (upsert).
3. Serve product data via FastAPI:
   - Search/filter/sort/paginate products
   - Distinct lists for categories and brands
   - Ranked "best deals" endpoint
4. Minimal frontend (demo) and optional Next.js app in `frontend/`.

Features
--------
- Ingest script with CLI + dry-run
- FastAPI endpoints: /products, /products/{id}, /best-deals, /categories, /brands
- Defensive numeric coercion (API normalizes string/empty numeric values)
- Docker Compose for local MongoDB
- Helper to create recommended DB indexes
- Minimal SPA demo (served by API) and a Next.js frontend (optional)

Project layout
--------------
- api/ — FastAPI app (main.py, schemas.py)
- scraping/ — scraping logic and categories list
- scripts/
  - ingest.py — CSV -> MongoDB (CLI, --dry-run)
  - start_mongo.ps1 — helper to start docker compose on Windows
- frontend/ — demo/Next.js frontend(s)
- create_indexes.py — script to create DB indexes
- docker-compose.yml — MongoDB service
- requirements.txt — Python dependencies

Prerequisites
-------------
- Python 3.9+ (3.10+ recommended)
- pip
- Docker and Docker Compose (optional, recommended for local DB)
- Node 18+ (if you run the Next.js frontend)
- Recommended: create and use a Python virtual environment

Environment variables
---------------------
Create a `.env` in project root or set env vars in your shell for the app and scripts:

- MONGO_URI (default: mongodb://localhost:27017)
- MONGO_DB (default: amazon_scraper)
- PRODUCTS_COLLECTION (default: products)

Example .env (development):
```text
MONGO_URI=mongodb://root:example@localhost:27017/?authSource=admin
MONGO_DB=amazon_scraper
PRODUCTS_COLLECTION=products
```

Quick start (recommended)
-------------------------
1. Create & activate a venv, install Python deps:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Start MongoDB (Docker):
```powershell
# From project root
docker compose up -d
# or use helper
.\scripts\start_mongo.ps1
```

3. Ingest CSV (dry-run first):
```powershell
python scripts/ingest.py --csv scraping/amazon_products_all_categories.csv --dry-run
# then to write:
python scripts/ingest.py --csv scraping/amazon_products_all_categories.csv
```

4. Create recommended indexes:
```powershell
python create_indexes.py
```

5. Run the API:
```powershell
uvicorn api.main:app --reload --port 8000
```
Open: http://127.0.0.1:8000/docs (interactive OpenAPI docs)

6. Frontend:
- Minimal demo SPA is served by the FastAPI app (root `/`) if present.
- For Next.js frontend (optional), from `frontend/`:
```bash
# ensure Node >= 18
cd frontend
# use pnpm if lockfile present, otherwise npm
pnpm install
pnpm dev   # or npm install && npm run dev
```
Set `NEXT_PUBLIC_API_BASE` to `http://localhost:8000` in `.env.local` if needed.

Running components (details)
----------------------------
Start MongoDB (Docker Compose)
```powershell
docker compose up -d
docker ps --filter name=amazon_mongo
docker logs amazon_mongo --tail 50
```

Ingest CSV
- Dry-run prints row counts and sample categories:
```powershell
python scripts/ingest.py --csv scraping/amazon_products_all_categories.csv --dry-run
```
- Write to DB:
```powershell
python scripts/ingest.py --csv scraping/amazon_products_all_categories.csv
```
The ingest script uses bulk upserts (UpdateOne upsert) and attempts to coerce numeric types. You can pass a different path to `--csv`.

Create DB indexes
```powershell
python create_indexes.py
```
This script creates:
- Unique index on product_link (sparse)
- Indexes on category, brand, price, rating, discount_%
- Compound index for discount_% and rating

API reference
-------------
Base URL (dev): http://localhost:8000

GET /products
- Query params (all optional): 
  - category, brand, min_price, max_price, min_rating, min_discount
  - sort_by (price | rating | discount_%), sort_dir (asc | desc)
  - page (default 1), page_size (default 20)
- Response: PaginatedProducts { total, page, page_size, items[] }
- Example:
```bash
curl "http://localhost:8000/products?category=Electronics&min_price=20&min_rating=4&page=1&page_size=20"
```

GET /products/{id}
- id can be MongoDB ObjectId or product_link string
- Example:
```bash
curl http://localhost:8000/products/6543abcdef...
# or
curl "http://localhost:8000/products?product_link=https://..."
```

GET /categories
- Returns sorted list of unique categories:
```bash
curl http://localhost:8000/categories
```

GET /brands
- Returns sorted list of unique brands:
```bash
curl http://localhost:8000/brands
```

GET /best-deals
- Returns top products ranked by composite score of discount% and rating.
- Query params:
  - limit (default 20), min_rating (default 4.0)
  - weight_discount (0.0–1.0, default 0.7), weight_rating (0.0–1.0, default 0.3)
- Example:
```bash
curl "http://localhost:8000/best-deals?limit=10&weight_discount=0.6&weight_rating=0.4"
```

/best-deals scoring (how it works)
----------------------------------
Score = (discount_% / 100) * weight_discount + (rating / 5) * weight_rating

- The endpoint normalizes weights (so they sum to 1).
- Items with no or non-positive discount are excluded.
- Aggregation stages safely convert DB fields to numbers (use `$convert` with `onError`/`onNull`).
- Final sort by score, then rating, then reviews.

Indexes & performance
---------------------
- Recommended indexes created by `create_indexes.py`:
  - Unique on `product_link`
  - Indexes on `category`, `brand`, `price`, `rating`, `discount_%`
  - Compound index on (`discount_%` desc, `rating` desc) for best-deals queries
- Note: `count_documents` can be expensive on very large collections. Consider approximate/estimated counts or caching for highly trafficked endpoints.

Troubleshooting
---------------
- Failed to fetch from frontend:
  - Ensure FastAPI is running (uvicorn on port 8000) and API URL configured in frontend (NEXT_PUBLIC_API_BASE or `apiBase` prop).
  - If frontend runs on a different origin (e.g., Next.js `localhost:3000`), CORS is enabled by default for `http://localhost:3000` in dev. Add origins to `CORSMiddleware` in `api/main.py` if needed.
- Pydantic validation errors (numeric fields):
  - Caused by empty strings in numeric fields. The API coerces values on read; best fix is to normalize types at ingest time.
- Next.js dev server exit code 1:
  - Run `pnpm install` (or `npm install`) and use Node 18/20. Remove `.next` to clean cache if needed.
- MongoDB connection:
  - If using Docker, ensure `docker compose up -d` is running and `MONGO_URI` matches the dockerized credentials.

Next steps & improvements
-------------------------
- Normalize numeric types in ingestion (persist numbers in DB).
- Convert API to async with `motor` for non-blocking DB access.
- Add tests for API endpoints and scoring logic.
- Add an API service to `docker-compose.yml` so MongoDB + API run with one command.
- Improve frontend UX (faceted filters, infinite scroll, caching).

Legal & license
---------------
- This project is a demo. Scraping Amazon may violate their Terms of Service — use responsibly and respect robots.txt. For production use, prefer official APIs or licensed data.
- Add your preferred license file to the repo.

Contact / contributions
-----------------------
- Fork & open PRs for changes, or contact the maintainer for feature requests.
