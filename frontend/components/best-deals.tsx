"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { Star, Percent, TrendingDown } from "lucide-react"
import type { Product } from "@/types/Product" // Assuming Product type is declared in a separate file

export default function BestDeals({ apiBase }: { apiBase: string }) {
  const [deals, setDeals] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState("20")
  const [minRating, setMinRating] = useState("4")

  useEffect(() => {
    fetchBestDeals()
  }, [limit, minRating])

  const fetchBestDeals = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", limit)
      params.append("min_rating", minRating)

      const response = await fetch(`${apiBase}/best-deals?${params}`)
      const data = await response.json()
      setDeals(data)
    } catch (error) {
      console.error("Failed to fetch best deals:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Best Deals</h2>
        </div>

        <div className="flex gap-4">
          <div className="w-32">
            <label className="text-sm font-medium">Min Rating</label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="4.5">4.5 Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <label className="text-sm font-medium">Show</label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 Deals</SelectItem>
                <SelectItem value="20">20 Deals</SelectItem>
                <SelectItem value="50">50 Deals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">Loading best deals...</div>}

      {!loading && deals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No deals found matching your criteria.</div>
      )}

      {!loading && deals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {deals.map((product) => (
            <BestDealCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

function BestDealCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Image Container */}
        <div className="relative w-full h-40 bg-muted overflow-hidden">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.currentTarget.src = "/diverse-products-still-life.png"
            }}
          />

          {/* Discount Badge */}
          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-lg">
            <Percent className="w-4 h-4" />
            {Math.round(product.discount_percent)}%
          </div>

          {/* Stock Status */}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
            {product.availability}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col">
          <p className="text-xs text-muted-foreground font-medium mb-1">{product.brand}</p>
          <h3 className="font-semibold text-sm line-clamp-2 mb-2">{product.title}</h3>

          <div className="flex-1" />

          {/* Price and Rating */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary">${product.price?.toFixed(2)}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ${product.original_price?.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-sm font-semibold">{product.rating?.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({product.reviews})</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
