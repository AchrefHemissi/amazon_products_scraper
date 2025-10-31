import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
from urllib.parse import quote_plus
from data.categories import categories

def parse_money(text):
    if not text:
        return None
    t = text.strip().replace("$", "").replace(",", "")
    try:
        return float(t)
    except:
        # try to extract numeric with regex
        m = re.search(r"[\d,.]+", text)
        return float(m.group(0).replace(",", "")) if m else None

def parse_rating(text):
    if not text:
        return None
    m = re.search(r"([\d.]+)", text)
    return float(m.group(1)) if m else None

def clean_reviews_count(text):
    if not text:
        return None
    t = text.strip()
    t = t.strip("()")
    if "K" in t or "k" in t:
        m = re.search(r"([\d.,]+)\s*[Kk]", t)
        if m:
            return int(float(m.group(1).replace(",", "")) * 1000)
    m = re.search(r"[\d,]+", t)
    return int(m.group(0).replace(",", "")) if m else None

def get_html(url, headers):
    r = requests.get(url, headers=headers, timeout=15)
    if r.status_code != 200:
        raise RuntimeError(f"Request failed: {r.status_code}")
    return r.text

def parse_products(html, category):
    soup = BeautifulSoup(html, "html.parser")
    results = []

    # iterate product blocks using data-cy attribute container
    for product in soup.select('[data-cy="asin-faceout-container"]'):
        # title
        title_el = product.select_one('[data-cy="title-recipe"] h2 span')
        title = title_el.get_text(strip=True) if title_el else None

        # brand (try to get from title, else None)
        brand = None
        if title:
            parts = title.split()
            brand = parts[0] if parts else None

        # image
        img_el = product.select_one('[data-cy="image-container"] img.s-image')
        image = img_el.get("src") if img_el else None

        # product link (relative)
        link_el = product.select_one('[data-cy="title-recipe"] a.a-link-normal')
        link = "https://www.amazon.com" + link_el.get("href") if link_el and link_el.get("href") else None

        # price and original price
        price_offscreen = product.select_one('[data-cy="price-recipe"] .a-offscreen')
        price = parse_money(price_offscreen.get_text(strip=True)) if price_offscreen else None

        original_offscreen = product.select_one('[data-cy="price-recipe"] .a-text-price .a-offscreen')
        original_price = parse_money(original_offscreen.get_text(strip=True)) if original_offscreen else None

        # discount percentage
        discount_pct = None
        if price and original_price and original_price > price:
            discount_pct = round((original_price - price) / original_price * 100, 2)

        # rating: look for any element with data-cy="reviews-ratings-slot" then find .a-icon-alt or .a-icon-alt text
        rating = None
        rating_container = product.select_one('[data-cy="reviews-ratings-slot"]')
        if rating_container:
            # the visible rating text is usually in a child span.a-icon-alt
            alt = rating_container.select_one('.a-icon-alt')
            if alt and alt.get_text(strip=True):
                rating = parse_rating(alt.get_text())
            else:
                # fallback to container text
                rating = parse_rating(rating_container.get_text(strip=True))
        else:
            # other fallback selectors
            alt2 = product.select_one('.a-icon-alt')
            if alt2:
                rating = parse_rating(alt2.get_text(strip=True))

        # reviews count
        reviews_el = product.select_one('[data-cy="reviews-block"] .a-size-mini')
        reviews = clean_reviews_count(reviews_el.get_text(strip=True)) if reviews_el else None

        # availability / delivery
        availability_el = product.select_one('[data-cy="delivery-recipe"]')
        availability = availability_el.get_text(" ", strip=True) if availability_el else None

        results.append({
            "category": category,
            "title": title,
            "brand": brand,
            "price": price,
            "original_price": original_price,
            "discount_%": discount_pct,
            "rating": rating,
            "reviews": reviews,
            "product_link": link,
            "image": image,
            "availability": availability
        })

    return results

def scrape_amazon(search_query, pages=1):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }

    all_results = []
    for page in range(1, pages + 1):
        # use params via URL encoding
        q = quote_plus(search_query)
        url = f"https://www.amazon.com/s?k={q}&page={page}"
        html = get_html(url, headers)
        data = parse_products(html, search_query.replace("+", " "))
        all_results.extend(data)
        time.sleep(2)

    return all_results

if __name__ == "__main__":
    all_data = []
    for cat in categories:
        print(f"Scraping category: {cat['name']}")
        data = scrape_amazon(cat['name'], pages=1)  # or multiple pages
        # add category info explicitly if needed
        for item in data:
            item['category'] = cat['name']
        all_data.extend(data)
        time.sleep(2)  # polite delay between categories

    df = pd.DataFrame(all_data)
    df.to_csv("amazon_products_all_categories.csv", index=False)
    print("Saved", len(df), "rows to amazon_products_all_categories.csv")
