import { MongoClient, Db } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

// Database helper functions
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise
  return client.db('buffet') // Using the database name 'buffet' as specified
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  TABLES: 'tables',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
  SETTINGS: 'settings',
  PRINTERS: 'printers',
  PRINT_JOBS: 'print_jobs',
  CATEGORY_PRINTER_MAPPINGS: 'category_printer_mappings',
  DEVICE_SESSIONS: 'device_sessions',
  SYNCHRONIZED_GROUPS: 'synchronized_groups',
  RBAC: 'rbac'
} as const

// Helper function to get a specific collection
export async function getCollection(collectionName: string) {
  const db = await getDatabase()
  return db.collection(collectionName)
}

// Collection-specific database operations
export async function getUsersCollection() {
  return await getCollection(COLLECTIONS.USERS)
}

export async function getOrdersCollection() {
  return await getCollection(COLLECTIONS.ORDERS)
}

export async function getCategoriesCollection() {
  return await getCollection(COLLECTIONS.CATEGORIES)
}

export async function getProductsCollection() {
  return await getCollection(COLLECTIONS.PRODUCTS)
}

export async function getTablesCollection() {
  return await getCollection(COLLECTIONS.TABLES)
}

export async function getSettingsCollection() {
  return await getCollection(COLLECTIONS.SETTINGS)
}

export async function getRBACCollection() {
  return await getCollection(COLLECTIONS.RBAC)
}