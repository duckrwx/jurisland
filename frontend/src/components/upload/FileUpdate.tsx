import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { clsx } from 'clsx'
import { Upload, X, FileImage, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { uploadAPI, handleAPIError } from '@/services/api/client'
import { ENV, APP_CONFIG } from '@/constants'
import type { FileWithPreview, UploadResult } from '@/types'

interface FileUploadProps {
  onUploadComplete: (results: UploadResult[]) => void
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
  className?: string
  disabled?: boolean
}

export function FileUpload({
  onUploadComplete,
  maxFiles = ENV.MAX_FILES_PER_PRODUCT,
  maxSize = ENV.MAX_FILE_SIZE,
  acceptedTypes = APP_CONFIG.SUPPORTED_IMAGE_TYPES,
  className,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    )
    
    setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles))
  }, [maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({
      ...acc,
      [type]: []
    }), {}),
    maxFiles,
    maxSize,
    disabled: disabled || uploading,
    onDropRejected: (fileRejections) => {
      const errors = fileRejections.map(rejection => 
        rejection.errors.map(error => error.message).join(', ')
      )
      setError(`Upload failed: ${errors.join('; ')}`)
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      setError('Please select files to upload')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const results = await uploadAPI.uploadMultipleToCESS(
        files,
        (progress) => setUploadProgress(progress)
      )
      
      onUploadComplete(results)
      setFiles([])
      setUploadProgress(0)
      
    } catch (error) {
      setError(handleAPIError(error))
    } finally {
      setUploading(false)
    }
  }

  // Cleanup object URLs
  React.useEffect(() => {
    return () => files.forEach(file => URL.revokeObjectURL(file.preview))
  }, [files])

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400',
          (disabled || uploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        
        {isDragActive ? (
          <p className="text-primary-600 font-medium">Drop files here...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              {acceptedTypes.includes('image/*') ? 'Images' : 'Files'} up to {Math.round(maxSize / 1024 / 1024)}MB each
              {maxFiles > 1 && ` (max ${maxFiles} files)`}
            </p>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <FilePreview
                key={index}
                file={file}
                onRemove={() => removeFile(index)}
                disabled={uploading}
              />
            ))}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading to CESS...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload button */}
          <div className="flex justify-end">
            <Button
              onClick={uploadFiles}
              disabled={uploading || files.length === 0}
              loading={uploading}
              variant="primary"
            >
              Upload {files.length} file{files.length !== 1 ? 's' : ''} to CESS
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// File preview component
interface FilePreviewProps {
  file: FileWithPreview
  onRemove: () => void
  disabled?: boolean
}

function FilePreview({ file, onRemove, disabled }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/')

  return (
    <div className="relative group">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
        {isImage ? (
          <img
            src={file.preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileImage className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* File info */}
      <div className="mt-2">
        <p className="text-xs text-gray-600 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-gray-400">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* Remove button */}
      {!disabled && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// Hook for file upload
export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const result = await uploadAPI.uploadToCESS(file, setProgress)
      return result
    } catch (error) {
      const errorMessage = handleAPIError(error)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setUploading(false)
    }
  }, [])

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const results = await uploadAPI.uploadMultipleToCESS(files, setProgress)
      return results
    } catch (error) {
      const errorMessage = handleAPIError(error)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setUploading(false)
    }
  }, [])

  return {
    uploadFile,
    uploadMultiple,
    uploading,
    progress,
    error,
    clearError: () => setError(null),
  }
}
