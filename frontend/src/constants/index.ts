// Environment variables with proper validation
export const ENV = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  
  // Smart Contracts - LENDO DO .env
  VITRINE_CORE_ADDRESS: import.meta.env.VITE_VITRINE_CORE_ADDRESS as `0x${string}`,
  MARKETPLACE_ADDRESS: import.meta.env.VITE_MARKETPLACE_ADDRESS as `0x${string}`,
  
  // Blockchain - LENDO DO .env
  WEB3_PROVIDER_URL: import.meta.env.VITE_WEB3_PROVIDER_URL || 'http://127.0.0.1:8545',
  CHAIN_ID: Number(import.meta.env.VITE_CHAIN_ID) || 31337,
  
  // Features
  ENABLE_CESS_STORAGE: import.meta.env.VITE_ENABLE_CESS_STORAGE === 'true',
  MAX_FILE_SIZE: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760,
  MAX_FILES_PER_PRODUCT: Number(import.meta.env.VITE_MAX_FILES_PER_PRODUCT) || 5,
  
  // App Info
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Vitrine Marketplace',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.1.0',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  
  // WalletConnect
  WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
} as const

// Validation - verificar se variáveis essenciais existem
const requiredEnvVars = [
  'VITE_VITRINE_CORE_ADDRESS',
  'VITE_MARKETPLACE_ADDRESS',
] as const

// Validate and log missing variables
const missingVars: string[] = []
requiredEnvVars.forEach(envVar => {
  if (!import.meta.env[envVar]) {
    missingVars.push(envVar)
  }
})

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars)
  console.error('💡 Please check your frontend/.env file')
} else {
  console.log('✅ All required environment variables found')
}

// Debug log (only in development)
if (ENV.DEBUG) {
  console.log('🔧 Environment Configuration:', {
    CHAIN_ID: ENV.CHAIN_ID,
    VITRINE_CORE: ENV.VITRINE_CORE_ADDRESS,
    MARKETPLACE: ENV.MARKETPLACE_ADDRESS,
    API_BASE_URL: ENV.API_BASE_URL,
    WEB3_PROVIDER: ENV.WEB3_PROVIDER_URL,
  })
}

// App Constants
export const APP_CONFIG = {
  NAME: ENV.APP_NAME,
  VERSION: ENV.APP_VERSION,
  DEFAULT_PAGE_SIZE: 20,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const

// Contract Constants
export const CONTRACT_CONFIG = {
  ADDRESSES: {
    VITRINE_CORE: ENV.VITRINE_CORE_ADDRESS,
    MARKETPLACE: ENV.MARKETPLACE_ADDRESS,
  },
  CHAIN_ID: ENV.CHAIN_ID,
  RPC_URL: ENV.WEB3_PROVIDER_URL,
} as const

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: '/health',
  PRODUCTS: '/api/products',
  UPLOAD_TO_CESS: '/api/upload-to-cess',
  PERSONA_CREATE: '/api/persona/create',
} as const

// Helper to check if environment is properly configured
export const isEnvironmentReady = () => {
  return (
    ENV.VITRINE_CORE_ADDRESS && 
    ENV.MARKETPLACE_ADDRESS && 
    ENV.CHAIN_ID === 31337
  )
}

// Helper to get environment status
export const getEnvironmentStatus = () => {
  return {
    hasContracts: !!(ENV.VITRINE_CORE_ADDRESS && ENV.MARKETPLACE_ADDRESS),
    hasCorrectChainId: ENV.CHAIN_ID === 31337,
    hasApiUrl: !!ENV.API_BASE_URL,
    hasRpcUrl: !!ENV.WEB3_PROVIDER_URL,
    missingVariables: missingVars,
  }
}
