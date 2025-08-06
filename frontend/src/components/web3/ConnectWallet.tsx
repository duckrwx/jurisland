import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useEnsName } from 'wagmi'
import { useWalletStore, walletSelectors, walletActions } from '@/stores/walletStore'
import { Button } from '@/components/ui/Button'
import { Wallet, ChevronDown, LogOut } from 'lucide-react'
import { ENV } from '@/constants'
import { clsx } from 'clsx'

interface ConnectWalletProps {
  className?: string
  showBalance?: boolean
  variant?: 'button' | 'dropdown'
  size?: 'sm' | 'md' | 'lg'
}

export function ConnectWallet({ 
  className, 
  showBalance = false, 
  variant = 'button',
  size = 'md'
}: ConnectWalletProps) {
  // Wagmi hooks
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  
  // Get balance if needed
  const { data: balance } = useBalance({
    address,
    query: { enabled: isConnected && showBalance }
  })
  
  // Get ENS name
  const { data: ensName } = useEnsName({
    address,
    query: { enabled: isConnected }
  })
  
  // Store selectors
  const displayName = walletSelectors.useDisplayName()
  const isCorrectNetwork = walletSelectors.useIsCorrectNetwork()
  const canInteract = walletSelectors.useCanInteract()
  
  // Sync wagmi state with store
  useEffect(() => {
    walletActions.setAddress(address || null)
    walletActions.setConnected(isConnected)
    walletActions.setConnecting(isConnecting || isPending)
    
    if (balance) {
      walletActions.setBalance(balance.value)
    }
    
    if (ensName) {
      walletActions.setEnsName(ensName)
    }
  }, [address, isConnected, isConnecting, isPending, balance, ensName])
  
  // Handle connection
  const handleConnect = () => {
    const preferredConnector = connectors.find(connector => 
      connector.name.toLowerCase().includes('metamask')
    ) || connectors[0]
    
    if (preferredConnector) {
      connect({ connector: preferredConnector })
    }
  }
  
  // Handle disconnection
  const handleDisconnect = () => {
    disconnect()
    walletActions.disconnect()
  }
  
  // Not connected state
  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        loading={isConnecting}
        variant="primary"
        size={size}
        className={clsx(
          'flex items-center gap-2',
          className
        )}
      >
        <Wallet size={16} />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    )
  }
  
  // Connected state - Button variant
  if (variant === 'button') {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        {/* Network indicator */}
        {!isCorrectNetwork && (
          <div className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
            Wrong Network
          </div>
        )}
        
        {/* Wallet info */}
        <div className={clsx(
          'flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg',
          !canInteract && 'opacity-75'
        )}>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        
        <div className="text-sm">
          <div className="font-medium">{displayName}</div>
          {showBalance && balance && (
            <div className="text-gray-600 text-xs">
              {Number(balance.formatted).toFixed(4)} {balance.symbol}
            </div>
          )}
        </div>
        
        <ChevronDown size={14} className="text-gray-500" />
      </button>
      
      {/* Dropdown menu - implement with proper dropdown library or state management */}
      {/* For now, just show disconnect button */}
      <div className="absolute top-full right-0 mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
        <button
          onClick={handleDisconnect}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <LogOut size={14} />
          Disconnect
        </button>
      </div>
    </div>
  )
}

// Network switch component
export function NetworkSwitch({ className }: { className?: string }) {
  const { chain } = useAccount()
  const isCorrectNetwork = walletSelectors.useIsCorrectNetwork()
  
  if (isCorrectNetwork) {
    return null
  }
  
  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800',
      className
    )}>
      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
      <div className="text-sm">
        <div className="font-medium">Wrong Network</div>
        <div className="text-xs">
          Please switch to {ENV.CHAIN_ID === 31337 ? 'Localhost' : 'Ethereum'}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          // Switch network - implement with wagmi useSwitchChain
          console.log('Switch network to', ENV.CHAIN_ID)
        }}
      >
        Switch
      </Button>
    </div>
  )
}

// Account info component
export function AccountInfo({ className }: { className?: string }) {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const { data: ensName } = useEnsName({ address })
  
  const displayName = walletSelectors.useDisplayName()
  const shortAddress = walletSelectors.useShortAddress()
  const isCorrectNetwork = walletSelectors.useIsCorrectNetwork()
  
  if (!isConnected || !address) {
    return null
  }
  
  return (
    <div className={clsx(
      'p-4 bg-white border border-gray-200 rounded-lg',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Account Info</h3>
        <div className={clsx(
          'px-2 py-1 rounded-full text-xs font-medium',
          isCorrectNetwork 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        )}>
          {isCorrectNetwork ? 'Connected' : 'Wrong Network'}
        </div>
      </div>
      
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-600">Address</label>
          <div className="font-mono text-sm text-gray-900">{shortAddress}</div>
        </div>
        
        {ensName && (
          <div>
            <label className="text-xs text-gray-600">ENS Name</label>
            <div className="text-sm text-gray-900">{ensName}</div>
          </div>
        )}
        
        {balance && (
          <div>
            <label className="text-xs text-gray-600">Balance</label>
            <div className="text-sm text-gray-900">
              {Number(balance.formatted).toFixed(4)} {balance.symbol}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wallet guard component - wraps components that need wallet connection
export function WalletGuard({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  const canInteract = walletSelectors.useCanInteract()
  
  if (!canInteract) {
    return (
      <div className="text-center py-8">
        {fallback || (
          <div className="space-y-4">
            <div className="text-gray-600">
              Please connect your wallet to continue
            </div>
            <ConnectWallet />
            <NetworkSwitch />
          </div>
        )}
      </div>
    )
  }
  
  return <>{children}</>
} rounded-full"></div>
          
          <div className="text-sm">
            <div className="font-medium">{displayName}</div>
            {showBalance && balance && (
              <div className="text-gray-600 text-xs">
                {Number(balance.formatted).toFixed(4)} {balance.symbol}
              </div>
            )}
          </div>
          
          <button
            onClick={handleDisconnect}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Disconnect"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    )
  }
  
  // Connected state - Dropdown variant
  return (
    <div className={clsx('relative', className)}>
      <button className={clsx(
        'flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors',
        !canInteract && 'opacity-75 cursor-not-allowed'
      )}>
        <div className="w-2 h-2 bg-green-500
