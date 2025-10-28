import { PrinterConfig, PrintJob, CategoryPrinterMapping } from '@/lib/models/printer'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Printer Configuration APIs
export async function fetchPrinters(): Promise<PrinterConfig[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/printers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<PrinterConfig[]> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch printers')
    }

    return result.data || []
  } catch (error) {
    console.error('Error fetching printers:', error)
    throw error
  }
}

export async function createPrinter(printerData: Omit<PrinterConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<PrinterConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/printers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printerData),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<PrinterConfig> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create printer')
    }

    if (!result.data) {
      throw new Error('No printer data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error creating printer:', error)
    throw error
  }
}

export async function updatePrinter(id: string, printerData: Partial<PrinterConfig>): Promise<PrinterConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/printers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printerData),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<PrinterConfig> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update printer')
    }

    if (!result.data) {
      throw new Error('No printer data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error updating printer:', error)
    throw error
  }
}

export async function deletePrinter(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/printers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<void> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete printer')
    }
  } catch (error) {
    console.error('Error deleting printer:', error)
    throw error
  }
}

// Print Job APIs
export async function createPrintJob(printJobData: Omit<PrintJob, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<PrintJob> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/print-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printJobData),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<PrintJob> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create print job')
    }

    if (!result.data) {
      throw new Error('No print job data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error creating print job:', error)
    throw error
  }
}

export async function fetchPrintJobs(filters?: {
  status?: string
  printerId?: string
  orderId?: string
}): Promise<PrintJob[]> {
  try {
    const queryParams = new URLSearchParams()
    if (filters?.status) queryParams.append('status', filters.status)
    if (filters?.printerId) queryParams.append('printerId', filters.printerId)
    if (filters?.orderId) queryParams.append('orderId', filters.orderId)

    const url = queryParams.toString() 
      ? `${API_BASE_URL}/api/print-jobs?${queryParams.toString()}`
      : `${API_BASE_URL}/api/print-jobs`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<PrintJob[]> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch print jobs')
    }

    return result.data || []
  } catch (error) {
    console.error('Error fetching print jobs:', error)
    throw error
  }
}

// Category-Printer Mapping APIs
export async function fetchCategoryPrinterMappings(): Promise<CategoryPrinterMapping[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/category-printer-mappings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<CategoryPrinterMapping[]> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch category printer mappings')
    }

    return result.data || []
  } catch (error) {
    console.error('Error fetching category printer mappings:', error)
    throw error
  }
}

// Utility function to send order to appropriate printers
export async function printOrderByCategories(orderId: string, orderItems: any[]): Promise<PrintJob[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/print-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        orderItems
      }),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<PrintJob[]> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to print order')
    }

    return result.data || []
  } catch (error) {
    console.error('Error printing order:', error)
    throw error
  }
}