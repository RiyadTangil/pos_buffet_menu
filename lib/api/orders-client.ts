// Client-side order API functions that use fetch to call API routes
// This avoids importing MongoDB code in client components

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  image?: string
}

export interface SessionOrder {
  orderId: string
  timestamp: string
  tableId: string
  tableNumber: number
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed'
  waiterId?: string
  waiterName?: string
  sessionInfo: {
    adults: number
    children: number
    infants: number
    nextOrderTiming: number
  }
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CheckoutOrder {
  orderId: string
  tableId: string
  tableNumber: number
  sessionData: {
    adults: number
    children: number
    infants: number
    extraDrinks: boolean
    adultPrice: number
    childPrice: number
    infantPrice: number
    drinkPrice: number
    extraDrinksPricing?: {
      adultPrice: number
      childPrice: number
      infantPrice: number
    }
    sessionSpecificExtraDrinksPricing?: {
      breakfast: {
        adultPrice: number
        childPrice: number
        infantPrice: number
      }
      lunch: {
        adultPrice: number
        childPrice: number
        infantPrice: number
      }
      dinner: {
        adultPrice: number
        childPrice: number
        infantPrice: number
      }
    }
  }
  totalAmount: number
  waiterId: string
  waiterName: string
  paymentStatus: 'pending' | 'completed' | 'failed'
  timestamp: string
  sessionDuration: string
}

export type Order = SessionOrder | CheckoutOrder

export interface SaveOrderResponse {
  success: boolean
  orderId?: string
  error?: string
}

// Client-side functions using fetch
export async function getOrders(filters?: {
  status?: string
  tableNumber?: number
  tableId?: string
  sessionId?: string
  date?: string
  session?: string
  type?: 'session' | 'checkout'
}): Promise<Order[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.tableNumber) params.append('tableNumber', filters.tableNumber.toString())
    if (filters?.tableId) params.append('tableId', filters.tableId)
    if (filters?.sessionId) params.append('sessionId', filters.sessionId)
    if (filters?.date) params.append('date', filters.date)
    if (filters?.session) params.append('session', filters.session)
    if (filters?.type) params.append('type', filters.type)
    
    const response = await fetch(`/api/orders?${params.toString()}`)
    const data = await response.json()
    
    if (response.ok) {
      return data.orders || []
    } else {
      console.error('Failed to fetch orders:', data.message || data.error)
      return []
    }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}

export async function saveOrder(order: SessionOrder | CheckoutOrder): Promise<SaveOrderResponse> {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    })
    
    const data = await response.json()
    
    if (response.ok) {
      return { success: true, orderId: data.orderId }
    } else {
      return { success: false, error: data.error || data.message || 'Failed to save order' }
    }
  } catch (error) {
    console.error('Error saving order:', error)
    return { success: false, error: 'Failed to save order' }
  }
}

export async function updateOrder(orderId: string, updates: Partial<SessionOrder | CheckoutOrder>): Promise<SaveOrderResponse> {
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    
    const data = await response.json()
    
    if (response.ok) {
      return { success: true, orderId: data.orderId }
    } else {
      return { success: false, error: data.error || data.message || 'Failed to update order' }
    }
  } catch (error) {
    console.error('Error updating order:', error)
    return { success: false, error: 'Failed to update order' }
  }
}

export async function deleteOrder(orderId: string): Promise<SaveOrderResponse> {
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE',
    })
    
    const data = await response.json()
    
    if (response.ok) {
      return { success: true, orderId: data.orderId }
    } else {
      return { success: false, error: data.error || data.message || 'Failed to delete order' }
    }
  } catch (error) {
    console.error('Error deleting order:', error)
    return { success: false, error: 'Failed to delete order' }
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const response = await fetch(`/api/orders/${orderId}`)
    const data = await response.json()
    
    if (response.ok) {
      return data.order
    } else {
      console.error('Failed to fetch order:', data.error || data.message)
      return null
    }
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}