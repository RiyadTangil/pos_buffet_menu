import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PrinterConfig } from '@/lib/models/printer'

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

// GET - Fetch single printer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const printers = loadPrinters()
    
    const printer = printers.find(p => p.id === id)
    if (!printer) {
      return NextResponse.json(
        { success: false, error: 'Printer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: printer
    })
  } catch (error) {
    console.error('Error fetching printer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch printer' },
      { status: 500 }
    )
  }
}

// PUT - Update printer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const printers = loadPrinters()
    
    const printerIndex = printers.findIndex(p => p.id === id)
    if (printerIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Printer not found' },
        { status: 404 }
      )
    }

    // Validate IP address if provided
    if (body.ipAddress) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      if (!ipRegex.test(body.ipAddress)) {
        return NextResponse.json(
          { success: false, error: 'Invalid IP address format' },
          { status: 400 }
        )
      }
    }

    // Validate port if provided
    if (body.port && (body.port < 1 || body.port > 65535)) {
      return NextResponse.json(
        { success: false, error: 'Port must be between 1 and 65535' },
        { status: 400 }
      )
    }

    // Validate categories if provided
    if (body.categories && !Array.isArray(body.categories)) {
      return NextResponse.json(
        { success: false, error: 'Categories must be an array' },
        { status: 400 }
      )
    }

    // Check if another printer with same IP and port exists (excluding current printer)
    if (body.ipAddress && body.port) {
      const existingPrinter = printers.find(p => 
        p.id !== id && p.ipAddress === body.ipAddress && p.port === body.port
      )
      if (existingPrinter) {
        return NextResponse.json(
          { success: false, error: 'Another printer with this IP address and port already exists' },
          { status: 400 }
        )
      }
    }

    // Update printer
    const updatedPrinter: PrinterConfig = {
      ...printers[printerIndex],
      ...body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    }

    printers[printerIndex] = updatedPrinter
    savePrinters(printers)

    return NextResponse.json({
      success: true,
      data: updatedPrinter,
      message: 'Printer updated successfully'
    })
  } catch (error) {
    console.error('Error updating printer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update printer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete printer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const printers = loadPrinters()
    
    const printerIndex = printers.findIndex(p => p.id === id)
    if (printerIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Printer not found' },
        { status: 404 }
      )
    }

    const deletedPrinter = printers[printerIndex]
    printers.splice(printerIndex, 1)
    savePrinters(printers)

    return NextResponse.json({
      success: true,
      data: deletedPrinter,
      message: 'Printer deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting printer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete printer' },
      { status: 500 }
    )
  }
}