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
  
  // Connected state
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
          console.log('Switch network to', ENV.CHAIN_ID)
        }}
      >
        Switch
      </Button>
    </div>
  )
}

// Wallet guard component
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
}
