// API utility functions for file uploads

export interface UploadResponse {
  success: boolean
  data?: {
    url: string
    filename: string
    originalName: string
    size: number
    type: string
  }
  error?: string
  message?: string
}

export async function uploadFile(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: UploadResponse = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to upload file')
    }

    return result.data?.url || ''
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

export function validateImageFile(file: File): string | null {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return 'File size too large. Maximum size is 5MB.'
  }

  return null // No validation errors
}