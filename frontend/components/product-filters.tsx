"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FilterProps {
  onFilterChange: (filters: any) => void
  filters: {
    category: string
    brand: string
    minPrice: string
    maxPrice: string
    minRating: string
    minDiscount: string
    sortBy: string
    sortDir: string
  }
  apiBase: string
}

export default function ProductFilters({ onFilterChange, filters, apiBase }: FilterProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [localFilters, setLocalFilters] = useState(filters)

  useEffect(() => {
    fetchCategoriesAndBrands()
  }, [])

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const fetchCategoriesAndBrands = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([fetch(`${apiBase}/categories`), fetch(`${apiBase}/brands`)])

      const categoriesData = await categoriesRes.json()
      const brandsData = await brandsRes.json()

      setCategories(categoriesData)
      setBrands(brandsData) // Limit to first 20 brands
    } catch (error) {
      console.error("Failed to fetch categories/brands:", error)
    }
  }

  const handleChange = (key: string, value: string) => {
    const updated = { ...localFilters, [key]: value }
    setLocalFilters(updated)
  }

  const handleApply = () => {
    onFilterChange(localFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      category: "",
      brand: "",
      minPrice: "",
      maxPrice: "",
      minRating: "",
      minDiscount: "",
      sortBy: "rating",
      sortDir: "desc",
    }
    setLocalFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={localFilters.category} onValueChange={(value) => handleChange("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <Label>Brand</Label>
          <Select value={localFilters.brand} onValueChange={(value) => handleChange("brand", value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label>Price Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={localFilters.minPrice}
              onChange={(e) => handleChange("minPrice", e.target.value)}
            />
            <Input
              type="number"
              placeholder="Max"
              value={localFilters.maxPrice}
              onChange={(e) => handleChange("maxPrice", e.target.value)}
            />
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <Label>Minimum Rating</Label>
          <Select value={localFilters.minRating} onValueChange={(value) => handleChange("minRating", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Rating</SelectItem>
              <SelectItem value="2">★ 2 and above</SelectItem>
              <SelectItem value="3">★ 3 and above</SelectItem>
              <SelectItem value="4">★ 4 and above</SelectItem>
              <SelectItem value="4.5">★ 4.5 and above</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Discount */}
        <div className="space-y-2">
          <Label>Minimum Discount</Label>
          <Input
            type="number"
            placeholder="Min discount %"
            value={localFilters.minDiscount}
            onChange={(e) => handleChange("minDiscount", e.target.value)}
          />
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select value={localFilters.sortBy} onValueChange={(value) => handleChange("sortBy", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="discount_%">Discount</SelectItem>
              </SelectContent>
            </Select>
            <Select value={localFilters.sortDir} onValueChange={(value) => handleChange("sortDir", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">High to Low</SelectItem>
                <SelectItem value="asc">Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-4 border-t">
          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
          <Button onClick={handleReset} variant="outline" className="w-full bg-transparent">
            Reset All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
