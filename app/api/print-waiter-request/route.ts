import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { WaiterRequestPrintJob, WaiterRequestPrinterMapping, PrinterConfig, USBPrinterConfig } from '@/lib/models/printer'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const DATA_DIR = path.join(process.cwd(), 'data')
const WAITER_REQUEST_MAPPINGS_FILE = path.join(DATA_DIR, 'waiter-request-mappings.json')
const PRINTERS_FILE = path.join(DATA_DIR, 'printers.json')
const USB_PRINTERS_FILE = path.join(DATA_DIR, 'usb-printers.json')
const PRINT_JOBS_FILE = path.join(DATA_DIR, 'waiter-request-print-jobs.json')

// Read waiter request printer mappings from MongoDB
async function readWaiterRequestMappings(): Promise<WaiterRequestPrinterMapping[]> {
  try {
    const db = await getDatabase()
    const mappings = await db.collection(COLLECTIONS.WAITER_REQUEST_MAPPINGS)
      .find({ isActive: true })
      .toArray()
    
    return mappings.map(mapping => ({
      ...mapping,
      _id: mapping._id.toString()
    }))
  } catch (error) {
    console.error('Error reading waiter request mappings from MongoDB:', error)
    // Fallback to JSON file
    try {
      const data = await fs.readFile(WAITER_REQUEST_MAPPINGS_FILE, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
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
async function printToUSBPrinter(printer: USBPrinterConfig, content: string, tableNumber: number, requestType: string): Promise<boolean> {
  try {
    // Create a mock order item for the waiter request
    const waiterRequestItem = {
      id: `wr_${Date.now()}`,
      name: `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Request`,
      quantity: 1,
      price: 0
    }

    // Use the existing USB printing logic with proper payload format
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/print-order-usb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: `waiter_request_${Date.now()}`,
        orderItems: [waiterRequestItem],
        tableNumber: tableNumber,
        guestCount: 1,
        orderTime: new Date().toISOString(),
        printerName: printer.localPrinterName
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
  const requestId = `wr_${Date.now()}`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Waiter Request - ${requestId}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          height: 100%;
          width: 100%;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          color: #000;
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        
        .request-container {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          background: white;
          border: 2px solid #000;
          padding: 20px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .header {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .restaurant-name {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        
        .request-type {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #d32f2f;
        }
        
        .request-info {
          margin-bottom: 20px;
          border-bottom: 1px dashed #000;
          padding-bottom: 15px;
        }
        
        .request-info div {
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }
        
        .request-info strong {
          font-weight: bold;
          min-width: 100px;
        }
        
        .message-section {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .message-header {
          font-weight: bold;
          margin-bottom: 10px;
          text-align: center;
          font-size: 16px;
        }
        
        .message-content {
          text-align: center;
          font-style: italic;
          min-height: 20px;
        }
        
        .status-section {
          text-align: center;
          padding: 15px;
          border: 2px solid #d32f2f;
          background-color: #ffebee;
          margin-bottom: 20px;
          border-radius: 5px;
        }
        
        .status-label {
          font-weight: bold;
          font-size: 16px;
          color: #d32f2f;
        }
        
        .footer {
          text-align: center;
          margin-top: 25px;
          font-size: 14px;
          border-top: 1px dashed #000;
          padding-top: 15px;
          font-weight: bold;
        }
        
        .footer div {
          margin-bottom: 5px;
        }
        
        .urgent {
          color: #d32f2f;
          font-weight: bold;
        }
        
        @media print {
          html, body {
            height: auto;
            margin: 0;
            padding: 0;
          }
          
          body {
            min-height: auto;
            padding: 10mm;
            justify-content: flex-start;
          }
          
          .request-container {
            border: none;
            box-shadow: none;
            max-width: none;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none;
          }
          
          @page {
            margin: 10mm;
            size: A4;
          }
        }
      </style>
    </head>
    <body>
      <div class="request-container">
        <div class="header">
          <div class="restaurant-name">BUFFET RESTAURANT</div>
          <div class="request-type">🔔 WAITER REQUEST 🔔</div>
        </div>
        
        <div class="request-info">
          <div><strong>Request ID:</strong> <span>${requestId}</span></div>
          <div><strong>Table Number:</strong> <span>${tableNumber}</span></div>
          <div><strong>Request Type:</strong> <span>${requestTypeDisplay}</span></div>
          <div><strong>Date & Time:</strong> <span>${timestamp}</span></div>
        </div>

        ${message ? `
        <div class="message-section">
          <div class="message-header">CUSTOMER MESSAGE</div>
          <div class="message-content">"${message}"</div>
        </div>
        ` : ''}

        <div class="status-section">
          <div class="status-label">STATUS: PENDING</div>
        </div>

        <div class="footer">
          <div class="urgent">⚠️ PLEASE ATTEND TO THIS REQUEST IMMEDIATELY ⚠️</div>
          <div>Printed: ${new Date().toLocaleString()}</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    </body>
    </html>
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
    console.log("mappings => ",mappings)
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
      // const usbPrinters = await readUSBPrinters()
    // console.log("usbPrinters => ",usbPrinters)
    //   const printer = usbPrinters.find(p => p.id === mapping.printerId& p.isActive)
      
      if (mappings) {
        printSuccess = await printToUSBPrinter(mappings, content, tableNumber, requestType)
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