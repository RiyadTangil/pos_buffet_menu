// Mock data for buffet restaurant menu portal

export interface Table {
  id: string
  number: number
  status: "available" | "occupied" | "cleaning" | "selected"
  capacity: number
  currentGuests: number
  createdAt?: string
  updatedAt?: string
  currentOrders?: number
  totalItems?: number
}

export interface BuffetSession {
  id: string
  name: string
  startTime: string
  endTime: string
  pricePerAdult: number
  pricePerChild: number
  pricePerInfant: number
  duration: number // in minutes
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  price: number
  limitPerOrder: number
  description?: string
  isVegetarian?: boolean
  isSpicy?: boolean
}

export interface OrderItem {
  menuItemId: string
  quantity: number
  notes?: string
}

export interface Order {
  orderId: string
  tableId: string
  sessionId: string
  items: OrderItem[]
  status: "pending" | "preparing" | "ready" | "served" | "completed"
  totalAmount: number
  createdAt: string
  updatedAt: string
}

// Tables data
export const tables: Table[] = [
  { id: "table-1", number: 1, status: "available", capacity: 4, currentGuests: 0 },
  { id: "table-2", number: 2, status: "occupied", capacity: 6, currentGuests: 4 },
  { id: "table-3", number: 3, status: "available", capacity: 2, currentGuests: 0 },
  { id: "table-4", number: 4, status: "cleaning", capacity: 8, currentGuests: 0 },
  { id: "table-5", number: 5, status: "selected", capacity: 4, currentGuests: 3 },
  { id: "table-6", number: 6, status: "occupied", capacity: 6, currentGuests: 5 },
  { id: "table-7", number: 7, status: "available", capacity: 4, currentGuests: 0 },
  { id: "table-8", number: 8, status: "available", capacity: 2, currentGuests: 0 },
  { id: "table-9", number: 9, status: "occupied", capacity: 8, currentGuests: 6 },
  { id: "table-10", number: 10, status: "available", capacity: 4, currentGuests: 0 },
]

// Buffet sessions data
export const buffetSessions: BuffetSession[] = [
  {
    id: "session-breakfast",
    name: "Breakfast Buffet",
    startTime: "07:00",
    endTime: "10:30",
    pricePerAdult: 25.99,
    pricePerChild: 15.99,
    pricePerInfant: 0,
    duration: 210, // 3.5 hours
  },
  {
    id: "session-lunch",
    name: "Lunch Buffet",
    startTime: "11:30",
    endTime: "15:00",
    pricePerAdult: 35.99,
    pricePerChild: 22.99,
    pricePerInfant: 0,
    duration: 210, // 3.5 hours
  },
  {
    id: "session-dinner",
    name: "Dinner Buffet",
    startTime: "17:30",
    endTime: "22:00",
    pricePerAdult: 49.99,
    pricePerChild: 29.99,
    pricePerInfant: 0,
    duration: 270, // 4.5 hours
  },
]

// Menu categories data
export const menuCategories: MenuCategory[] = [
  {
    id: "category-starters",
    name: "Starters",
    description: "Fresh appetizers and light bites to begin your meal",
  },
  {
    id: "category-main",
    name: "Main Course",
    description: "Hearty main dishes featuring international cuisine",
  },
  {
    id: "category-desserts",
    name: "Desserts",
    description: "Sweet treats and delectable desserts",
  },
  {
    id: "category-drinks",
    name: "Drinks",
    description: "Refreshing beverages and specialty drinks",
  },
]

