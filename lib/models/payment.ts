import { ObjectId } from 'mongodb'

// Payment interface for MongoDB
export interface MongoPayment {
  _id?: ObjectId
  paymentId: string
  tableId: string
  tableNumber: number
  waiterId: string
  waiterName: string
  totalAmount: number
  sessionType: 'breakfast' | 'lunch' | 'dinner'
  sessionData: {
    adults: number
    children: number
    infants: number
    extraDrinks: boolean
    adultPrice: number
    childPrice: number
    infantPrice: number
    drinkPrice?: number
  }
  paymentDate: string
  paymentTime: string
  status: 'completed' | 'pending' | 'failed'
  paymentMethod: 'waiter' // Can be extended later for other methods
  createdAt: string
  updatedAt: string
}

// Frontend payment interface (with id instead of _id)
export interface Payment {
  id: string
  paymentId: string
  tableId: string
  tableNumber: number
  waiterId: string
  waiterName: string
  totalAmount: number
  sessionType: 'breakfast' | 'lunch' | 'dinner'
  sessionData: {
    adults: number
    children: number
    infants: number
    extraDrinks: boolean
    adultPrice: number
    childPrice: number
    infantPrice: number
    drinkPrice?: number
  }
  paymentDate: string
  paymentTime: string
  status: 'completed' | 'pending' | 'failed'
  paymentMethod: 'waiter'
  createdAt: string
  updatedAt: string
}

// Payment creation request interface
export interface CreatePaymentRequest {
  tableId: string
  tableNumber: number
  waiterId: string
  waiterName: string
  totalAmount: number
  sessionType: 'breakfast' | 'lunch' | 'dinner'
  sessionData: {
    adults: number
    children: number
    infants: number
    extraDrinks: boolean
    adultPrice: number
    childPrice: number
    infantPrice: number
    drinkPrice?: number
  }
}