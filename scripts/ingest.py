# scripts/ingest.py
import os
import csv
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "amazon_scraper")
COLLECTION = os.getenv("PRODUCTS_COLLECTION", "products")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
col = db[COLLECTION]

def ingest_csv(csv_path):
    ops = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # normalize numeric fields
            for k in ("price","original_price","discount_%","rating","reviews"):
                if row.get(k):
                    try:
                        row[k] = float(row[k]) if k != "reviews" else int(float(row[k]))
                    except:
                        row[k] = None
            # use product_link as unique key
            key = {"product_link": row.get("product_link")} if row.get("product_link") else {"title": row.get("title")}
            ops.append(UpdateOne(key, {"$set": row}, upsert=True))
            if len(ops) >= 500:
                col.bulk_write(ops)
                ops = []
    if ops:
        col.bulk_write(ops)
    print("Ingest complete.")

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description="Ingest a CSV of Amazon products into MongoDB")
    parser.add_argument("csv_path", nargs="?", help="Path to CSV file (default: scraping/amazon_products_all_categories.csv)")
    parser.add_argument("--dry-run", action="store_true", help="Parse the CSV and print a summary without writing to MongoDB")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    # Default CSV location (sibling folder 'scraping')
    default_csv = script_dir.parent / "amazon_products_all_categories.csv"

    csv_path = Path(args.csv_path) if args.csv_path else default_csv

    if not csv_path.exists():
        print(f"CSV file not found: {csv_path}")
        raise SystemExit(1)

    if args.dry_run:
        # Quick summary: row count and top categories
        from collections import Counter
        cnt = 0
        cats = Counter()
        with csv_path.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cnt += 1
                cat = row.get("category") or row.get("Category")
                if cat:
                    cats.update([cat.strip()])
        print(f"Rows: {cnt}")
        print("Top categories:")
        for c, n in cats.most_common(20):
            print(f"  {c}: {n}")
    else:
        ingest_csv(csv_path)