// Menu items data
export const menuItems: MenuItem[] = [
  // Starters
  {
    id: "item-1",
    categoryId: "category-starters",
    name: "Caesar Salad",
    price: 8.99,
    limitPerOrder: 2,
    description: "Crisp romaine lettuce with parmesan and croutons",
    isVegetarian: true,
  },
  {
    id: "item-2",
    categoryId: "category-starters",
    name: "Buffalo Wings",
    price: 12.99,
    limitPerOrder: 3,
    description: "Spicy chicken wings with blue cheese dip",
    isSpicy: true,
  },
  {
    id: "item-3",
    categoryId: "category-starters",
    name: "Bruschetta",
    price: 7.99,
    limitPerOrder: 2,
    description: "Toasted bread with fresh tomatoes and basil",
    isVegetarian: true,
  },
  {
    id: "item-4",
    categoryId: "category-starters",
    name: "Shrimp Cocktail",
    price: 14.99,
    limitPerOrder: 2,
    description: "Fresh shrimp served with cocktail sauce",
  },

  // Main Course
  {
    id: "item-5",
    categoryId: "category-main",
    name: "Grilled Salmon",
    price: 24.99,
    limitPerOrder: 1,
    description: "Atlantic salmon with lemon herb seasoning",
  },
  {
    id: "item-6",
    categoryId: "category-main",
    name: "Beef Tenderloin",
    price: 32.99,
    limitPerOrder: 1,
    description: "Premium cut beef cooked to perfection",
  },
  {
    id: "item-7",
    categoryId: "category-main",
    name: "Chicken Tikka Masala",
    price: 18.99,
    limitPerOrder: 1,
    description: "Creamy curry with tender chicken pieces",
    isSpicy: true,
  },
  {
    id: "item-8",
    categoryId: "category-main",
    name: "Vegetable Stir Fry",
    price: 15.99,
    limitPerOrder: 1,
    description: "Fresh seasonal vegetables in garlic sauce",
    isVegetarian: true,
  },
  {
    id: "item-9",
    categoryId: "category-main",
    name: "Lobster Thermidor",
    price: 38.99,
    limitPerOrder: 1,
    description: "Lobster in rich cream sauce with cheese",
  },

  // Desserts
  {
    id: "item-10",
    categoryId: "category-desserts",
    name: "Chocolate Lava Cake",
    price: 9.99,
    limitPerOrder: 2,
    description: "Warm chocolate cake with molten center",
    isVegetarian: true,
  },
  {
    id: "item-11",
    categoryId: "category-desserts",
    name: "Tiramisu",
    price: 8.99,
    limitPerOrder: 2,
    description: "Classic Italian coffee-flavored dessert",
    isVegetarian: true,
  },
  {
    id: "item-12",
    categoryId: "category-desserts",
    name: "Fresh Fruit Tart",
    price: 7.99,
    limitPerOrder: 2,
    description: "Seasonal fruits on vanilla custard base",
    isVegetarian: true,
  },
  {
    id: "item-13",
    categoryId: "category-desserts",
    name: "Ice Cream Sundae",
    price: 6.99,
    limitPerOrder: 3,
    description: "Three scoops with toppings of your choice",
    isVegetarian: true,
  },

  // Drinks
  {
    id: "item-14",
    categoryId: "category-drinks",
    name: "Fresh Orange Juice",
    price: 4.99,
    limitPerOrder: 3,
    description: "Freshly squeezed orange juice",
    isVegetarian: true,
  },
  {
    id: "item-15",
    categoryId: "category-drinks",
    name: "Coffee",
    price: 3.99,
    limitPerOrder: 5,
    description: "Premium roasted coffee beans",
    isVegetarian: true,
  },
  {
    id: "item-16",
    categoryId: "category-drinks",
    name: "Sparkling Water",
    price: 2.99,
    limitPerOrder: 4,
    description: "Refreshing sparkling mineral water",
    isVegetarian: true,
  },
  {
    id: "item-17",
    categoryId: "category-drinks",
    name: "House Wine",
    price: 8.99,
    limitPerOrder: 2,
    description: "Selection of red or white wine",
  },
]

// Example orders data
export const orders: Order[] = [
  {
    orderId: "order-1",
    tableId: "table-2",
    sessionId: "session-lunch",
    items: [
      { menuItemId: "item-1", quantity: 1, notes: "Extra croutons" },
      { menuItemId: "item-5", quantity: 1 },
      { menuItemId: "item-10", quantity: 1 },
      { menuItemId: "item-15", quantity: 2 },
    ],
    status: "preparing",
    totalAmount: 47.96,
    createdAt: "2024-01-15T12:30:00Z",
    updatedAt: "2024-01-15T12:35:00Z",
  },
  {
    orderId: "order-2",
    tableId: "table-6",
    sessionId: "session-dinner",
    items: [
      { menuItemId: "item-2", quantity: 1 },
      { menuItemId: "item-6", quantity: 1 },
      { menuItemId: "item-9", quantity: 1 },
      { menuItemId: "item-11", quantity: 1 },
      { menuItemId: "item-17", quantity: 1 },
    ],
    status: "ready",
    totalAmount: 93.95,
    createdAt: "2024-01-15T18:45:00Z",
    updatedAt: "2024-01-15T19:15:00Z",
  },
  {
    orderId: "order-3",
    tableId: "table-9",
    sessionId: "session-breakfast",
    items: [
      { menuItemId: "item-3", quantity: 2 },
      { menuItemId: "item-8", quantity: 1 },
      { menuItemId: "item-14", quantity: 2 },
      { menuItemId: "item-15", quantity: 1 },
    ],
    status: "served",
    totalAmount: 39.95,
    createdAt: "2024-01-15T08:20:00Z",
    updatedAt: "2024-01-15T08:45:00Z",
  },
  {
    orderId: "order-4",
    tableId: "table-5",
    sessionId: "session-lunch",
    items: [
      { menuItemId: "item-4", quantity: 1 },
      { menuItemId: "item-7", quantity: 1 },
      { menuItemId: "item-12", quantity: 1 },
      { menuItemId: "item-16", quantity: 2 },
    ],
    status: "pending",
    totalAmount: 47.95,
    createdAt: "2024-01-15T13:10:00Z",
    updatedAt: "2024-01-15T13:10:00Z",
  },
]

export const exampleOrders = orders

// Helper functions to work with the data
export const getTableById = (id: string): Table | undefined => {
  return tables.find((table) => table.id === id)
}

export const getMenuItemsByCategory = (categoryId: string): MenuItem[] => {
  return menuItems.filter((item) => item.categoryId === categoryId)
}

export const getOrdersByTable = (tableId: string): Order[] => {
  return orders.filter((order) => order.tableId === tableId)
}

export const getActiveSession = (): BuffetSession | undefined => {
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  return buffetSessions.find((session) => {
    const [startHour, startMin] = session.startTime.split(":").map(Number)
    const [endHour, endMin] = session.endTime.split(":").map(Number)
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    return currentTime >= startTime && currentTime <= endTime
  })
}
