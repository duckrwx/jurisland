// src/pages/Products/CreateProduct.tsx  
import React from 'react'
import { WalletGuard } from '@/components/web3/ConnectWallet'

export function CreateProductPage() {
  return (
    <WalletGuard>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Create New Product
          </h1>
          <p className="text-gray-600 mb-6">
            List your product on the decentralized marketplace
          </p>
          
          <div className="space-y-4 text-sm text-gray-500">
            <p>🚧 This page will include:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Product information form</li>
              <li>Image upload to CESS network</li>
              <li>Price and commission settings</li>
              <li>Smart contract interaction</li>
              <li>Transaction confirmation</li>
            </ul>
          </div>
        </div>
      </div>
    </WalletGuard>
  )
}
