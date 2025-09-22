import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PrinterConfig, defaultPrinterConfig } from '@/lib/models/printer'

// File path for storing printer configurations
const printersFilePath = path.join(process.cwd(), 'data', 'printers.json')

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load printers from file
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

// Save printers to file
function savePrinters(printers: PrinterConfig[]) {
  try {
    ensureDataDirectory()
    fs.writeFileSync(printersFilePath, JSON.stringify(printers, null, 2))
  } catch (error) {
    console.error('Error saving printers:', error)
    throw error
  }
}

// Generate unique ID
function generateId(): string {
  return `printer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// GET - Fetch all printers
export async function GET(request: NextRequest) {
  try {
    const printers = loadPrinters()
    
    return NextResponse.json({
      success: true,
      data: printers
    })
  } catch (error) {
    console.error('Error fetching printers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch printers' },
      { status: 500 }
    )
  }
}

// POST - Create new printer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, ipAddress, port, type, categories } = body

    // Validation
    if (!name || !ipAddress || !port || !type) {
      return NextResponse.json(
        { success: false, error: 'Name, IP address, port, and type are required' },
        { status: 400 }
      )
    }

    // Validate categories array
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { success: false, error: 'Categories must be provided as an array' },
        { status: 400 }
      )
    }

    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid IP address format' },
        { status: 400 }
      )
    }

    // Validate port
    if (port < 1 || port > 65535) {
      return NextResponse.json(
        { success: false, error: 'Port must be between 1 and 65535' },
        { status: 400 }
      )
    }

    const printers = loadPrinters()
    
    // Check if printer with same IP and port already exists
    const existingPrinter = printers.find(p => p.ipAddress === ipAddress && p.port === port)
    if (existingPrinter) {
      return NextResponse.json(
        { success: false, error: 'Printer with this IP address and port already exists' },
        { status: 400 }
      )
    }

    const newPrinter: PrinterConfig = {
      id: generateId(),
      name,
      ipAddress,
      port: parseInt(port),
      type,
      isActive: body.isActive !== undefined ? body.isActive : true,
      categories: categories || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    printers.push(newPrinter)
    savePrinters(printers)

    return NextResponse.json({
      success: true,
      data: newPrinter,
      message: 'Printer created successfully'
    })
  } catch (error) {
    console.error('Error creating printer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create printer' },
      { status: 500 }
    )
  }
}

// PUT - Update printer (handled in [id]/route.ts)
// DELETE - Delete printer (handled in [id]/route.ts)