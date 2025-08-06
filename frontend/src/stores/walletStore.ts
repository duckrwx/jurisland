import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import type { Address, WalletStore } from '@/types'
import { ENV } from '@/constants'

interface WalletStoreState {
  // State
  address: Address | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  balance: bigint | null
  ensName: string | null
  
  // Actions
  setAddress: (address: Address | null) => void
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setChainId: (chainId: number | null) => void
  setBalance: (balance: bigint | null) => void
  setEnsName: (ensName: string | null) => void
  
  // Connection methods
  connect: () => Promise<void>
  disconnect: () => void
  
  // Utils
  reset: () => void
  isCorrectNetwork: () => boolean
}

const initialState = {
  address: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  balance: null,
  ensName: null,
}

export const useWalletStore = create<WalletStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Setters
        setAddress: (address) => {
          set({ address }, false, 'wallet/setAddress')
        },
        
        setConnected: (isConnected) => {
          set({ isConnected }, false, 'wallet/setConnected')
        },
        
        setConnecting: (isConnecting) => {
          set({ isConnecting }, false, 'wallet/setConnecting')
        },
        
        setChainId: (chainId) => {
          set({ chainId }, false, 'wallet/setChainId')
        },
        
        setBalance: (balance) => {
          set({ balance }, false, 'wallet/setBalance')
        },
        
        setEnsName: (ensName) => {
          set({ ensName }, false, 'wallet/setEnsName')
        },
        
        // Connection methods (will be implemented with wagmi hooks)
        connect: async () => {
          set({ isConnecting: true }, false, 'wallet/connect')
          try {
            // This will be implemented in the component using wagmi hooks
            // The store just manages the state
          } catch (error) {
            console.error('Failed to connect wallet:', error)
            set({ isConnecting: false }, false, 'wallet/connectError')
          }
        },
        
        disconnect: () => {
          set({
            ...initialState,
            isConnecting: false,
          }, false, 'wallet/disconnect')
        },
        
        // Utils
        reset: () => {
          set(initialState, false, 'wallet/reset')
        },
        
        isCorrectNetwork: () => {
          const { chainId } = get()
          return chainId === ENV.CHAIN_ID
        },
      }),
      {
        name: 'vitrine-wallet-store',
        partialize: (state) => ({
          // Only persist essential data
          address: state.address,
          chainId: state.chainId,
          ensName: state.ensName,
        }),
        // Don't persist sensitive connection state
        skipHydration: false,
      }
    ),
    {
      name: 'WalletStore',
      enabled: ENV.DEBUG,
    }
  )
)

// Selectors for easy access
export const walletSelectors = {
  // Basic info
  useAddress: () => useWalletStore(state => state.address),
  useIsConnected: () => useWalletStore(state => state.isConnected),
  useIsConnecting: () => useWalletStore(state => state.isConnecting),
  useChainId: () => useWalletStore(state => state.chainId),
  useBalance: () => useWalletStore(state => state.balance),
  useEnsName: () => useWalletStore(state => state.ensName),
  
  // Computed states
  useIsCorrectNetwork: () => useWalletStore(state => state.isCorrectNetwork()),
  useCanInteract: () => useWalletStore(state => 
    state.isConnected && state.chainId === ENV.CHAIN_ID
  ),
  
  // Formatted data
  useFormattedBalance: () => useWalletStore(state => {
    if (!state.balance) return '0.00'
    
    // Convert wei to ETH with 4 decimal places
    const eth = Number(state.balance) / 1e18
    return eth.toFixed(4)
  }),
  
  useShortAddress: () => useWalletStore(state => {
    if (!state.address) return ''
    
    // Format address as 0x1234...5678
    return `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
  }),
  
  useDisplayName: () => useWalletStore(state => {
    if (state.ensName) return state.ensName
    if (state.address) {
      return `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
    }
    return 'Not Connected'
  }),
}

// Actions for external use
export const walletActions = {
  setAddress: useWalletStore.getState().setAddress,
  setConnected: useWalletStore.getState().setConnected,
  setConnecting: useWalletStore.getState().setConnecting,
  setChainId: useWalletStore.getState().setChainId,
  setBalance: useWalletStore.getState().setBalance,
  setEnsName: useWalletStore.getState().setEnsName,
  connect: useWalletStore.getState().connect,
  disconnect: useWalletStore.getState().disconnect,
  reset: useWalletStore.getState().reset,
}

// Helper hooks
export const useWalletConnection = () => {
  const isConnected = walletSelectors.useIsConnected()
  const isConnecting = walletSelectors.useIsConnecting()
  const address = walletSelectors.useAddress()
  const chainId = walletSelectors.useChainId()
  const isCorrectNetwork = walletSelectors.useIsCorrectNetwork()
  const canInteract = walletSelectors.useCanInteract()
  
  return {
    isConnected,
    isConnecting,
    address,
    chainId,
    isCorrectNetwork,
    canInteract,
  }
}

export const useWalletDisplay = () => {
  const displayName = walletSelectors.useDisplayName()
  const shortAddress = walletSelectors.useShortAddress()
  const formattedBalance = walletSelectors.useFormattedBalance()
  const ensName = walletSelectors.useEnsName()
  
  return {
    displayName,
    shortAddress,
    formattedBalance,
    ensName,
  }
}
