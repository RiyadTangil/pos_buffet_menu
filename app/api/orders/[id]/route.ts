import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Order interfaces matching our order management page
interface OrderItem {
  id: string
  name: string
  quantity: number
  category: string
}

interface Order {
  id: string
  tableId: string
  tableNumber: number
  session: 'breakfast' | 'lunch' | 'dinner'
  date: string
  time: string
  items: OrderItem[]
  status: 'pending' | 'preparing' | 'ready' | 'served'
  guestCount: {
    adults: number
    children: number
    infants: number
  }
}

// File path for storing orders
const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json')

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load orders from file
function loadOrders(): Order[] {
  try {
    ensureDataDirectory()
    if (fs.existsSync(ordersFilePath)) {
      const data = fs.readFileSync(ordersFilePath, 'utf8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error loading orders:', error)
    return []
  }
}

// Save orders to file
function saveOrders(orders: Order[]) {
  try {
    ensureDataDirectory()
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2))
  } catch (error) {
    console.error('Error saving orders:', error)
    throw error
  }
}

// Get single order by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orders = loadOrders()
    const order = orders.find(o => o.id === params.id)
    
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// Update order status
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updateData = await request.json()
    const orders = loadOrders()
    const orderIndex = orders.findIndex(o => o.id === params.id)
    
    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Update order with new data
    orders[orderIndex] = {
      ...orders[orderIndex],
      ...updateData
    }
    
    // Save updated orders
    saveOrders(orders)
    
    return NextResponse.json({ 
      success: true, 
      order: orders[orderIndex]
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// Delete order
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orders = loadOrders()
    const orderIndex = orders.findIndex(o => o.id === params.id)
    
    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Remove order from array
    orders.splice(orderIndex, 1)
    
    // Save updated orders
    saveOrders(orders)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Order deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}