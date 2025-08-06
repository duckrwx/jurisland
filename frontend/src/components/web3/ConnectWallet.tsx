import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useEnsName, useChainId, useSwitchChain } from 'wagmi'
import { walletSelectors, walletActions } from '@/stores/walletStore'
import { Button } from '@/components/ui/Button'
import { Wallet, ChevronDown, LogOut, AlertTriangle } from 'lucide-react'
import { ENV } from '@/constants'
import { clsx } from 'clsx'

// -----------------------------------------------------------------------------
// Componente Principal: ConnectWallet
// -----------------------------------------------------------------------------
interface ConnectWalletProps {
  className?: string
  showBalance?: boolean
}

export function ConnectWallet({ className, showBalance = false }: ConnectWalletProps) {
  // --- Hooks do Wagmi para ler da carteira ---
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId() // Hook simples e direto para o ID da rede
  
  const { data: balance } = useBalance({
    address,
    query: { enabled: isConnected && showBalance },
  })
  
  const { data: ensName } = useEnsName({
    address,
    query: { enabled: isConnected },
  })
  
  // --- Hooks do nosso Store (Zustand) para ler o estado do app ---
  const displayName = walletSelectors.useDisplayName()
  const isCorrectNetwork = walletSelectors.useIsCorrectNetwork()
  const canInteract = walletSelectors.useCanInteract()
  
  // ✅ ESTE É O ÚNICO useEffect NECESSÁRIO
  // Ele sincroniza os dados brutos do Wagmi com nosso store.
  useEffect(() => {
    walletActions.setAddress(address ?? null)
    walletActions.setConnected(isConnected)
    walletActions.setConnecting(isConnecting || isPending)
    walletActions.setChainId(chainId ?? null) // Apenas envia o ID da rede
    
    if (balance) {
      walletActions.setBalance(balance.value)
    }
    if (ensName) {
      walletActions.setEnsName(ensName ?? null)
    }
  }, [address, isConnected, isConnecting, isPending, chainId, balance, ensName])
  
  // --- Funções de ação ---
  const handleConnect = () => {
    const metaMaskConnector = connectors.find(c => c.name.toLowerCase().includes('metamask'))
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector })
    } else if (connectors[0]) {
      connect({ connector: connectors[0] })
    }
  }
  
  const handleDisconnect = () => {
    disconnect()
    walletActions.reset() // Ação de reset do nosso store
  }

  // --- Renderização ---
  if (!isConnected) {
    return (
      <Button onClick={handleConnect} disabled={isPending} loading={isPending} variant="primary" className={clsx('flex items-center gap-2', className)}>
        <Wallet size={16} />
        {isPending ? 'Conectando...' : 'Conectar Carteira'}
      </Button>
    )
  }
  
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {!isCorrectNetwork && (
        <div className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center gap-1">
          <AlertTriangle size={12} />
          Rede Errada
        </div>
      )}
      <div className={clsx('flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg', !canInteract && 'opacity-75')}>
        <div className={clsx("w-2 h-2 rounded-full", isCorrectNetwork ? 'bg-green-500' : 'bg-red-500')}></div>
        <div className="text-sm">
          <div className="font-medium">{displayName}</div>
          {showBalance && balance && <div className="text-gray-600 text-xs">{Number(balance.formatted).toFixed(4)} {balance.symbol}</div>}
        </div>
        <button onClick={handleDisconnect} className="p-1 hover:bg-gray-200 rounded transition-colors" title="Disconnect">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Componente para Trocar de Rede
// -----------------------------------------------------------------------------
export function NetworkSwitch({ className }: { className?: string }) {
  const isCorrectNetwork = walletSelectors.useIsCorrectNetwork()
  const { switchChain, isPending } = useSwitchChain()

  if (isCorrectNetwork) {
    return null
  }
  
  const handleSwitch = () => {
    if (ENV.CHAIN_ID) {
      switchChain?.({ chainId: ENV.CHAIN_ID })
    }
  }

  return (
    <div className={clsx('flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800', className)}>
      <AlertTriangle size={16} className="text-yellow-600" />
      <div className="text-sm">
        <div className="font-medium">Rede Incorreta</div>
        <div className="text-xs">Por favor, mude para a rede {ENV.CHAIN_ID === 31337 ? 'Localhost' : 'Correta'}.</div>
      </div>
      <Button size="sm" variant="outline" onClick={handleSwitch} loading={isPending}>
        {isPending ? 'Trocando...' : 'Trocar Rede'}
      </Button>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Componente de Guarda (Protetor de Rotas/Componentes)
// -----------------------------------------------------------------------------
export function WalletGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const canInteract = walletSelectors.useCanInteract()
  
  if (!canInteract) {
    return (
      <div className="text-center py-8">
        {fallback || (
          <div className="space-y-4">
            <div className="text-gray-600">Por favor, conecte sua carteira e use a rede correta para continuar.</div>
            <ConnectWallet />
            <NetworkSwitch />
          </div>
        )}
      </div>
    )
  }
  
  return <>{children}</>
}
