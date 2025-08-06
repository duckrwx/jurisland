import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { wagmiConfig } from '@/services/web3/config'
import { ENV } from '@/constants'

// Layout
import { AppLayout } from '@/components/layout/AppLayout'

// Pages (placeholder imports)
import { HomePage } from '@/pages/Home'
import { ProductsPage } from '@/pages/Products'
import { ProductDetailsPage } from '@/pages/Products/ProductDetails'
import { CreateProductPage } from '@/pages/Products/CreateProduct'
import { ProfilePage } from '@/pages/Profile'
import { DashboardPage } from '@/pages/Dashboard'

// Error Boundary
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <Router>
            <AppRoutes />
          </Router>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          {/* React Query DevTools */}
          {ENV.DEBUG && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  )
}

// App Routes Component
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Public Routes */}
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailsPage />} />
        
        {/* Protected Routes (require wallet connection) */}
        <Route path="create-product" element={<CreateProductPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Catch all route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

// 404 Page
function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mt-4">Page Not Found</h2>
        <p className="text-gray-600 mt-2">
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}

export default App
