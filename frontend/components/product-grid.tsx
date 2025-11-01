"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ProductFilters from "./product-filters"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Star, Percent } from "lucide-react"
import type { Product } from "@/types/product" // Import Product type

interface PaginatedResponse {
  total: number
  page: number
  page_size: number
  items: Product[]
}

export default function ProductGrid({ apiBase }: { apiBase: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // Filter state
  const [filters, setFilters] = useState({
    category: "",
    brand: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
    minDiscount: "",
    sortBy: "rating",
    sortDir: "desc",
  })

  // Fetch products
  useEffect(() => {
    fetchProducts()
  }, [filters, page])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.category) params.append("category", filters.category)
      if (filters.brand) params.append("brand", filters.brand)
      if (filters.minPrice) params.append("min_price", filters.minPrice)
      if (filters.maxPrice) params.append("max_price", filters.maxPrice)
      if (filters.minRating) params.append("min_rating", filters.minRating)
      if (filters.minDiscount) params.append("min_discount", filters.minDiscount)
      params.append("sort_by", filters.sortBy)
      params.append("sort_dir", filters.sortDir)
      params.append("page", page.toString())
      params.append("page_size", pageSize.toString())

      const response = await fetch(`${apiBase}/products?${params}`)
      const data: PaginatedResponse = await response.json()
      setProducts(data.items)
      setTotal(data.total)
      setPage(data.page)
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <ProductFilters onFilterChange={handleFilterChange} filters={filters} apiBase={apiBase} />
      </div>

      {/* Products Grid */}
      <div className="lg:col-span-3">
        {loading && <div className="text-center py-12 text-muted-foreground">Loading products...</div>}

        {!loading && products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No products found. Try adjusting your filters.</div>
        )}

        {!loading && products.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} products
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        {product.image && (
          <div className="relative w-full h-48 bg-muted">
            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.title}
              fill
              className="object-cover"
              onError={(e) => {
                e.currentTarget.src = "/diverse-products-still-life.png"
              }}
            />
            {product.discount &&
              product.discount > 0 && ( // Fix discount check
                <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  {Math.round(product.discount)}%
                </div>
              )}
          </div>
        )}

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
            <h3 className="font-semibold text-sm line-clamp-2 mb-2">{product.title}</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">${product.price?.toFixed(2)}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.original_price?.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-sm font-semibold">{product.rating?.toFixed(1)}</span>
              </div>
              <span className="text-xs text-muted-foreground">({product.reviews} reviews)</span>
            </div>

            <p className="text-xs text-muted-foreground">{product.availability}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
