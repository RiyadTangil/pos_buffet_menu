import { ObjectId } from 'mongodb'

// Base order interface for MongoDB
export interface MongoOrder {
  _id?: ObjectId
  orderId: string
  tableId: string
  tableNumber: number
  totalAmount: number
  timestamp: string
  type: 'session' | 'checkout'
  createdAt: string
  updatedAt: string
}

// Session order interface for MongoDB
export interface MongoSessionOrder extends MongoOrder {
  type: 'session'
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
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed'
  waiterId?: string
  waiterName?: string
  notes?: string
}

// Checkout order interface for MongoDB
export interface MongoCheckoutOrder extends MongoOrder {
  type: 'checkout'
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
  paymentStatus: 'completed' | 'pending' | 'failed'
  waiterId: string
  waiterName: string
}

// Union type for all MongoDB orders
export type MongoOrderDocument = MongoSessionOrder | MongoCheckoutOrder

// Helper functions to convert between API types and MongoDB types
export function convertToMongoOrder(order: any): MongoOrderDocument {
  const baseOrder = {
    orderId: order.orderId,
    tableId: order.tableId || `table-${order.tableNumber}`,
    tableNumber: order.tableNumber,
    totalAmount: order.totalAmount,
    timestamp: order.timestamp || new Date().toISOString(),
    type: order.type,
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || new Date().toISOString()
  }

  if (order.type === 'session') {
    return {
      ...baseOrder,
      type: 'session',
      items: order.items,
      sessionInfo: order.sessionInfo,
      status: order.status || 'pending',
      waiterId: order.waiterId,
      waiterName: order.waiterName,
      notes: order.notes
    } as MongoSessionOrder
  } else {
    return {
      ...baseOrder,
      type: 'checkout',
      sessionData: order.sessionData,
      paymentStatus: order.paymentStatus || 'completed',
      waiterId: order.waiterId,
      waiterName: order.waiterName
    } as MongoCheckoutOrder
  }
}

export function convertFromMongoOrder(mongoOrder: MongoOrderDocument): any {
  const { _id, ...order } = mongoOrder
  return order
}

// Validation functions
export function validateSessionOrder(order: any): order is MongoSessionOrder {
  return (
    order.type === 'session' &&
    Array.isArray(order.items) &&
    order.sessionInfo &&
    typeof order.sessionInfo.adults === 'number' &&
    typeof order.sessionInfo.children === 'number' &&
    typeof order.sessionInfo.infants === 'number'
  )
}

export function validateCheckoutOrder(order: any): order is MongoCheckoutOrder {
  return (
    order.type === 'checkout' &&
    order.sessionData &&
    typeof order.sessionData.adults === 'number' &&
    typeof order.sessionData.children === 'number' &&
    typeof order.sessionData.infants === 'number' &&
    typeof order.waiterId === 'string'
  )
}