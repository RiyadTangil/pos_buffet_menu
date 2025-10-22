import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { WaiterRequestPrintJob, WaiterRequestPrinterMapping, PrinterConfig, USBPrinterConfig } from '@/lib/models/printer'

const DATA_DIR = path.join(process.cwd(), 'data')
const WAITER_REQUEST_MAPPINGS_FILE = path.join(DATA_DIR, 'waiter-request-mappings.json')
const PRINTERS_FILE = path.join(DATA_DIR, 'printers.json')
const USB_PRINTERS_FILE = path.join(DATA_DIR, 'usb-printers.json')
const PRINT_JOBS_FILE = path.join(DATA_DIR, 'waiter-request-print-jobs.json')

// Read waiter request printer mappings
async function readWaiterRequestMappings(): Promise<WaiterRequestPrinterMapping[]> {
  try {
    const data = await fs.readFile(WAITER_REQUEST_MAPPINGS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Read IP printers
async function readIPPrinters(): Promise<PrinterConfig[]> {
  try {
    const data = await fs.readFile(PRINTERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Read USB printers
async function readUSBPrinters(): Promise<USBPrinterConfig[]> {
  try {
    const data = await fs.readFile(USB_PRINTERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save print job
async function savePrintJob(job: WaiterRequestPrintJob): Promise<void> {
  try {
    let jobs: WaiterRequestPrintJob[] = []
    try {
      const data = await fs.readFile(PRINT_JOBS_FILE, 'utf-8')
      jobs = JSON.parse(data)
    } catch {
      // File doesn't exist, start with empty array
    }
    
    jobs.push(job)
    await fs.writeFile(PRINT_JOBS_FILE, JSON.stringify(jobs, null, 2))
  } catch (error) {
    console.error('Error saving print job:', error)
  }
}

// Print to IP printer
async function printToIPPrinter(printer: PrinterConfig, content: string): Promise<boolean> {
  try {
    const net = require('net')
    const client = new net.Socket()

    return new Promise((resolve) => {
      client.connect(printer.port || 9100, printer.ipAddress, () => {
        client.write(content)
        client.end()
        resolve(true)
      })

      client.on('error', (error: any) => {
        console.error('IP printer error:', error)
        resolve(false)
      })

      client.on('close', () => {
        resolve(true)
      })
    })
  } catch (error) {
    console.error('Error printing to IP printer:', error)
    return false
  }
}

// Print to USB printer
async function printToUSBPrinter(printer: USBPrinterConfig, content: string): Promise<boolean> {
  try {
    // Use the existing USB printing logic
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/print-order-usb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        printerName: printer.localPrinterName,
        content: content,
        isWaiterRequest: true
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error printing to USB printer:', error)
    return false
  }
}

// Generate print content for waiter request
function generateWaiterRequestContent(tableNumber: number, requestType: string, message: string): string {
  const timestamp = new Date().toLocaleString()
  const requestTypeDisplay = requestType.charAt(0).toUpperCase() + requestType.slice(1)
  
  return `
================================
    WAITER REQUEST
================================

Table Number: ${tableNumber}
Request Type: ${requestTypeDisplay}
Time: ${timestamp}

Message:
${message}

================================
Please attend to this request
================================

`
}

// POST - Print waiter request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableNumber, requestType, message, requestId } = body

    if (!tableNumber || !requestType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: tableNumber, requestType, message' },
        { status: 400 }
      )
    }

    // Get printer mapping for this request type
    const mappings = await readWaiterRequestMappings()
    const mapping = mappings.find(m => m.requestType === requestType && m.isActive)

    if (!mapping) {
      return NextResponse.json(
        { error: `No active printer configured for ${requestType} requests` },
        { status: 404 }
      )
    }

    // Generate print content
    const content = generateWaiterRequestContent(tableNumber, requestType, message)

    // Create print job
    const printJob: WaiterRequestPrintJob = {
      id: `wrpj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId: requestId || `wr_${Date.now()}`,
      printerId: mapping.printerId,
      printerName: mapping.printerName,
      tableNumber,
      requestType: requestType as any,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    }

    let printSuccess = false

    if (mapping.connectionType === 'ip') {
      // Find IP printer
      const ipPrinters = await readIPPrinters()
      const printer = ipPrinters.find(p => p.id === mapping.printerId && p.isActive)
      
      if (printer) {
        printSuccess = await printToIPPrinter(printer, content)
      }
    } else if (mapping.connectionType === 'usb') {
      // Find USB printer
      const usbPrinters = await readUSBPrinters()
      const printer = usbPrinters.find(p => p.id === mapping.printerId && p.isActive)
      
      if (printer) {
        printSuccess = await printToUSBPrinter(printer, content)
      }
    }

    // Update print job status
    printJob.status = printSuccess ? 'completed' : 'failed'
    if (printSuccess) {
      printJob.printedAt = new Date().toISOString()
    } else {
      printJob.errorMessage = 'Failed to print to configured printer'
    }

    // Save print job
    await savePrintJob(printJob)

    if (printSuccess) {
      return NextResponse.json({
        success: true,
        printJobId: printJob.id,
        message: `Waiter request printed successfully to ${mapping.printerName}`
      })
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to print waiter request',
          printJobId: printJob.id
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error printing waiter request:', error)
    return NextResponse.json(
      { error: 'Internal server error while printing waiter request' },
      { status: 500 }
    )
  }
}