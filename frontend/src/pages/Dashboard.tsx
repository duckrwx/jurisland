import React from 'react'
import { WalletGuard } from '@/components/web3/ConnectWallet'
import { walletSelectors } from '@/stores/walletStore'

export function DashboardPage() {
  const address = walletSelectors.useAddress()
  const formattedBalance = walletSelectors.useFormattedBalance()

  return (
    <WalletGuard>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Overview of your marketplace activity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <StatsCard
            title="Wallet Balance"
            value={`${formattedBalance} ETH`}
            description="Current balance"
          />
          
          <StatsCard
            title="Products Listed"
            value="0"
            description="Active listings"
          />
          
          <StatsCard
            title="Purchases Made"
            value="0"
            description="Completed orders"
          />

          <StatsCard
            title="Reputation Score"
            value="10"
            description="Seller reputation"
          />

          <StatsCard
            title="Active Disputes"
            value="0"
            description="Ongoing cases"
          />

          <StatsCard
            title="Jury Participations"
            value="0"
            description="Votes cast"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <p>🚧 Activity feed will show:</p>
            <ul className="list-disc list-inside space-y-1 mt-4 text-sm">
              <li>Recent purchases and sales</li>
              <li>Reputation changes</li>
              <li>Dispute notifications</li>
              <li>Jury invitations</li>
            </ul>
          </div>
        </div>
      </div>
    </WalletGuard>
  )
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  description 
}: { 
  title: string
  value: string
  description: string 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}
