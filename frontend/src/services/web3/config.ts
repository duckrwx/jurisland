import { createConfig, http } from 'wagmi'
import { mainnet, localhost } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { ENV } from '@/constants'

// Define custom localhost chain if needed
const customLocalhost = {
  ...localhost,
  id: ENV.CHAIN_ID,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [ENV.WEB3_PROVIDER_URL],
    },
    public: {
      http: [ENV.WEB3_PROVIDER_URL],
    },
  },
} as const

// Chains configuration
export const chains = [
  ENV.CHAIN_ID === 31337 ? customLocalhost : mainnet,
] as const

// Connectors configuration
export const connectors = [
  injected({
    target: 'metaMask',
  }),
  injected({
    target: 'injected',
  }),
  ...(ENV.WALLETCONNECT_PROJECT_ID ? [
    walletConnect({
      projectId: ENV.WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: ENV.APP_NAME,
        description: 'Decentralized marketplace with reputation system',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    })
  ] : []),
]

// Wagmi configuration
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [ENV.CHAIN_ID]: http(ENV.WEB3_PROVIDER_URL),
    ...(ENV.CHAIN_ID !== 31337 && {
      [mainnet.id]: http(),
    }),
  },
  ssr: false,
})

// Contract ABIs (simplified versions - add full ABIs from your compiled contracts)
export const MARKETPLACE_ABI = [
  // Events
  {
    type: 'event',
    name: 'ProductListed',
    inputs: [
      { name: 'productId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'price', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'PurchaseInitiated',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
      { name: 'productId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'DeliveryConfirmed',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
      { name: 'deliverer', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'PurchaseCompleted',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'PurchaseRefunded',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'DisputeOpened',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
      { name: 'initiator', type: 'address' },
    ],
  },
  
  // Functions
  {
    type: 'function',
    name: 'listProduct',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_deliverer', type: 'address' },
      { name: '_price', type: 'uint256' },
      { name: '_creatorCommissionBps', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'purchaseProduct',
    stateMutability: 'payable',
    inputs: [
      { name: '_productId', type: 'uint256' },
      { name: '_creator', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'confirmDelivery',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_purchaseId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'finalizePurchase',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_purchaseId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'requestReturn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_purchaseId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'openDispute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_purchaseId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'products',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
    ],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'seller', type: 'address' },
      { name: 'deliverer', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'creatorCommissionBps', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'purchases',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
    ],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'deliverer', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'creatorCommissionBps', type: 'uint256' },
      { name: 'releaseTimestamp', type: 'uint256' },
      { name: 'inspectionTimestamp', type: 'uint256' },
      { name: 'status', type: 'uint8' },
    ],
  },
] as const

export const VITRINE_CORE_ABI = [
  // Events
  {
    type: 'event',
    name: 'PersonaRegistered',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'personaHash', type: 'bytes32' },
    ],
  },
  {
    type: 'event',
    name: 'ReputationUpdated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'role', type: 'string' },
      { name: 'newReputation', type: 'uint256' },
    ],
  },
  
  // Functions
  {
    type: 'function',
    name: 'registerPersona',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'personaHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getUserReputations',
    stateMutability: 'view',
    inputs: [
      { name: '_user', type: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getUserData',
    stateMutability: 'view',
    inputs: [
      { name: '_user', type: 'address' },
    ],
    outputs: [
      { name: 'personaHash', type: 'bytes32' },
      { name: 'buyerReputation', type: 'uint256' },
      { name: 'sellerReputation', type: 'uint256' },
      { name: 'creatorReputation', type: 'uint256' },
      { name: 'sellerReturnCount', type: 'uint256' },
      { name: 'buyerReturnCount', type: 'uint256' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'userExists',
    stateMutability: 'view',
    inputs: [
      { name: '_user', type: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool' },
    ],
  },
] as const

export const VITRINE_JURI_ABI = [
  // Events
  {
    type: 'event',
    name: 'Staked',
    inputs: [
      { name: 'juror', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'totalStake', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'Unstaked',
    inputs: [
      { name: 'juror', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'remainingStake', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'DisputeCreated',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
      { name: 'plaintiff', type: 'address', indexed: true },
      { name: 'defendant', type: 'address', indexed: true },
      { name: 'value', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
      { name: 'juror', type: 'address', indexed: true },
      { name: 'voteForPlaintiff', type: 'bool' },
    ],
  },
  {
    type: 'event',
    name: 'DisputeResolved',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'plaintiffVotes', type: 'uint256' },
      { name: 'totalVotes', type: 'uint256' },
    ],
  },
  
  // Functions
  {
    type: 'function',
    name: 'stake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unstake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'castVote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_purchaseId', type: 'uint256' },
      { name: '_voteForPlaintiff', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getDispute',
    stateMutability: 'view',
    inputs: [
      { name: '_purchaseId', type: 'uint256' },
    ],
    outputs: [
      { name: 'purchaseId', type: 'uint256' },
      { name: 'disputeValue', type: 'uint256' },
      { name: 'plaintiff', type: 'address' },
      { name: 'defendant', type: 'address' },
      { name: 'selectedJurors', type: 'address[]' },
      { name: 'voteCount', type: 'uint256' },
      { name: 'votingDeadline', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'winner', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'getJurorStats',
    stateMutability: 'view',
    inputs: [
      { name: '_juror', type: 'address' },
    ],
    outputs: [
      { name: 'stakedAmount', type: 'uint256' },
      { name: 'totalVotes', type: 'uint256' },
      { name: 'correctVotes', type: 'uint256' },
      { name: 'rewardsEarned', type: 'uint256' },
      { name: 'accuracyPercentage', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
  },
] as const
