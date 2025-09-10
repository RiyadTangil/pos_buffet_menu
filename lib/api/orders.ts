interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  categoryId: string
}

interface OrderData {
  orderId: string
  timestamp: string
  items: OrderItem[]
  totalItems: number
  totalAmount: number
  sessionInfo?: {
    adultPrice: number
    childPrice: number
    extraDrinksPrice: number
    nextOrderTiming: number
  }
}

interface SaveOrderResponse {
  success: boolean
  message: string
  filename?: string
  filepath?: string
  error?: string
}

export async function saveOrder(orderData: OrderData): Promise<SaveOrderResponse> {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error saving order:', error)
    return {
      success: false,
      message: 'Failed to save order',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export type { OrderData, OrderItem, SaveOrderResponse }