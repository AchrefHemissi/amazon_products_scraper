from pydantic import BaseModel, Field
from typing import Optional, List


class Product(BaseModel):
    id: str
    category: Optional[str]
    title: Optional[str]
    brand: Optional[str]
    price: Optional[float]
    original_price: Optional[float]
    discount_pct: Optional[float] = Field(None, alias="discount_%")
    rating: Optional[float]
    reviews: Optional[int]
    product_link: Optional[str]
    image: Optional[str]
    availability: Optional[str]

    class Config:
        allow_population_by_field_name = True


class PaginatedProducts(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Product]
