// Printer system models for buffet restaurant

export interface PrinterConfig {
  id: string
  name: string
  ipAddress: string
  port: number
  type: 'thermal' | 'inkjet' | 'laser'
  isActive: boolean
  categories: string[] // Array of category IDs this printer serves
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

// Default printer configuration
export const defaultPrinterConfig: Omit<PrinterConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Printer',
  ipAddress: '192.168.1.100',
  port: 9100,
  type: 'thermal',
  isActive: true,
  categories: []
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