import { WaiterRequest, WaiterRequestPrinterMapping, WaiterRequestType } from '@/lib/models/printer'

const API_BASE = '/api/waiter-requests'

// Fetch all waiter requests
export async function fetchWaiterRequests(): Promise<WaiterRequest[]> {
  try {
    const response = await fetch(API_BASE)
    if (!response.ok) {
      throw new Error('Failed to fetch waiter requests')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching waiter requests:', error)
    throw error
  }
}

// Fetch waiter request printer mappings
export async function fetchWaiterRequestMappings(): Promise<WaiterRequestPrinterMapping[]> {
  try {
    const response = await fetch(`${API_BASE}?type=mappings`)
    if (!response.ok) {
      throw new Error('Failed to fetch waiter request mappings')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching waiter request mappings:', error)
    throw error
  }
}

// Create a new waiter request
export async function createWaiterRequest(
  tableNumber: number,
  requestType: WaiterRequestType,
  message?: string
): Promise<WaiterRequest> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableNumber,
        requestType,
        message,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create waiter request')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating waiter request:', error)
    throw error
  }
}

// Update waiter request status
export async function updateWaiterRequest(
  id: string,
  updates: Partial<WaiterRequest>
): Promise<WaiterRequest> {
  try {
    const response = await fetch(`${API_BASE}?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error('Failed to update waiter request')
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating waiter request:', error)
    throw error
  }
}

// Delete waiter request
export async function deleteWaiterRequest(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}?id=${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to delete waiter request'
      }
    }
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting waiter request:', error)
    return {
      success: false,
      error: 'Error deleting waiter request'
    }
  }
}

// Create or update waiter request printer mapping
export async function saveWaiterRequestMapping(
  mapping: WaiterRequestPrinterMapping
): Promise<WaiterRequestPrinterMapping> {
  try {
    const response = await fetch(`${API_BASE}?type=mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapping),
    })

    if (!response.ok) {
      throw new Error('Failed to save waiter request mapping')
    }

    return await response.json()
  } catch (error) {
    console.error('Error saving waiter request mapping:', error)
    throw error
  }
}

// Delete waiter request printer mapping
export async function deleteWaiterRequestMapping(requestType: WaiterRequestType): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}?type=mapping&requestType=${requestType}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to delete waiter request mapping'
      }
    }
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting waiter request mapping:', error)
    return {
      success: false,
      error: 'Error deleting waiter request mapping'
    }
  }
}

// Print waiter request
export async function printWaiterRequest(
  tableNumber: number,
  requestType: WaiterRequestType,
  message: string,
  requestId?: string
): Promise<{ success: boolean; printJobId?: string; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/print-waiter-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableNumber,
        requestType,
        message,
        requestId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to print waiter request'
      }
    }

    return {
      success: true,
      printJobId: result.printJobId,
      message: result.message
    }
  } catch (error) {
    console.error('Error printing waiter request:', error)
    return {
      success: false,
      error: 'Network error while printing waiter request'
    }
  }
}