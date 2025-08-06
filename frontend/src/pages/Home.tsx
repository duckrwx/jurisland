import React from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, Gavel, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { walletSelectors } from '@/stores/walletStore'

export function HomePage() {
  const isConnected = walletSelectors.useIsConnected()
  const displayName = walletSelectors.useDisplayName()

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Decentralized Marketplace
            <span className="text-primary-600 block">with Reputation System</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Buy and sell with confidence using our blockchain-based reputation system 
            and decentralized jury resolution for disputes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products">
              <Button size="lg" className="min-w-[160px]">
                Browse Products
              </Button>
            </Link>
            
            {isConnected ? (
              <Link to="/create-product">
                <Button variant="outline" size="lg" className="min-w-[160px]">
                  Sell Something
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="lg" disabled>
                Connect Wallet to Sell
              </Button>
            )}
          </div>

          {isConnected && (
            <p className="text-sm text-gray-500 mt-4">
              Welcome back, {displayName}! 👋
            </p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Vitrine?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Package className="w-8 h-8" />}
              title="Decentralized Storage"
              description="Product data stored on CESS network for permanent availability"
            />
            
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Reputation System"
              description="Build trust through blockchain-based reputation scores"
            />
            
            <FeatureCard
              icon={<Gavel className="w-8 h-8" />}
              title="Jury Resolution"
              description="Decentralized dispute resolution by community jury"
            />
            
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Transparent Trading"
              description="All transactions recorded on blockchain for transparency"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-100 rounded-2xl">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Marketplace Stats</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StatCard title="Total Products" value="0" description="Listed on marketplace" />
            <StatCard title="Active Users" value="0" description="Registered personas" />
            <StatCard title="Disputes Resolved" value="0" description="By community jury" />
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isConnected && (
        <section className="text-center py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Trading?</h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to begin buying, selling, and building your reputation.
            </p>
            <div className="text-center">
              Connect your wallet using the button in the top right corner!
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// Feature Card Component
function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="text-primary-600 mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  description 
}: { 
  title: string
  value: string
  description: string 
}) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-primary-600 mb-2">{value}</div>
      <div className="text-lg font-semibold mb-1">{title}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
  )
}
