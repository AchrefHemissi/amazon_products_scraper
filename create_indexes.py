"""
create_indexes.py
Create recommended indexes on the MongoDB collection used by the app.
Run once after you've ingested data.
"""
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "amazon_scraper")
COLLECTION = os.getenv("PRODUCTS_COLLECTION", "products")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
col = db[COLLECTION]

print("Creating indexes (may take a while on large collections)...")
# Unique on product_link when present
col.create_index([("product_link", ASCENDING)], unique=True, sparse=True)
# Useful single-field indexes
col.create_index([("category", ASCENDING)])
col.create_index([("brand", ASCENDING)])
col.create_index([("price", ASCENDING)])
col.create_index([("rating", DESCENDING)])
col.create_index([("discount_%", DESCENDING)])
# Compound for best-deals queries
col.create_index([("discount_%", DESCENDING), ("rating", DESCENDING)])

print("Indexes created.")
