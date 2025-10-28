import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import clientPromise, { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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
  groupType?: string
  tableSessionId?: string
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
    const groupType = searchParams.get('groupType')
    
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
    if (groupType) {
      orders = orders.filter(order => order.groupType === groupType)
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
      guestCount: orderData.guestCount,
      groupType: orderData.groupType,
      tableSessionId: orderData.tableSessionId
    }
    
    // Perform DB operations without a transaction for standalone MongoDB
    const client = await clientPromise
    try {
      const db = client.db('buffet')

      // Insert order into ORDERS collection
      await db.collection(COLLECTIONS.ORDERS).insertOne({
        orderId: newOrder.id,
        tableId: newOrder.tableId,
        tableNumber: newOrder.tableNumber,
        session: newOrder.session,
        date: newOrder.date,
        time: newOrder.time,
        items: newOrder.items,
        totalAmount: newOrder.totalAmount,
        status: newOrder.status,
        guestCount: newOrder.guestCount,
        groupType: newOrder.groupType,
        tableSessionId: newOrder.tableSessionId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      })

      // Clear cart automatically for active session on this table/groupType
      if (orderData.tableId) {
        const query: any = {
          tableId: orderData.tableId,
          status: 'active'
        }
        if (orderData.groupType) {
          query.groupType = orderData.groupType
        }

        await db.collection('table_sessions').updateOne(
          query,
          {
            $set: {
              cartItems: [],
              updatedAt: now.toISOString()
            }
          }
        )
      }
    } catch (error: any) {
      console.error('Order processing failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Order processing failed',
          details: error?.message || 'Database operation failed'
        },
        { status: 500 }
      )
    }

    // As a backup, also persist to local file (non-critical)
    try {
      const orders = loadOrders()
      orders.push(newOrder)
      saveOrders(orders)
    } catch (fileErr) {
      console.warn('Failed to write order backup file:', fileErr)
    }

    // Fetch printer configurations to include in response
    let printerConfigs = {
      ipPrinters: [],
      usbPrinters: []
    }

    try {
      // Load IP printers from file
      const printersFilePath = path.join(process.cwd(), 'data', 'printers.json')
      if (fs.existsSync(printersFilePath)) {
        const printersData = fs.readFileSync(printersFilePath, 'utf8')
        const printers = JSON.parse(printersData)
        printerConfigs.ipPrinters = printers.filter((p: any) => p.isActive)
      }

      // Load USB printers from file
      const usbPrintersFilePath = path.join(process.cwd(), 'data', 'usb-printers.json')
      if (fs.existsSync(usbPrintersFilePath)) {
        const usbPrintersData = fs.readFileSync(usbPrintersFilePath, 'utf8')
        const usbPrinters = JSON.parse(usbPrintersData)
        printerConfigs.usbPrinters = usbPrinters.filter((p: any) => p.isActive)
      }
    } catch (printerError) {
      console.error('Error loading printer configurations:', printerError)
      // Continue without printer configs if there's an error
    }

    return NextResponse.json({ 
      success: true, 
      orderId: newOrder.id,
      order: newOrder,
      printerConfigs
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order', details: (error as Error)?.message },
      { status: 500 }
    )
  }
}