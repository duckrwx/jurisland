import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import { ENV, API_ENDPOINTS } from '@/constants'
import type { ApiResponse, ApiError } from '@/types'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      }
    }
    
    if (ENV.DEBUG) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      })
    }
    
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (ENV.DEBUG) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      })
    }
    return response
  },
  (error: AxiosError) => {
    const apiError: ApiError = {
      message: 'Network Error',
      status: error.response?.status || 0,
      detail: error.response?.data,
    }

    if (error.response) {
      // Server responded with error status
      apiError.message = (error.response.data as any)?.detail || 
                        (error.response.data as any)?.message || 
                        `HTTP ${error.response.status}`
      apiError.status = error.response.status
    } else if (error.request) {
      // Request was made but no response received
      apiError.message = 'Network connection failed'
      apiError.status = 0
    } else {
      // Something happened in setting up the request
      apiError.message = error.message || 'Request failed'
    }

    console.error('❌ API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: apiError.status,
      message: apiError.message,
      detail: apiError.detail,
    })

    return Promise.reject(apiError)
  }
)

// Generic API methods
export const apiClient = {
  // Health check
  async health() {
    const response = await api.get(API_ENDPOINTS.HEALTH)
    return response.data
  },

  // GET request
  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await api.get(url, { params })
    return response.data
  },

  // POST request
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await api.post(url, data)
    return response.data
  },

  // PUT request
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await api.put(url, data)
    return response.data
  },

  // DELETE request
  async delete<T = any>(url: string): Promise<T> {
    const response = await api.delete(url)
    return response.data
  },

  // Upload file
  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  },

  // Upload multiple files
  async uploadMultiple<T = any>(
    url: string, 
    files: File[], 
    onProgress?: (progress: number) => void
  ): Promise<T[]> {
    const uploads = files.map(file => this.upload<T>(url, file, onProgress))
    return Promise.all(uploads)
  },
}

// Specific API services
export const productAPI = {
  // Get all products
  async getProducts(params?: {
    category?: string
    seller?: string
    limit?: number
    offset?: number
    search?: string
  }) {
    return apiClient.get(API_ENDPOINTS.PRODUCTS, params)
  },

  // Get product by ID
  async getProduct(id: string) {
    return apiClient.get(API_ENDPOINTS.PRODUCT_BY_ID(id))
  },

  // Register new product
  async registerProduct(product: {
    name: string
    description: string
    price: number
    category: string
    images: string[] // FIDs from CESS
    seller: string
  }) {
    return apiClient.post(API_ENDPOINTS.REGISTER_PRODUCT, product)
  },

  // Search products
  async searchProducts(query: string, filters?: Record<string, any>) {
    return apiClient.get(API_ENDPOINTS.PRODUCTS, {
      search: query,
      ...filters,
    })
  },
}

export const personaAPI = {
  // Create persona
  async createPersona(persona: {
    wallet_address: string
    interests: string[]
    browsing_history: Record<string, any>
    preferences: Record<string, any>
    demographics?: Record<string, any>
  }) {
    return apiClient.post(API_ENDPOINTS.PERSONA_CREATE, persona)
  },

  // Update persona
  async updatePersona(address: string, persona: {
    wallet_address: string
    interests: string[]
    browsing_history: Record<string, any>
    preferences: Record<string, any>
    demographics?: Record<string, any>
  }) {
    return apiClient.put(API_ENDPOINTS.PERSONA_UPDATE(address), persona)
  },

  // Get persona
  async getPersona(address: string) {
    return apiClient.get(API_ENDPOINTS.PERSONA_GET(address))
  },
}

export const uploadAPI = {
  // Upload file to CESS
  async uploadToCESS(file: File, onProgress?: (progress: number) => void) {
    return apiClient.upload(API_ENDPOINTS.UPLOAD_TO_CESS, file, onProgress)
  },

  // Upload multiple files to CESS
  async uploadMultipleToCESS(files: File[], onProgress?: (progress: number) => void) {
    const results = []
    let completedUploads = 0

    for (const file of files) {
      try {
        const result = await this.uploadToCESS(file, (fileProgress) => {
          // Calculate overall progress
          const overallProgress = ((completedUploads + fileProgress / 100) / files.length) * 100
          onProgress?.(Math.round(overallProgress))
        })
        
        results.push(result)
        completedUploads++
        
        // Update progress after completion
        onProgress?.((completedUploads / files.length) * 100)
        
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        throw error
      }
    }

    return results
  },
}

// Error handler utility
export const handleAPIError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as ApiError).message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unexpected error occurred'
}

// Retry utility for failed requests
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  throw lastError
}

export default api
