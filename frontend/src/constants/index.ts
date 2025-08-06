// Environment variables with validation
export const ENV = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  
  // Smart Contracts
  VITRINE_CORE_ADDRESS: import.meta.env.VITE_VITRINE_CORE_ADDRESS as `0x${string}`,
  MARKETPLACE_ADDRESS: import.meta.env.VITE_MARKETPLACE_ADDRESS as `0x${string}`,
  
  // Blockchain
  WEB3_PROVIDER_URL: import.meta.env.VITE_WEB3_PROVIDER_URL || 'http://localhost:8545',
  CHAIN_ID: Number(import.meta.env.VITE_CHAIN_ID) || 31337,
  
  // Features
  ENABLE_CESS_STORAGE: import.meta.env.VITE_ENABLE_CESS_STORAGE === 'true',
  ENABLE_REAL_PAYMENTS: import.meta.env.VITE_ENABLE_REAL_PAYMENTS === 'true',
  MAX_FILE_SIZE: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB
  MAX_FILES_PER_PRODUCT: Number(import.meta.env.VITE_MAX_FILES_PER_PRODUCT) || 5,
  
  // App Info
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Vitrine Marketplace',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.1.0',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  
  // WalletConnect
  WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
} as const

// Validation
const requiredEnvVars = [
  'VITE_VITRINE_CORE_ADDRESS',
  'VITE_MARKETPLACE_ADDRESS',
] as const

// Validate required environment variables
requiredEnvVars.forEach(envVar => {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
})

// App Constants
export const APP_CONFIG = {
  NAME: ENV.APP_NAME,
  VERSION: ENV.APP_VERSION,
  DESCRIPTION: 'Decentralized marketplace with reputation system and jury resolution',
  
  // UI Constants
  HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 256,
  MOBILE_BREAKPOINT: 768,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Upload
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  SUPPORTED_FILE_TYPES: ['image/*', 'application/pdf', 'text/*'],
} as const

// Contract Constants
export const CONTRACT_CONFIG = {
  ADDRESSES: {
    VITRINE_CORE: ENV.VITRINE_CORE_ADDRESS,
    MARKETPLACE: ENV.MARKETPLACE_ADDRESS,
  },
  
  // Transaction Settings
  GAS_LIMIT: {
    LIST_PRODUCT: 300000n,
    PURCHASE_PRODUCT: 200000n,
    CONFIRM_DELIVERY: 150000n,
    FINALIZE_PURCHASE: 250000n,
    REGISTER_PERSONA: 100000n,
    UPDATE_REPUTATION: 80000n,
  },
  
  // Marketplace Constants
  PLATFORM_FEE_BPS: 250, // 2.5%
  
  // Reputation System
  INITIAL_REPUTATION: 10,
  MAX_REPUTATION: 1000,
  
  // Jury System
  MINIMUM_STAKE: BigInt('100000000000000000000'), // 100 tokens
  JURY_SIZE: 7,
  VOTING_PERIOD_DAYS: 3,
} as const

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: ENV.CHAIN_ID,
  name: ENV.CHAIN_ID === 31337 ? 'Localhost' : 'Ethereum',
  rpcUrl: ENV.WEB3_PROVIDER_URL,
  blockExplorer: ENV.CHAIN_ID === 31337 ? 'http://localhost:8545' : 'https://etherscan.io',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',
  
  // Products
  PRODUCTS: '/api/products',
  PRODUCT_BY_ID: (id: string) => `/api/products/${id}`,
  REGISTER_PRODUCT: '/api/products/register',
  
  // Personas
  PERSONA_CREATE: '/api/persona/create',
  PERSONA_UPDATE: (address: string) => `/api/persona/update/${address}`,
  PERSONA_GET: (address: string) => `/api/persona/${address}`,
  
  // Upload
  UPLOAD_TO_CESS: '/api/upload-to-cess',
} as const

// Status Constants
export const PURCHASE_STATUS = {
  PENDING: 'Pending',
  DELIVERY_CONFIRMED: 'DeliveryConfirmed',
  RETURN_REQUESTED: 'ReturnRequested',
  RETURN_RECEIVED: 'ReturnReceived',
  DISPUTE_OPEN: 'DisputeOpen',
  COMPLETED: 'Completed',
  REFUNDED: 'Refunded',
} as const

export const DISPUTE_STATUS = {
  CREATED: 'Created',
  JURORS_SELECTED: 'JurorsSelected',
  VOTING_ACTIVE: 'VotingActive',
  RESOLVED: 'Resolved',
  CANCELLED: 'Cancelled',
} as const

// UI Messages
export const MESSAGES = {
  // Connection
  CONNECT_WALLET: 'Connect your wallet to continue',
  CONNECTING: 'Connecting...',
  CONNECTION_FAILED: 'Failed to connect wallet',
  
  // Transactions
  TRANSACTION_PENDING: 'Transaction pending...',
  TRANSACTION_SUCCESS: 'Transaction successful!',
  TRANSACTION_FAILED: 'Transaction failed',
  
  // Upload
  UPLOADING: 'Uploading files...',
  UPLOAD_SUCCESS: 'Upload successful!',
  UPLOAD_FAILED: 'Upload failed',
  
  // Products
  PRODUCT_CREATED: 'Product created successfully!',
  PRODUCT_PURCHASED: 'Purchase initiated!',
  
  // Errors
  NETWORK_ERROR: 'Network error. Please try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
} as const

// Validation Constants
export const VALIDATION = {
  PRODUCT_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  PRODUCT_DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
  },
  PRODUCT_PRICE: {
    MIN: 0.001, // ETH
    MAX: 1000,  // ETH
  },
} as const
