// Printer system models for buffet restaurant

export interface PrinterConfig {
  id: string
  name: string
  connectionType: 'ip' | 'usb'
  // IP printer fields
  ipAddress?: string
  port?: number
  // USB printer fields
  localPrinterName?: string
  // Common fields
  type: 'thermal' | 'inkjet' | 'laser'
  isActive: boolean
  categories: string[] // Array of category IDs this printer serves
  createdAt: string
  updatedAt: string
}

export interface USBPrinterConfig {
  id: string
  name: string
  localPrinterName: string
  displayName: string
  type: 'thermal' | 'inkjet' | 'laser'
  isActive: boolean
  categories: string[] // Array of category IDs this printer serves
  isDefault: boolean
  status: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface PrintJob {
  id: string
  orderId: string
  printerId: string
  printerName: string
  categories: string[] // Array of category IDs this print job covers
  tableNumber: number
  session: 'breakfast' | 'lunch' | 'dinner'
  items: PrintJobItem[]
  status: 'pending' | 'printing' | 'completed' | 'failed'
  createdAt: string
  printedAt?: string
  errorMessage?: string
  retryCount: number
}

export interface PrintJobItem {
  id: string
  name: string
  quantity: number
  category: string
  categoryName: string
  notes?: string
}

export interface PrintTemplate {
  header: string
  footer: string
  showDateTime: boolean
  showTableNumber: boolean
  showSession: boolean
  showOrderId: boolean
  paperWidth: number // in characters
  fontSize: 'small' | 'medium' | 'large'
}

export interface CategoryPrinterMapping {
  categoryId: string
  categoryName: string
  printerId: string
  printerName: string
}

// Waiter request types and models
export type WaiterRequestType = 'waiter' | 'cleaning' | 'bill'

export interface WaiterRequest {
  id: string
  tableNumber: number
  requestType: WaiterRequestType
  message: string
  status: 'pending' | 'acknowledged' | 'completed'
  createdAt: string
  acknowledgedAt?: string
  completedAt?: string
}

export interface WaiterRequestPrinterMapping {
  requestType: WaiterRequestType
  printerId: string
  printerName: string
  connectionType: 'ip' | 'usb'
  isActive: boolean
}

export interface WaiterRequestPrintJob {
  id: string
  requestId: string
  printerId: string
  printerName: string
  tableNumber: number
  requestType: WaiterRequestType
  message: string
  status: 'pending' | 'printing' | 'completed' | 'failed'
  createdAt: string
  printedAt?: string
  errorMessage?: string
  retryCount: number
}

// Default printer configuration
export const defaultPrinterConfig: Omit<PrinterConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Printer',
  connectionType: 'ip',
  ipAddress: '192.168.1.100',
  port: 9100,
  type: 'thermal',
  isActive: true,
  categories: []
}

export const defaultUSBPrinterConfig: Omit<USBPrinterConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default USB Printer',
  localPrinterName: '',
  displayName: '',
  type: 'thermal',
  isActive: true,
  categories: [],
  isDefault: false,
  status: 'Ready'
}

// Default print template
export const defaultPrintTemplate: PrintTemplate = {
  header: 'KALA BUFFET RESTAURANT',
  footer: 'Thank you for dining with us!',
  showDateTime: true,
  showTableNumber: true,
  showSession: true,
  showOrderId: true,
  paperWidth: 32,
  fontSize: 'medium'
}