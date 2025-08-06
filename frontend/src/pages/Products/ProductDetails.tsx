// src/pages/Products/ProductDetails.tsx
import React from 'react'
import { useParams } from 'react-router-dom'

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Product Details
        </h1>
        <p className="text-gray-600 mb-4">
          Product ID: {id}
        </p>
        <p className="text-sm text-gray-500">
          🚧 This page will show detailed product information, images, seller details, and purchase options.
        </p>
      </div>
    </div>
  )
}
