import { PURCHASE_STATUS, DISPUTE_STATUS } from '@/constants'

// Base Types
export type Address = `0x${string}`
export type Hash = `0x${string}`
export type BigIntString = string

// Wallet Types
export interface WalletState {
  address: Address | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  balance: bigint | null
}

// Product Types (Backend API)
export interface Product {
  id: string
  name: string
  description: string
  price: number // in ETH
  category: string
  images: string[] // FIDs from CESS
  seller: Address
  createdAt: string
  status: 'active' | 'inactive' | 'sold'
}

export interface ProductFormData {
  name: string
  description: string
  price: number
  category: string
  images: File[]
  deliverer: Address
  creatorCommissionBps: number
}

export interface ProductResponse {
  products: Product[]
  total: number
  limit: number
  offset: number
}

// Smart Contract Product (on-chain)
export interface ContractProduct {
  id: bigint
  seller: Address
  deliverer: Address
  price: bigint
  creatorCommissionBps: bigint
  active: boolean
}

// Purchase Types
export type PurchaseStatusType = keyof typeof PURCHASE_STATUS

export interface Purchase {
  id: string
  buyer: Address
  seller: Address
  creator: Address
  deliverer: Address
  price: bigint
  creatorCommissionBps: bigint
  releaseTimestamp: bigint
  inspectionTimestamp: bigint
  status: PurchaseStatusType
}

// User/Persona Types
export interface UserReputation {
  buyerReputation: number
  sellerReputation: number
  creatorReputation: number
}

export interface PersonaData {
  wallet_address: Address
  interests: string[]
  browsing_history: Record<string, any>
  preferences: Record<string, any>
  demographics?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface UserData {
  personaHash: Hash
  buyerReputation: number
  sellerReputation: number
  creatorReputation: number
  sellerReturnCount: number
  buyerReturnCount: number
  exists: boolean
}

// Jury/Dispute Types
export type DisputeStatusType = keyof typeof DISPUTE_STATUS

export interface JurorInfo {
  stakedAmount: bigint
  totalVotes: number
  correctVotes: number
  rewardsEarned: bigint
  accuracyPercentage: number
  isActive: boolean
}

export interface Dispute {
  purchaseId: bigint
  disputeValue: bigint
  plaintiff: Address
  defendant: Address
  selectedJurors: Address[]
  voteCount: number
  votingDeadline: bigint
  status: DisputeStatusType
  winner: Address
}

// File Upload Types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  fid: string
  filename: string
  size: number
}

export interface FileWithPreview extends File {
  preview: string
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  status: 'success' | 'error'
}

export interface ApiError {
  message: string
  status: number
  detail?: any
}

// Form Types
export interface FormState {
  isSubmitting: boolean
  error: string | null
  success: boolean
}

// UI State Types
export interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  notifications: Notification[]
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  timestamp: number
}

// Search/Filter Types
export interface ProductFilters {
  category?: string
  seller?: Address
  minPrice?: number
  maxPrice?: number
  search?: string
}

export interface PaginationParams {
  limit: number
  offset: number
}

// Transaction Types
export interface TransactionState {
  hash?: Hash
  status: 'idle' | 'pending' | 'success' | 'error'
  error?: string
  receipt?: any
}

// Hook Return Types
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Contract Event Types
export interface ContractEvent {
  args: any[]
  eventName: string
  transactionHash: Hash
  blockNumber: number
  timestamp: number
}

// Validation Types
export interface ValidationError {
  field: string
  message: string
}

// Component Props Types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

// Store Types (Zustand)
export interface WalletStore extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  setAddress: (address: Address | null) => void
  setBalance: (balance: bigint | null) => void
  setChainId: (chainId: number | null) => void
}

export interface UserStore {
  user: UserData | null
  reputation: UserReputation | null
  persona: PersonaData | null
  
  setUser: (user: UserData | null) => void
  setReputation: (reputation: UserReputation | null) => void
  setPersona: (persona: PersonaData | null) => void
  
  // Actions
  fetchUserData: (address: Address) => Promise<void>
  updateReputation: () => Promise<void>
}

export interface ProductStore {
  products: Product[]
  selectedProduct: Product | null
  filters: ProductFilters
  pagination: PaginationParams
  loading: boolean
  error: string | null
  
  // Actions
  setProducts: (products: Product[]) => void
  setSelectedProduct: (product: Product | null) => void
  setFilters: (filters: Partial<ProductFilters>) => void
  setPagination: (pagination: Partial<PaginationParams>) => void
  
  fetchProducts: () => Promise<void>
  searchProducts: (query: string) => Promise<void>
  createProduct: (productData: ProductFormData) => Promise<Product>
}

// Utility Types
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Export all as default for easier importing
export default {
  // Re-export commonly used types
  type Address,
  type Product,
  type Purchase,
  type UserData,
  type Dispute,
  type ApiResponse,
}
