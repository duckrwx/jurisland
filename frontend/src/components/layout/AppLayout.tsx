import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { 
  Home, 
  Package, 
  Plus, 
  User, 
  LayoutDashboard,
  Menu,
  X 
} from 'lucide-react'

import { ConnectWallet, NetworkSwitch } from '@/components/web3/ConnectWallet'
import { walletSelectors } from '@/stores/walletStore'
import { ENV } from '@/constants'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const location = useLocation()
  const isConnected = walletSelectors.useIsConnected()

  const navigation = [
    { name: 'Home', href: '/', icon: Home, public: true },
    { name: 'Products', href: '/products', icon: Package, public: true },
    { name: 'Create Product', href: '/create-product', icon: Plus, public: false },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, public: false },
    { name: 'Profile', href: '/profile', icon: User, public: false },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.public || isConnected
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link to="/" className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-900">
              {ENV.APP_NAME}
            </span>
          </Link>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="absolute bottom-6 left-0 right-0 px-6">
          <div className="text-xs text-gray-500 text-center">
            Version {ENV.APP_VERSION}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb or page title */}
            <div className="flex-1 lg:flex lg:items-center">
              <h1 className="text-lg font-semibold text-gray-900 capitalize">
                {location.pathname === '/' ? 'Home' : 
                 location.pathname.split('/')[1].replace('-', ' ')}
              </h1>
            </div>

            {/* Right side - wallet connection */}
            <div className="flex items-center gap-4">
              <NetworkSwitch />
              <ConnectWallet showBalance={true} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-600">
                © 2024 {ENV.APP_NAME}. Decentralized marketplace with reputation system.
              </div>
              
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  Documentation
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  Support
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
