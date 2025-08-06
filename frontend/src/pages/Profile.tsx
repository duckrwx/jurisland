import React from 'react'
import { WalletGuard } from '@/components/web3/ConnectWallet'
import { walletSelectors } from '@/stores/walletStore'

export function ProfilePage() {
  const displayName = walletSelectors.useDisplayName()

  return (
    <WalletGuard>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            User Profile
          </h1>
          <p className="text-gray-600 mb-4">
            Welcome, {displayName}
          </p>
          
          <div className="space-y-4 text-sm text-gray-500">
            <p>🚧 This page will show:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>User reputation scores (buyer, seller, creator)</li>
              <li>Persona information and preferences</li>
              <li>Transaction history</li>
              <li>Active listings and purchases</li>
              <li>Reputation badges and achievements</li>
            </ul>
          </div>
        </div>
      </div>
    </WalletGuard>
  )
}
