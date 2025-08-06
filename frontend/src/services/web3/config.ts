import { createConfig, http } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Chain EXATO para Hardhat
const hardhatChain = {
  ...hardhat,
  id: 31337, // IMPORTANTE: deve ser exatamente 31337
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
} as const

export const chains = [hardhatChain] as const

export const connectors = [
  injected({
    target: 'metaMask',
  }),
]

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    31337: http('http://127.0.0.1:8545'),
  },
  ssr: false,
})

console.log('🔗 Web3 Config:', {
  chainId: hardhatChain.id,
  rpcUrl: hardhatChain.rpcUrls.default.http[0],
  name: hardhatChain.name,
})

// ABIs básicos
export const MARKETPLACE_ABI = [] as const
export const VITRINE_CORE_ABI = [] as const
