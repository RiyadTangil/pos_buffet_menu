import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PrintJob, PrinterConfig, CategoryPrinterMapping, PrintJobItem } from '@/lib/models/printer'

// File paths
const printersFilePath = path.join(process.cwd(), 'data', 'printers.json')
const mappingsFilePath = path.join(process.cwd(), 'data', 'category-printer-mappings.json')
const printJobsFilePath = path.join(process.cwd(), 'data', 'print-jobs.json')

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load data from files
function loadPrinters(): PrinterConfig[] {
  try {
    ensureDataDirectory()
    if (fs.existsSync(printersFilePath)) {
      const data = fs.readFileSync(printersFilePath, 'utf8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error loading printers:', error)
    return []
  }
}

function loadMappings(): CategoryPrinterMapping[] {
  try {
    ensureDataDirectory()
    if (fs.existsSync(mappingsFilePath)) {
      const data = fs.readFileSync(mappingsFilePath, 'utf8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error loading mappings:', error)
    return []
  }
}

function loadPrintJobs(): PrintJob[] {
  try {
    ensureDataDirectory()
    if (fs.existsSync(printJobsFilePath)) {
      const data = fs.readFileSync(printJobsFilePath, 'utf8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error loading print jobs:', error)
    return []
  }
}

function savePrintJobs(printJobs: PrintJob[]) {
  try {
    ensureDataDirectory()
    fs.writeFileSync(printJobsFilePath, JSON.stringify(printJobs, null, 2))
  } catch (error) {
    console.error('Error saving print jobs:', error)
    throw error
  }
}

// Generate unique ID
function generateId(): string {
  return `print-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Group order items by category
function groupItemsByCategory(orderItems: any[]): Map<string, any[]> {
  const categoryGroups = new Map<string, any[]>()
  
  for (const item of orderItems) {
    const categoryId = item.categoryId || item.category?.id || 'uncategorized'
    
    if (!categoryGroups.has(categoryId)) {
      categoryGroups.set(categoryId, [])
    }
    
    categoryGroups.get(categoryId)!.push(item)
  }
  
  return categoryGroups
}

// Find printers for a category
function findPrintersForCategory(categoryId: string, mappings: CategoryPrinterMapping[], printers: PrinterConfig[]): PrinterConfig[] {
  // Find all active mappings for this category
  const categoryMappings = mappings
    .filter(m => m.categoryId === categoryId && m.isActive)
    .sort((a, b) => (a.priority || 1) - (b.priority || 1)) // Sort by priority (lower number = higher priority)
  
  // Get corresponding printers
  const categoryPrinters: PrinterConfig[] = []
  for (const mapping of categoryMappings) {
    const printer = printers.find(p => p.id === mapping.printerId && p.isActive)
    if (printer) {
      categoryPrinters.push(printer)
    }
  }
  
  return categoryPrinters
}

// Create print job items from order items
function createPrintJobItems(orderItems: any[]): PrintJobItem[] {
  return orderItems.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    notes: item.notes || '',
    categoryId: item.categoryId || item.category?.id,
    categoryName: item.category?.name || 'Unknown Category'
  }))
}

// Simulate print job processing
function simulatePrintJobProcessing(jobId: string) {
  setTimeout(() => {
    try {
      const printJobs = loadPrintJobs()
      const jobIndex = printJobs.findIndex(job => job.id === jobId)
      
      if (jobIndex !== -1) {
        // Simulate processing time and random success/failure
        const success = Math.random() > 0.1 // 90% success rate
        
        if (success) {
          printJobs[jobIndex].status = 'completed'
          printJobs[jobIndex].completedAt = new Date().toISOString()
        } else {
          printJobs[jobIndex].status = 'failed'
          printJobs[jobIndex].error = 'Simulated printer communication error'
          printJobs[jobIndex].retryCount = (printJobs[jobIndex].retryCount || 0) + 1
        }
        
        savePrintJobs(printJobs)
      }
    } catch (error) {
      console.error('Error processing print job:', error)
    }
  }, Math.random() * 3000 + 1000) // Random delay between 1-4 seconds
}

// POST - Print order by distributing items to category-specific printers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, orderItems, tableNumber, guestCount, orderTime } = body

    // Validation
    if (!orderId || !orderItems || !Array.isArray(orderItems)) {
      return NextResponse.json(
        { success: false, error: 'Order ID and order items are required' },
        { status: 400 }
      )
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Load configuration data
    const printers = loadPrinters()
    const mappings = loadMappings()
    const printJobs = loadPrintJobs()

    if (printers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No printers configured. Please set up printers first.' },
        { status: 400 }
      )
    }

    // Group items by category
    const categoryGroups = groupItemsByCategory(orderItems)
    const createdPrintJobs: PrintJob[] = []
    const errors: string[] = []

    // Process each category group
    for (const [categoryId, items] of categoryGroups) {
      const categoryPrinters = findPrintersForCategory(categoryId, mappings, printers)
      
      if (categoryPrinters.length === 0) {
        errors.push(`No active printer found for category: ${categoryId}`)
        continue
      }

      // Use the first (highest priority) printer for this category
      const selectedPrinter = categoryPrinters[0]
      
      // Create print job
      const printJob: PrintJob = {
        id: generateId(),
        printerId: selectedPrinter.id,
        orderId,
        items: createPrintJobItems(items),
        template: 'kitchen-order',
        status: 'pending',
        retryCount: 0,
        metadata: {
          tableNumber: tableNumber || 'Unknown',
          guestCount: guestCount || 1,
          orderTime: orderTime || new Date().toISOString(),
          categoryId,
          printerName: selectedPrinter.name,
          categories: selectedPrinter.categories
        },
        createdAt: new Date().toISOString()
      }

      printJobs.push(printJob)
      createdPrintJobs.push(printJob)

      // Start processing the print job
      simulatePrintJobProcessing(printJob.id)
    }

    // Save updated print jobs
    savePrintJobs(printJobs)

    // Prepare response
    const response: any = {
      success: true,
      data: createdPrintJobs,
      message: `Created ${createdPrintJobs.length} print job(s) for order ${orderId}`
    }

    if (errors.length > 0) {
      response.warnings = errors
      response.message += `. Warning: ${errors.length} category(ies) could not be printed.`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error printing order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to print order' },
      { status: 500 }
    )
  }
}