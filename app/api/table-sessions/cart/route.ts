import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { broadcastTableSessionUpdate } from '@/app/api/socket/route'
import { CartItem } from '../route'

// PUT - Update cart items for a table session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableId, cartItems } = body

    if (!tableId || !Array.isArray(cartItems)) {
      return NextResponse.json(
        { success: false, error: 'Table ID and cart items array are required' },
        { status: 400 }
      )
    }

    // Validate cart items structure
    for (const item of cartItems) {
      if (!item.menuItemId || !item.name || typeof item.quantity !== 'number' || item.quantity < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid cart item structure' },
          { status: 400 }
        )
      }
    }

    const db = await getDatabase()
    
    // Find and update the active table session
    const result = await db.collection('table_sessions').findOneAndUpdate(
      { 
        tableId, 
        status: 'active' 
      },
      {
        $set: {
          cartItems,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Active table session not found' },
        { status: 404 }
      )
    }

    // Format the session data for broadcasting
    const sessionData = {
      id: result._id.toString(),
      tableId: result.tableId,
      deviceId: result.deviceId,
      guestCounts: result.guestCounts,
      cartItems: result.cartItems,
      nextOrderAvailableUntil: result.nextOrderAvailableUntil,
      status: result.status,
      updatedAt: result.updatedAt,
      isSecondaryDevice: result.isSecondaryDevice || false
    }

    // Broadcast cart update to all devices on this table
    broadcastTableSessionUpdate(tableId, sessionData)

    return NextResponse.json({
      success: true,
      data: sessionData
    })
  } catch (error) {
    console.error('Error updating cart:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update cart' },
      { status: 500 }
    )
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableId, cartItem, isAdd, action } = body

    if (!tableId || !cartItem) {
      return NextResponse.json(
        { success: false, error: 'Table ID and cart item are required' },
        { status: 400 }
      )
    }

    // Determine operation: add or subtract
    const shouldAdd = typeof isAdd === 'boolean' ? isAdd : (action ? action !== 'subtract' : true)

    // Basic validation for menuItemId and quantity
    if (!cartItem.menuItemId || typeof cartItem.quantity !== 'number' || cartItem.quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid cart item structure' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Find the active table session
    const session = await db.collection('table_sessions').findOne({
      tableId,
      status: 'active'
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Active table session not found' },
        { status: 404 }
      )
    }

    const currentCartItems = session.cartItems || []
    
    // Check if item already exists in cart
    const existingItemIndex = currentCartItems.findIndex(
      (item: CartItem) => item.menuItemId === cartItem.menuItemId
    )

    let updatedCartItems
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const existingItem = currentCartItems[existingItemIndex]
      const newQuantity = shouldAdd 
        ? existingItem.quantity + cartItem.quantity 
        : existingItem.quantity - cartItem.quantity

      if (newQuantity > 0) {
        updatedCartItems = [...currentCartItems]
        updatedCartItems[existingItemIndex] = { ...existingItem, quantity: newQuantity }
      } else {
        // Remove the item if quantity drops to 0 or below
        updatedCartItems = currentCartItems.filter((item: CartItem) => item.menuItemId !== cartItem.menuItemId)
      }
    } else {
      if (shouldAdd) {
        // Add new item to cart (require full item details)
        if (!cartItem.name || typeof cartItem.price !== 'number' || !cartItem.categoryId) {
          return NextResponse.json(
            { success: false, error: 'Missing item details for adding new item' },
            { status: 400 }
          )
        }
        updatedCartItems = [...currentCartItems, cartItem]
      } else {
        // Subtract requested but item not in cart; no changes
        updatedCartItems = currentCartItems
      }
    }

    // Update the session with new cart items
    const result = await db.collection('table_sessions').findOneAndUpdate(
      { 
        tableId, 
        status: 'active' 
      },
      {
        $set: {
          cartItems: updatedCartItems,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to update cart' },
        { status: 500 }
      )
    }

    // Format the session data for broadcasting
    const sessionData = {
      id: result._id.toString(),
      tableId: result.tableId,
      deviceId: result.deviceId,
      guestCounts: result.guestCounts,
      cartItems: result.cartItems,
      nextOrderAvailableUntil: result.nextOrderAvailableUntil,
      status: result.status,
      updatedAt: result.updatedAt,
      isSecondaryDevice: result.isSecondaryDevice || false
    }

    // Broadcast cart update to all devices on this table
    broadcastTableSessionUpdate(tableId, sessionData)

    return NextResponse.json({
      success: true,
      data: sessionData
    })
  } catch (error) {
    console.error('Error adding item to cart:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add item to cart' },
      { status: 500 }
    )
  }
}

// DELETE - Remove item from cart or clear cart
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('tableId')
    const menuItemId = searchParams.get('menuItemId')

    if (!tableId) {
      return NextResponse.json(
        { success: false, error: 'Table ID is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Find the active table session
    const session = await db.collection('table_sessions').findOne({
      tableId,
      status: 'active'
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Active table session not found' },
        { status: 404 }
      )
    }

    let updatedCartItems
    if (menuItemId) {
      // Remove specific item from cart
      const currentCartItems = session.cartItems || []
      updatedCartItems = currentCartItems.filter(
        (item: CartItem) => item.menuItemId !== menuItemId
      )
    } else {
      // Clear entire cart
      updatedCartItems = []
    }

    // Update the session with new cart items
    const result = await db.collection('table_sessions').findOneAndUpdate(
      { 
        tableId, 
        status: 'active' 
      },
      {
        $set: {
          cartItems: updatedCartItems,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to update cart' },
        { status: 500 }
      )
    }

    // Format the session data for broadcasting
    const sessionData = {
      id: result._id.toString(),
      tableId: result.tableId,
      deviceId: result.deviceId,
      guestCounts: result.guestCounts,
      cartItems: result.cartItems,
      status: result.status,
      updatedAt: result.updatedAt,
      isSecondaryDevice: result.isSecondaryDevice || false
    }

    // Broadcast cart update to all devices on this table
    broadcastTableSessionUpdate(tableId, sessionData)

    return NextResponse.json({
      success: true,
      data: sessionData
    })
  } catch (error) {
    console.error('Error removing item from cart:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove item from cart' },
      { status: 500 }
    )
  }
}