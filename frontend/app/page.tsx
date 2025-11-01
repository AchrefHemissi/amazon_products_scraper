"use client"

import { useState } from "react"
import ProductGrid from "@/components/product-grid"
import BestDeals from "@/components/best-deals"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function Home() {
  const [activeTab, setActiveTab] = useState("browse")

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold">Product Marketplace</h1>
          <p className="text-sm opacity-90 mt-1">Browse and filter products with ease</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="browse">Browse Products</TabsTrigger>
            <TabsTrigger value="deals">Best Deals</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            <ProductGrid apiBase={API_BASE} />
          </TabsContent>

          <TabsContent value="deals" className="mt-6">
            <BestDeals apiBase={API_BASE} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
