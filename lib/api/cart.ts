import { CartItem } from '@/app/api/table-sessions/route'

export interface CartApiResponse {
  success: boolean
  data?: any
  error?: string
}

// Add item to cart
export async function addToCartApi(tableId: string, cartItem: CartItem): Promise<CartApiResponse> {
  try {
    const response = await fetch('/api/table-sessions/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableId,
        cartItem
      })
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error adding item to cart:', error)
    return {
      success: false,
      error: 'Failed to add item to cart'
    }
  }
}

// Update entire cart
export async function updateCartApi(tableId: string, cartItems: CartItem[]): Promise<CartApiResponse> {
  try {
    const response = await fetch('/api/table-sessions/cart', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableId,
        cartItems
      })
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating cart:', error)
    return {
      success: false,
      error: 'Failed to update cart'
    }
  }
}

// Remove item from cart
export async function removeFromCartApi(tableId: string, menuItemId: string): Promise<CartApiResponse> {
  try {
    // Use POST with isAdd=false to decrement quantity by 1
    const response = await fetch('/api/table-sessions/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableId,
        cartItem: {
          menuItemId,
          quantity: 1
        },
        isAdd: false
      })
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error removing item from cart:', error)
    return {
      success: false,
      error: 'Failed to remove item from cart'
    }
  }
}

// Clear entire cart
export async function clearCartApi(tableId: string): Promise<CartApiResponse> {
  try {
    const response = await fetch(`/api/table-sessions/cart?tableId=${tableId}`, {
      method: 'DELETE'
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error clearing cart:', error)
    return {
      success: false,
      error: 'Failed to clear cart'
    }
  }
}

// Update item quantity in cart
export async function updateCartItemQuantityApi(
  tableId: string, 
  menuItemId: string, 
  newQuantity: number,
  currentCartItems: CartItem[]
): Promise<CartApiResponse> {
  try {
    const updatedCartItems = currentCartItems.map(item => 
      item.menuItemId === menuItemId 
        ? { ...item, quantity: newQuantity }
        : item
    ).filter(item => item.quantity > 0) // Remove items with 0 quantity

    return await updateCartApi(tableId, updatedCartItems)
  } catch (error) {
    console.error('Error updating item quantity:', error)
    return {
      success: false,
      error: 'Failed to update item quantity'
    }
  }
}