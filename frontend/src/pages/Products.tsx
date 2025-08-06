import React from 'react'
import { Search, Filter, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { walletSelectors } from '@/stores/walletStore'

export function ProductsPage() {
  const isConnected = walletSelectors.useIsConnected()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Discover and buy products from the community</p>
        </div>
        
        {isConnected && (
          <Link to="/create-product">
            <Button className="flex items-center gap-2">
              <Plus size={20} />
              List Product
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Filter size={20} />
          Filters
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          >
            {category}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Placeholder for when we implement real products */}
        <EmptyState />
      </div>
    </div>
  )
}

// Categories
const categories = [
  'All',
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Books',
  'Art & Collectibles',
  'Sports',
  'Other'
]

// Empty State Component
function EmptyState() {
  const isConnected = walletSelectors.useIsConnected()

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-gray-400" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No products found
      </h3>
      
      <p className="text-gray-600 text-center mb-6 max-w-md">
        {isConnected 
          ? "Be the first to list a product on the marketplace!"
          : "Connect your wallet to see products and start trading."
        }
      </p>

      {isConnected && (
        <Link to="/create-product">
          <Button>
            List First Product
          </Button>
        </Link>
      )}
    </div>
  )
}
