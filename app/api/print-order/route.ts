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
  console.log('🖨️ [API] Grouping items by category...')
  console.log('🖨️ [API] Input order items:', orderItems)
  
  const categoryGroups = new Map<string, any[]>()
  
  for (const item of orderItems) {
    const categoryId = item.categoryId || item.category?.id || 'uncategorized'
    console.log(`🖨️ [API] Item: ${item.name}, Category ID: ${categoryId}`)
    
    if (!categoryGroups.has(categoryId)) {
      categoryGroups.set(categoryId, [])
    }
    
    categoryGroups.get(categoryId)!.push(item)
  }
  
  console.log('🖨️ [API] Final category groups:', Array.from(categoryGroups.entries()))
  return categoryGroups
}

// Find printers for a category
function findPrintersForCategory(categoryId: string, mappings: CategoryPrinterMapping[], printers: PrinterConfig[]): PrinterConfig[] {
  console.log(`🖨️ [API] Finding printers for category: ${categoryId}`)
  console.log(`🖨️ [API] Available mappings:`, mappings)
  console.log(`🖨️ [API] Available printers:`, printers)
  
  // Find all active mappings for this category
  const categoryMappings = mappings
    .filter(m => m.categoryId === categoryId && m.isActive)
    .sort((a, b) => (a.priority || 1) - (b.priority || 1)) // Sort by priority (lower number = higher priority)
  
  console.log(`🖨️ [API] Active mappings for category ${categoryId}:`, categoryMappings)
  
  // Get corresponding printers
  const categoryPrinters: PrinterConfig[] = []
  for (const mapping of categoryMappings) {
    const printer = printers.find(p => p.id === mapping.printerId && p.isActive)
    console.log(`🖨️ [API] Looking for printer ID ${mapping.printerId}, found:`, printer)
    if (printer) {
      categoryPrinters.push(printer)
    }
  }
  
  console.log(`🖨️ [API] Final printers for category ${categoryId}:`, categoryPrinters)
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
  console.log('🖨️ [API] Starting print-order API request...')
  
  try {
    const body = await request.json()
    const { orderId, orderItems, tableNumber, guestCount, orderTime } = body

    console.log('🖨️ [API] Request body:', { orderId, orderItems, tableNumber, guestCount, orderTime })

    // Validation
    if (!orderId || !orderItems || !Array.isArray(orderItems)) {
      console.log('🖨️ [API] ❌ Validation failed: Missing orderId or orderItems')
      return NextResponse.json(
        { success: false, error: 'Order ID and order items are required' },
        { status: 400 }
      )
    }

    if (orderItems.length === 0) {
      console.log('🖨️ [API] ❌ Validation failed: Empty order items')
      return NextResponse.json(
        { success: false, error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Load configuration data
    console.log('🖨️ [API] Loading configuration data...')
    const printers = loadPrinters()
    const mappings = loadMappings()
    const printJobs = loadPrintJobs()

    console.log('🖨️ [API] Loaded printers:', printers)
    console.log('🖨️ [API] Loaded mappings:', mappings)
    console.log('🖨️ [API] Existing print jobs count:', printJobs.length)

    if (printers.length === 0) {
      console.log('🖨️ [API] ❌ No printers configured')
      return NextResponse.json(
        { success: false, error: 'No printers configured. Please set up printers first.' },
        { status: 400 }
      )
    }

    // Group items by category
    console.log('🖨️ [API] Grouping items by category...')
    const categoryGroups = groupItemsByCategory(orderItems)
    console.log('🖨️ [API] Category groups:', Array.from(categoryGroups.entries()))
    
    const createdPrintJobs: PrintJob[] = []
    const errors: string[] = []

    // Process each category group
    console.log('🖨️ [API] Processing each category group...')
    for (const [categoryId, items] of categoryGroups) {
      console.log(`🖨️ [API] Processing category: ${categoryId} with ${items.length} items`)
      
      const categoryPrinters = findPrintersForCategory(categoryId, mappings, printers)
      console.log(`🖨️ [API] Found printers for category ${categoryId}:`, categoryPrinters)
      
      if (categoryPrinters.length === 0) {
        const errorMsg = `No active printer found for category: ${categoryId}`
        console.log(`🖨️ [API] ❌ ${errorMsg}`)
        errors.push(errorMsg)
        continue
      }

      // Use the first (highest priority) printer for this category
      const selectedPrinter = categoryPrinters[0]
      console.log(`🖨️ [API] Selected printer for category ${categoryId}:`, selectedPrinter)
      
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

      console.log(`🖨️ [API] Created print job for category ${categoryId}:`, printJob)
      printJobs.push(printJob)
      createdPrintJobs.push(printJob)

      // Start processing the print job
      console.log(`🖨️ [API] Starting print job processing for job ID: ${printJob.id}`)
      simulatePrintJobProcessing(printJob.id)
    }

    // Save updated print jobs
    console.log('🖨️ [API] Saving updated print jobs...')
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
      console.log('🖨️ [API] ⚠️ Warnings:', errors)
    }

    console.log('🖨️ [API] ✅ Print order API completed successfully:', response)
    return NextResponse.json(response)
  } catch (error) {
    console.error('🖨️ [API] ❌ Error printing order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to print order' },
      { status: 500 }
    )
  }
}