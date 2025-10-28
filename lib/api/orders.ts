import fs from 'fs'
import path from 'path'
import { getOrdersCollection } from '../mongodb'
import { 
  MongoOrderDocument, 
  MongoSessionOrder, 
  MongoCheckoutOrder,
  convertToMongoOrder,
  convertFromMongoOrder,
  validateSessionOrder,
  validateCheckoutOrder
} from '../models/order'

// Order interfaces (keeping existing for API compatibility)
export interface SessionOrder {
  orderId: string
  tableId: string
  tableNumber: number
  items: {
    id: string
    name: string
    price: number
    quantity: number
    category: string
    image?: string
  }[]
  sessionInfo: {
    startTime: string
    duration: number
    adults: number
    children: number
    infants: number
    extraDrinks: boolean
  }
  totalAmount: number
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed'
  timestamp?: string
  createdAt: string
  updatedAt: string
  type: 'session'
  waiterId?: string
  waiterName?: string
  notes?: string
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
    extraDrinksPrice: number
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
    duration: number
  }
  totalAmount: number
  paymentStatus: 'completed' | 'pending' | 'failed'
  timestamp: string
  type: 'checkout'
  waiterId: string
  waiterName: string
  createdAt: string
  updatedAt: string
}

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
}

type Order = SessionOrder | CheckoutOrder

interface SaveOrderResponse {
  success: boolean
  message: string
  filename?: string
  order?: Order
}

interface OrdersResponse {
  orders: Order[]
}

interface UpdateOrderData {
  status?: 'pending' | 'preparing' | 'ready' | 'served' | 'completed'
  waiterId?: string
  waiterName?: string
  notes?: string
  paymentStatus?: 'pending' | 'completed' | 'failed'
}

// Local file backup functions
async function saveOrderToFile(orderData: SessionOrder | CheckoutOrder): Promise<void> {
  try {
    const ordersDir = path.join(process.cwd(), 'order')
    
    // Ensure the orders directory exists
    if (!fs.existsSync(ordersDir)) {
      fs.mkdirSync(ordersDir, { recursive: true })
    }

    const filename = `order_${orderData.orderId}_${Date.now()}.json`
    const filepath = path.join(ordersDir, filename)
    
    // Write the order to file as backup
    fs.writeFileSync(filepath, JSON.stringify(orderData, null, 2))
  } catch (error) {
    console.error('Error saving order to file backup:', error)
    // Don't throw error for backup failure
  }
}

async function loadOrdersFromFiles(): Promise<(SessionOrder | CheckoutOrder)[]> {
  try {
    const ordersDir = path.join(process.cwd(), 'order')
    
    if (!fs.existsSync(ordersDir)) {
      return []
    }

    const files = fs.readdirSync(ordersDir)
    const orders: (SessionOrder | CheckoutOrder)[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filepath = path.join(ordersDir, file)
          const fileContent = fs.readFileSync(filepath, 'utf-8')
          const order = JSON.parse(fileContent)
          
          // Backward compatibility: generate tableId if missing
          if (!order.tableId && order.tableNumber) {
            order.tableId = `table-${order.tableNumber}`
          }
          
          orders.push(order)
        } catch (error) {
          console.error(`Error reading order file ${file}:`, error)
        }
      }
    }

    return orders
  } catch (error) {
    console.error('Error loading orders from files:', error)
    return []
  }
}

// Main helper functions with MongoDB primary and file backup
export async function saveOrder(orderData: SessionOrder | CheckoutOrder): Promise<SaveOrderResponse> {
  try {
    // Convert to MongoDB format
    const mongoOrder = convertToMongoOrder(orderData)
    
    // Try to save to MongoDB first
    try {
      const collection = await getOrdersCollection()
      const result = await collection.insertOne(mongoOrder)
      
      if (result.insertedId) {
         // Save to local file as backup
         await saveOrderToFile(orderData)
         return { success: true, orderId: orderData.orderId }
       }
     } catch (mongoError) {
       console.error('MongoDB save failed, falling back to file storage:', mongoError)
       
       // Fallback to file storage
       await saveOrderToFile(orderData)
       return { success: true, orderId: orderData.orderId }
     }
     
     return { success: false, error: 'Failed to save order' }
  } catch (error) {
    console.error('Error saving order:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save order'
    }
  }
}

