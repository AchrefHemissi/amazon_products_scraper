from fastapi import FastAPI, Query, HTTPException
from typing import Optional
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os
from api.schemas import Product, PaginatedProducts

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "amazon_scraper")
COLLECTION = os.getenv("PRODUCTS_COLLECTION", "products")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
col = db[COLLECTION]

app = FastAPI(title="Amazon Products API")

# Allow CORS from common frontend dev origins (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_filter(
    category: Optional[str],
    brand: Optional[str],
    min_price: Optional[float],
    max_price: Optional[float],
    min_rating: Optional[float],
    min_discount: Optional[float],
):
    f = {}
    if category:
        f["category"] = {"$regex": f"^{category}$", "$options": "i"}
    if brand:
        f["brand"] = {"$regex": brand, "$options": "i"}
    if min_price is not None or max_price is not None:
        price_q = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        f["price"] = price_q
    if min_rating is not None:
        f["rating"] = {"$gte": min_rating}
    if min_discount is not None:
        f["discount_%"] = {"$gte": min_discount}
    return f


def _to_float(v):
    """Coerce a value to float or return None for empty/invalid inputs."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if s == "":
        return None
    try:
        return float(s)
    except Exception:
        return None


def _to_int(v):
    """Coerce a value to int (via float) or return None for empty/invalid inputs."""
    f = _to_float(v)
    if f is None:
        return None
    try:
        return int(f)
    except Exception:
        return None


@app.get("/products", response_model=PaginatedProducts)
def list_products(
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    min_discount: Optional[float] = Query(None),
    sort_by: Optional[str] = Query("rating"),
    sort_dir: Optional[str] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    filt = build_filter(category, brand, min_price, max_price, min_rating, min_discount)

    # determine sort
    sort_field = sort_by if sort_by in ("price", "rating", "discount_%") else "rating"
    direction = -1 if sort_dir == "desc" else 1

    total = col.count_documents(filt)
    skip = (page - 1) * page_size
    cursor = col.find(filt).sort(sort_field, direction).skip(skip).limit(page_size)

    items = []
    for d in cursor:
        items.append({
            "id": str(d.get("_id")),
            "category": d.get("category"),
            "title": d.get("title"),
            "brand": d.get("brand"),
            "price": _to_float(d.get("price")),
            "original_price": _to_float(d.get("original_price")),
            "discount_%": _to_float(d.get("discount_%")),
            "rating": _to_float(d.get("rating")),
            "reviews": _to_int(d.get("reviews")),
            "product_link": d.get("product_link"),
            "image": d.get("image"),
            "availability": d.get("availability"),
        })

    return PaginatedProducts(total=total, page=page, page_size=page_size, items=items)


@app.get("/products/{product_id}", response_model=Product)
def get_product(product_id: str):
    doc = None
    # try ObjectId
    try:
        doc = col.find_one({"_id": ObjectId(product_id)})
    except Exception:
        doc = col.find_one({"product_link": product_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    item = {
        "id": str(doc.get("_id")),
        "category": doc.get("category"),
        "title": doc.get("title"),
        "brand": doc.get("brand"),
        "price": _to_float(doc.get("price")),
        "original_price": _to_float(doc.get("original_price")),
        "discount_%": _to_float(doc.get("discount_%")),
        "rating": _to_float(doc.get("rating")),
        "reviews": _to_int(doc.get("reviews")),
        "product_link": doc.get("product_link"),
        "image": doc.get("image"),
        "availability": doc.get("availability"),
    }
    return Product.parse_obj(item)


@app.get("/best-deals", response_model=list[Product])
def best_deals(
    limit: int = Query(20, ge=1, le=200),
    min_rating: float = Query(4.0),
    weight_discount: float = Query(0.7, ge=0.0, le=1.0),
    weight_rating: float = Query(0.3, ge=0.0, le=1.0),
):
    """Return top deals ranked by a composite score combining discount% and rating.

    The endpoint computes a normalized score per document in MongoDB using an aggregation pipeline.
    Score = (discount_% / 100) * weight_discount + (rating / 5) * weight_rating
    Documents are filtered to require a positive discount and at least `min_rating`.
    We use `$convert` with `onError`/`onNull` fallbacks so non-numeric DB values don't break the pipeline.
    """
    # normalize weights so they sum to 1 (avoid degenerate inputs)
    total_w = weight_discount + weight_rating
    if total_w <= 0:
        weight_discount, weight_rating = 0.7, 0.3
    else:
        weight_discount = weight_discount / total_w
        weight_rating = weight_rating / total_w

    # Aggregation pipeline computes numeric fields safely, computes score, sorts and limits
    pipeline = [
        {
            "$addFields": {
                "discount_num": {
                    "$convert": {"input": "$discount_%", "to": "double", "onError": 0, "onNull": 0}
                },
                "rating_num": {"$convert": {"input": "$rating", "to": "double", "onError": 0, "onNull": 0}},
                "reviews_num": {"$convert": {"input": "$reviews", "to": "long", "onError": 0, "onNull": 0}},
            }
        },
        {"$match": {"discount_num": {"$gt": 0}, "rating_num": {"$gte": min_rating}}},
        {
            "$addFields": {
                "score": {
                    "$add": [
                        {"$multiply": [{"$divide": ["$discount_num", 100]}, weight_discount]},
                        {"$multiply": [{"$divide": ["$rating_num", 5]}, weight_rating]},
                    ]
                }
            }
        },
        {"$sort": {"score": -1, "rating_num": -1, "reviews_num": -1}},
        {"$limit": limit},
    ]

    cursor = col.aggregate(pipeline)
    items = []
    for d in cursor:
        items.append({
            "id": str(d.get("_id")),
            "category": d.get("category"),
            "title": d.get("title"),
            "brand": d.get("brand"),
            "price": _to_float(d.get("price")),
            "original_price": _to_float(d.get("original_price")),
            "discount_%": _to_float(d.get("discount_%")),
            "rating": _to_float(d.get("rating")),
            "reviews": _to_int(d.get("reviews")),
            "product_link": d.get("product_link"),
            "image": d.get("image"),
            "availability": d.get("availability"),
        })

    return [Product.parse_obj(it) for it in items]


@app.get("/categories", response_model=list[str])
def list_categories():
    """Return the list of unique categories present in the database (sorted)."""
    try:
        cats = col.distinct("category") or []
        # filter out falsy values and sort
        cats = sorted([c for c in cats if c])
        return cats
    except Exception:
        # On error, return empty list
        return []


@app.get("/brands", response_model=list[str])
def list_brands():
    """Return the list of unique brands present in the database (sorted)."""
    try:
        brands = col.distinct("brand") or []
        brands = sorted([b for b in brands if b])
        return brands
    except Exception:
        return []
