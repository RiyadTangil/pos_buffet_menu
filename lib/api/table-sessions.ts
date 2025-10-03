// Client-side API functions for table session management

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  categoryId: string
}

export interface TableSession {
  id: string
  tableId: string
  deviceId: string
  guestCounts: {
    adults: number
    children: number
    infants: number
    includeDrinks: boolean
  }
  cartItems: CartItem[]
  nextOrderAvailableUntil?: string
  sessionEnded?: boolean
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
  isSecondaryDevice?: boolean
}

export interface CreateSessionData {
  tableId: string
  deviceId: string
  guestCounts: {
    adults: number
    children: number
    infants: number
    includeDrinks: boolean
  }
  waiterPin?: string
  isSecondaryDevice?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Update next order availability timestamp for active table session
export async function setNextOrderAvailable(tableId: string, untilISO: string): Promise<ApiResponse<TableSession>> {
  try {
    const response = await fetch('/api/table-sessions', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableId,
        nextOrderAvailableUntil: untilISO,
      })
    })

    const result: ApiResponse<TableSession> = await response.json()
    return result
  } catch (error) {
    console.error('Error setting next order availability:', error)
    return { success: false, error: 'Failed to set next order availability' }
  }
}

// Generate a unique device ID
export function generateDeviceId(): string {
  // Check if we're in the browser environment
  if (typeof window === 'undefined') {
    // Return a temporary ID for SSR
    return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }
  
  const stored = localStorage.getItem('deviceId')
  if (stored) return stored
  
  const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  localStorage.setItem('deviceId', deviceId)
  return deviceId
}

// Get table session by table ID
export async function getTableSession(tableId: string): Promise<TableSession | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/table-sessions?tableId=${tableId}`)
    const result: ApiResponse<TableSession> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch table session')
    }
    
    return result.data || null
  } catch (error) {
    console.error('Error fetching table session:', error)
    throw error
  }
}

// Create or join table session
export async function createOrJoinTableSession(data: CreateSessionData): Promise<TableSession> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/table-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    const result: ApiResponse<TableSession> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create/join table session')
    }
    
    return result.data!
  } catch (error) {
    console.error('Error creating/joining table session:', error)
    throw error
  }
}

// End table session
export async function endTableSession(tableId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/table-sessions?tableId=${tableId}`, {
      method: 'DELETE',
    })
    
    const result: ApiResponse<void> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to end table session')
    }
  } catch (error) {
    console.error('Error ending table session:', error)
    throw error
  }
}

// Verify waiter PIN
export async function verifyWaiterPin(pin: string): Promise<{ name: string; role: string; verified: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verify-waiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    })
    
    const result: ApiResponse<{ name: string; role: string; verified: boolean }> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to verify waiter PIN')
    }
    
    return result.data!
  } catch (error) {
    console.error('Error verifying waiter PIN:', error)
    throw error
  }
}