// Get all orders with optional filters
export async function getOrders(filters?: {
  status?: string
  tableNumber?: number
  tableId?: string
  date?: string
  session?: string
  type?: 'session' | 'checkout'
}): Promise<OrdersResponse> {
  try {
    // Try to get from MongoDB first
    try {
      const collection = await getOrdersCollection()
      const query: any = {}
      
      if (filters?.status) query.status = filters.status
      if (filters?.tableNumber) query.tableNumber = filters.tableNumber
      if (filters?.tableId) query.tableId = filters.tableId
      if (filters?.date) query.date = filters.date
      if (filters?.session) query.session = filters.session
      if (filters?.type) query.type = filters.type
      
      const mongoOrders = await collection.find(query).toArray()
      const orders = mongoOrders.map(convertFromMongoOrder)
      
      return { orders }
    } catch (mongoError) {
      console.error('MongoDB fetch failed, falling back to file storage:', mongoError)
      
      // Fallback to file storage
      let orders = await loadOrdersFromFiles()
      
      // Apply filters
      if (filters?.status) {
        orders = orders.filter(order => order.status === filters.status)
      }
      if (filters?.tableNumber) {
        orders = orders.filter(order => order.tableNumber === filters.tableNumber)
      }
      if (filters?.tableId) {
        orders = orders.filter(order => order.tableId === filters.tableId)
      }
      if (filters?.date) {
        orders = orders.filter(order => order.date === filters.date)
      }
      if (filters?.session) {
        orders = orders.filter(order => order.session === filters.session)
      }
      if (filters?.type) {
        orders = orders.filter(order => order.type === filters.type)
      }
      
      return { orders }
    }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return { orders: [] }
  }
}

// Get a single order by ID
export async function getOrder(orderId: string): Promise<{ order?: Order }> {
  try {
    // Try to get from MongoDB first
    try {
      const collection = await getOrdersCollection()
      const mongoOrder = await collection.findOne({ orderId })
      
      if (mongoOrder) {
        const order = convertFromMongoOrder(mongoOrder)
        return { order }
      }
    } catch (mongoError) {
      console.error('MongoDB fetch failed, falling back to file storage:', mongoError)
    }
    
    // Fallback to file storage
    const orders = await loadOrdersFromFiles()
    const order = orders.find(o => o.orderId === orderId)
    
    return order ? { order } : {}
  } catch (error) {
    console.error('Error fetching order:', error)
    return {}
  }
}

// Update order status or other fields
export async function updateOrder(orderId: string, updateData: UpdateOrderData): Promise<SaveOrderResponse> {
  try {
    // Try to update in MongoDB first
    try {
      const collection = await getOrdersCollection()
      const result = await collection.updateOne(
        { orderId },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        }
      )
      
      if (result.modifiedCount > 0) {
         return { success: true, orderId }
       }
     } catch (mongoError) {
       console.error('MongoDB update failed:', mongoError)
     }
     
     return { success: false, error: 'Failed to update order' }
  } catch (error) {
    console.error('Error updating order:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update order'
    }
  }
}

// Delete an order
export async function deleteOrder(orderId: string): Promise<SaveOrderResponse> {
  try {
    // Try to delete from MongoDB first
    try {
      const collection = await getOrdersCollection()
      const result = await collection.deleteOne({ orderId })
      
      if (result.deletedCount > 0) {
         return { success: true, message: 'Order deleted successfully' }
       }
     } catch (mongoError) {
       console.error('MongoDB delete failed:', mongoError)
     }
     
     return { success: false, message: 'Failed to delete order' }
  } catch (error) {
    console.error('Error deleting order:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete order'
    }
  }
}

export type { 
  Order, 
  SessionOrder, 
  CheckoutOrder, 
  OrderItem, 
  SaveOrderResponse, 
  OrdersResponse, 
  UpdateOrderData 
}