import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Order interfaces matching our order management page
interface OrderItem {
  id: string
  name: string
  quantity: number
  category: string
  price: number
}

interface Order {
  id: string
  tableId: string
  tableNumber: number
  session: 'breakfast' | 'lunch' | 'dinner'
  date: string
  time: string
  items: OrderItem[]
  totalAmount: number
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

// Get all orders with optional filters
export async function GET(request: NextRequest) {
  try {
    console.log("fetching local orders")
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tableNumber = searchParams.get('tableNumber')
    const tableId = searchParams.get('tableId')
    const session = searchParams.get('session')
    const date = searchParams.get('date')
    
    let orders = loadOrders()
    
    // Apply filters
    if (status) {
      orders = orders.filter(order => order.status === status)
    }
    if (tableNumber) {
      orders = orders.filter(order => order.tableNumber === parseInt(tableNumber))
    }
    if (tableId) {
      orders = orders.filter(order => order.tableId === tableId)
    }
    if (session) {
      orders = orders.filter(order => order.session === session)
    }
    if (date) {
      orders = orders.filter(order => order.date === date)
    }
    
    // Sort by date and time (newest first)
    orders.sort((a, b) => {
      const dateTimeA = new Date(`${a.date} ${a.time}`)
      const dateTimeB = new Date(`${b.date} ${b.time}`)
      return dateTimeB.getTime() - dateTimeA.getTime()
    })
    
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// Create new order
export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()
    
    // Generate unique order ID
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Get current date and time
    const now = new Date()
    const date = now.toISOString().split('T')[0] // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
    
    // Calculate total amount
    const totalAmount = orderData.items.reduce((total: number, item: any) => {
      return total + (item.price || 0) * item.quantity
    }, 0)

    // Create new order
    const newOrder: Order = {
      id: orderId,
      tableId: orderData.tableId || `table-${orderData.tableNumber}`,
      tableNumber: orderData.tableNumber,
      session: orderData.session,
      date,
      time,
      items: orderData.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        price: item.price || 0
      })),
      totalAmount,
      status: 'pending',
      guestCount: orderData.guestCount
    }
    
    // Load existing orders and add new one
    const orders = loadOrders()
    orders.push(newOrder)
    
    // Save to file
    saveOrders(orders)
    
    return NextResponse.json({ 
      success: true, 
      orderId: newOrder.id,
      order: newOrder
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}