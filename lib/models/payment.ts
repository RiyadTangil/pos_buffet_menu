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
    drinkPrice?: number // Keep for backward compatibility
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
  paymentDate: string
  paymentTime: string
  status: 'completed' | 'pending' | 'failed'
  paymentMethod: 'cash' | 'card' | 'waiter' // Payment method - cash, card or legacy waiter method
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
    drinkPrice?: number // Keep for backward compatibility
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
  paymentDate: string
  paymentTime: string
  status: 'completed' | 'pending' | 'failed'
  paymentMethod: 'cash' | 'card' | 'waiter'
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
  paymentMethod: 'cash' | 'card'
  sessionData: {
    adults: number
    children: number
    infants: number
    extraDrinks: boolean
    adultPrice: number
    childPrice: number
    infantPrice: number
    drinkPrice?: number // Keep for backward compatibility
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
}