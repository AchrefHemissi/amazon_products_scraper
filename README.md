# amazon_products_scraper

This project scrapes Amazon product data (category, title, brand, price, original_price, discount_%, rating, reviews, product_link, image, availability), ingests results into MongoDB, and exposes a query API via FastAPI.

Quick start

1) Create and activate a virtual environment (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Configure environment variables (create a `.env` file in the project root):

```
MONGO_URI=mongodb://localhost:27017
MONGO_DB=amazon_scraper
PRODUCTS_COLLECTION=products
```

3) Run the scraper to produce `amazon_products_all_categories.csv` (existing script):

```powershell
python scraping/scraping.py
```

4) Ingest CSV into MongoDB (or run dry-run to validate):

```powershell
python scripts/ingest.py --dry-run
python scripts/ingest.py scraping/amazon_products_all_categories.csv
```

5) Create recommended indexes:

```powershell
python create_indexes.py
```

6) Run the API (FastAPI + Uvicorn):

```powershell
uvicorn api.main:app --reload --port 8000
```

Open http://127.0.0.1:8000/docs for interactive docs.

Run MongoDB with Docker
----------------------

You can run a local MongoDB instance using Docker Compose. A `docker-compose.yml` is included.

1) Create (or edit) `.env.docker` in the project root to set the root user and password (a template is provided):

```
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=example
MONGO_INITDB_DATABASE=amazon_scraper
```

2) Start MongoDB:

```powershell
docker compose up -d
# or use the helper script
.
\.\scripts\start_mongo.ps1
```

3) After the container is running, use this URI in your `.env` or environment variables so the app connects to the dockerized DB:

```
MONGO_URI=mongodb://root:example@localhost:27017/?authSource=admin
```

4) Then run the ingest script to store CSV data into that MongoDB:

```powershell
python scripts/ingest.py scraping/amazon_products_all_categories.csv
```

5) Verify with mongosh or via the Python snippet:

```powershell
mongosh "mongodb://root:example@localhost:27017/"
# or
python - <<'PY'
from pymongo import MongoClient
c = MongoClient("mongodb://root:example@localhost:27017/?authSource=admin")
print(c.list_database_names())
PY
```

Notes
- Scraping Amazon may violate their terms; respect robots.txt and throttle requests.
- The ingestion script uses `product_link` as the unique key (fallback to `title` when missing).
- If you prefer PostgreSQL, I can add a SQLAlchemy-based alternative.
