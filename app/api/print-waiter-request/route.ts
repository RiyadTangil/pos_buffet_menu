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
    // Create a simplified waiter request content for USB printing
    const requestTypeInfo = {
      'waiter': 'REQUEST WAITER',
      'cleaning': 'REQUEST CLEANING', 
      'bill': 'REQUEST BILL'
    }
    
    const title = requestTypeInfo[requestType.toLowerCase() as keyof typeof requestTypeInfo] || 'SERVICE REQUEST'
    const timestamp = new Date().toLocaleString()
    
    // Create simplified content for USB printing
    const usbContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            font-size: 18px; 
            line-height: 1.6; 
            margin: 20px; 
            text-align: center;
          }
          .header { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .table { 
            font-size: 32px; 
            font-weight: bold; 
            margin: 20px 0; 
          }
          .timestamp { 
            font-size: 14px; 
            margin-top: 20px; 
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">${title}</div>
        <div class="table">TABLE ${tableNumber}</div>
        <div class="timestamp">${timestamp}</div>
      </body>
      </html>
    `

    // Use the existing USB printing logic with waiter request content
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/print-order-usb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: `waiter_request_${Date.now()}`,
        orderItems: [{
          id: `wr_${Date.now()}`,
          name: title,
          quantity: 1,
          price: 0
        }],
        tableNumber: tableNumber,
        guestCount: 1,
        orderTime: new Date().toISOString(),
        printerName: printer.localPrinterName,
        customContent: usbContent // Pass custom content for waiter requests
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
  const requestId = `WR-${Date.now().toString().slice(-6)}`
  
  // Get request type specific styling and icons
  const getRequestTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'waiter':
        return { icon: '👨‍💼', color: '#1976d2', bgColor: '#e3f2fd', label: 'WAITER ASSISTANCE' }
      case 'cleaning':
        return { icon: '🧹', color: '#388e3c', bgColor: '#e8f5e9', label: 'CLEANING SERVICE' }
      case 'bill':
        return { icon: '💳', color: '#7b1fa2', bgColor: '#f3e5f5', label: 'BILL REQUEST' }
      default:
        return { icon: '🔔', color: '#f57c00', bgColor: '#fff3e0', label: 'SERVICE REQUEST' }
    }
  }
  
  const typeInfo = getRequestTypeInfo(requestType)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Service Request - ${requestId}</title>
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
          font-family: 'Arial', sans-serif;
          font-size: 16px;
          line-height: 1.4;
          color: #333;
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 15px;
        }
        
        .service-alert {
          width: 100%;
          max-width: 350px;
          margin: 0 auto;
          background: white;
          border: 3px solid ${typeInfo.color};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .alert-header {
          background: ${typeInfo.color};
          color: white;
          text-align: center;
          padding: 20px 15px;
          position: relative;
        }
        
        .alert-icon {
          font-size: 48px;
          margin-bottom: 10px;
          display: block;
        }
        
        .alert-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .alert-subtitle {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .table-info {
          background: ${typeInfo.bgColor};
          padding: 25px 20px;
          text-align: center;
          border-bottom: 2px dashed ${typeInfo.color};
        }
        
        .table-number {
          font-size: 36px;
          font-weight: bold;
          color: ${typeInfo.color};
          margin-bottom: 8px;
        }
        
        .table-label {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .request-details {
          padding: 20px;
          background: white;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-weight: 600;
          color: #555;
          font-size: 14px;
        }
        
        .detail-value {
          font-weight: bold;
          color: ${typeInfo.color};
          font-size: 14px;
        }
        
        .message-box {
          margin: 15px 0;
          padding: 15px;
          background: #f8f9fa;
          border-left: 4px solid ${typeInfo.color};
          border-radius: 0 8px 8px 0;
        }
        
        .message-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .message-text {
          font-size: 16px;
          color: #333;
          font-style: italic;
          line-height: 1.4;
        }
        
        .priority-banner {
          background: linear-gradient(45deg, #ff5722, #ff9800);
          color: white;
          text-align: center;
          padding: 15px;
          margin: 15px 0;
          border-radius: 8px;
          animation: pulse 2s infinite;
        }
        
        .priority-text {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .timestamp-footer {
          background: #f5f5f5;
          padding: 15px 20px;
          text-align: center;
          border-top: 1px solid #ddd;
        }
        
        .timestamp {
          font-size: 12px;
          color: #666;
        }
        
        .request-id {
          font-size: 11px;
          color: #999;
          margin-top: 5px;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        @media print {
          html, body {
            height: auto;
            margin: 0;
            padding: 0;
          }
          
          body {
            min-height: auto;
            padding: 5mm;
            justify-content: flex-start;
          }
          
          .service-alert {
            border: 2px solid ${typeInfo.color};
            box-shadow: none;
            max-width: none;
            width: 100%;
            margin: 0;
          }
          
          .priority-banner {
            animation: none;
          }
          
          @page {
            margin: 5mm;
            size: A5;
          }
        }
      </style>
    </head>
    <body>
      <div class="service-alert">
        <div class="alert-header">
          <span class="alert-icon">${typeInfo.icon}</span>
          <div class="alert-title">${typeInfo.label}</div>
          <div class="alert-subtitle">Customer Service Request</div>
        </div>
        
        <div class="table-info">
          <div class="table-number">TABLE ${tableNumber}</div>
          <div class="table-label">Requires Attention</div>
        </div>
        
        <div class="request-details">
          <div class="detail-row">
            <span class="detail-label">Request Type:</span>
            <span class="detail-value">${requestTypeDisplay}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time Requested:</span>
            <span class="detail-value">${new Date().toLocaleTimeString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${new Date().toLocaleDateString()}</span>
          </div>

          ${message ? `
          <div class="message-box">
            <div class="message-label">Customer Message:</div>
            <div class="message-text">"${message}"</div>
          </div>
          ` : ''}

          <div class="priority-banner">
            <div class="priority-text">⚡ IMMEDIATE ATTENTION REQUIRED ⚡</div>
          </div>
        </div>
        
        <div class="timestamp-footer">
          <div class="timestamp">Printed: ${timestamp}</div>
          <div class="request-id">Request ID: ${requestId}</div>
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