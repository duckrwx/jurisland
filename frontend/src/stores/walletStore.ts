import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type { Address } from '@/types' // Supondo que você tenha um arquivo de tipos
import { ENV } from '@/constants'

// ✅ ALTERAÇÃO 1: A interface foi simplificada.
// Removemos `isCorrectNetwork` como uma função daqui.
// Os estados derivados serão calculados apenas nos selectors.
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
  reset: () => void
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
      (set) => ({
        ...initialState,
        
        // As ações "setter" continuam as mesmas, são ótimas.
        setAddress: (address) => set({ address }, false, 'wallet/setAddress'),
        setConnected: (isConnected) => set({ isConnected }, false, 'wallet/setConnected'),
        setConnecting: (isConnecting) => set({ isConnecting }, false, 'wallet/setConnecting'),
        setChainId: (chainId) => set({ chainId }, false, 'wallet/setChainId'),
        setBalance: (balance) => set({ balance }, false, 'wallet/setBalance'),
        setEnsName: (ensName) => set({ ensName }, false, 'wallet/setEnsName'),
        
        reset: () => set(initialState, false, 'wallet/reset'),

        // ✅ ALTERAÇÃO 2: Removemos os métodos `connect`, `disconnect` e `isCorrectNetwork` daqui.
        // Ações complexas (como `connect`) devem ser tratadas pelos componentes
        // e estados derivados (como `isCorrectNetwork`) devem ser feitos nos selectors.
      }),
      {
        name: 'vitrine-wallet-store',
        partialize: (state) => ({
          address: state.address,
          chainId: state.chainId,
          ensName: state.ensName,
        }),
      }
    ),
    {
      name: 'WalletStore',
      enabled: ENV.DEBUG,
    }
  )
)

// ✅ ALTERAÇÃO 3: Os Selectors agora contêm a lógica de estado derivado.
// Esta é a correção principal do seu problema.
export const walletSelectors = {
  // --- Selectors de Estado Bruto ---
  useAddress: () => useWalletStore(state => state.address),
  useIsConnected: () => useWalletStore(state => state.isConnected),
  useIsConnecting: () => useWalletStore(state => state.isConnecting),
  useChainId: () => useWalletStore(state => state.chainId),
  
  // --- Selectors de Estado Derivado (Computado) ---
  
  // Este seletor agora calcula o estado da rede diretamente.
  // Ele só vai re-renderizar componentes quando `state.chainId` mudar.
  // O `Number()` garante que a comparação seja robusta contra tipos diferentes.
  useIsCorrectNetwork: () => useWalletStore(state => 
    Number(state.chainId) === ENV.CHAIN_ID
  ),
  
  // Este seletor agora também tem a lógica completa e robusta.
  // Ele só vai re-renderizar quando `isConnected` ou `chainId` mudarem.
  useCanInteract: () => useWalletStore(state => 
    state.isConnected && Number(state.chainId) === ENV.CHAIN_ID
  ),
  
  // --- Selectors de Dados Formatados ---
  useDisplayName: () => useWalletStore(state => {
    if (state.ensName) return state.ensName
    if (state.address) {
      return `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
    }
    return 'Não Conectado'
  }),
}

// ✅ ALTERAÇÃO 4: Ações exportadas foram simplificadas.
// Só exportamos os "setters" puros, pois a lógica de conexão
// deve viver nos componentes que usam os hooks do Wagmi.
export const walletActions = {
  setAddress: useWalletStore.getState().setAddress,
  setConnected: useWalletStore.getState().setConnected,
  setConnecting: useWalletStore.getState().setConnecting,
  setChainId: useWalletStore.getState().setChainId,
  setBalance: useWalletStore.getState().setBalance,
  setEnsName: useWalletStore.getState().setEnsName,
  reset: useWalletStore.getState().reset,
}

// Os hooks auxiliares que você criou são uma ótima ideia, mas
// eles podem ser simplificados ou usados diretamente dos selectors.
// Manterei eles aqui para não quebrar seu código existente.
export const useWalletConnection = () => {
  const isConnected = walletSelectors.useIsConnected()
  const isConnecting = walletSelectors.useIsConnecting()
  const address = walletSelectors.useAddress()
  const chainId = walletSelectors.useChainId()
  const isCorrectNetwork = walletSelectors.useIsCorrectNetwork()
  const canInteract = walletSelectors.useCanInteract()
  
  return { isConnected, isConnecting, address, chainId, isCorrectNetwork, canInteract }
}
