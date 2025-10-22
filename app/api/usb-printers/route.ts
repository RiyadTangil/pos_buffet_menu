import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { USBPrinterConfig } from '@/lib/models/printer'

const USB_PRINTERS_FILE = path.join(process.cwd(), 'data', 'usb-printers.json')

// Ensure data directory and file exist
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(USB_PRINTERS_FILE)
    await fs.mkdir(dataDir, { recursive: true })
    
    try {
      await fs.access(USB_PRINTERS_FILE)
    } catch {
      await fs.writeFile(USB_PRINTERS_FILE, JSON.stringify([]))
    }
  } catch (error) {
    console.error('Error ensuring USB printers data file:', error)
  }
}

async function readUSBPrinters(): Promise<USBPrinterConfig[]> {
  try {
    await ensureDataFile()
    const data = await fs.readFile(USB_PRINTERS_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading USB printers:', error)
    return []
  }
}

async function writeUSBPrinters(printers: USBPrinterConfig[]): Promise<void> {
  try {
    await ensureDataFile()
    await fs.writeFile(USB_PRINTERS_FILE, JSON.stringify(printers, null, 2))
  } catch (error) {
    console.error('Error writing USB printers:', error)
    throw error
  }
}

// GET - Fetch all USB printers
export async function GET() {
  try {
    const printers = await readUSBPrinters()
    return NextResponse.json({
      success: true,
      printers
    })
  } catch (error) {
    console.error('Error fetching USB printers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch USB printers' },
      { status: 500 }
    )
  }
}

// POST - Create new USB printer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, localPrinterName, displayName, type, categories, isActive, isDefault, status, description } = body

    // Validation
    if (!name || !localPrinterName) {
      return NextResponse.json(
        { success: false, error: 'Name and local printer name are required' },
        { status: 400 }
      )
    }

    const printers = await readUSBPrinters()
    
    // Check if printer with same local name already exists
    const existingPrinter = printers.find(p => p.localPrinterName === localPrinterName)
    if (existingPrinter) {
      return NextResponse.json(
        { success: false, error: 'USB printer with this local name already exists' },
        { status: 400 }
      )
    }

    // If this is set as default, remove default from others
    if (isDefault) {
      printers.forEach(printer => {
        printer.isDefault = false
      })
    }

    const newPrinter: USBPrinterConfig = {
      id: Date.now().toString(),
      name,
      localPrinterName,
      displayName: displayName || name,
      type: type || 'thermal',
      isActive: isActive !== undefined ? isActive : true,
      categories: categories || [],
      isDefault: isDefault || false,
      status: status || 'Ready',
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    printers.push(newPrinter)
    await writeUSBPrinters(printers)

    return NextResponse.json({
      success: true,
      printer: newPrinter
    })
  } catch (error) {
    console.error('Error creating USB printer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create USB printer' },
      { status: 500 }
    )
  }
}

// PUT - Update USB printer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, localPrinterName, displayName, type, categories, isActive, isDefault, status, description } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Printer ID is required' },
        { status: 400 }
      )
    }

    const printers = await readUSBPrinters()
    const printerIndex = printers.findIndex(p => p.id === id)
    
    if (printerIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'USB printer not found' },
        { status: 404 }
      )
    }

    // If this is set as default, remove default from others
    if (isDefault) {
      printers.forEach(printer => {
        if (printer.id !== id) {
          printer.isDefault = false
        }
      })
    }

    // Update printer
    const updatedPrinter = {
      ...printers[printerIndex],
      name: name || printers[printerIndex].name,
      localPrinterName: localPrinterName || printers[printerIndex].localPrinterName,
      displayName: displayName || printers[printerIndex].displayName,
      type: type || printers[printerIndex].type,
      categories: categories !== undefined ? categories : printers[printerIndex].categories,
      isActive: isActive !== undefined ? isActive : printers[printerIndex].isActive,
      isDefault: isDefault !== undefined ? isDefault : printers[printerIndex].isDefault,
      status: status || printers[printerIndex].status,
      description: description !== undefined ? description : printers[printerIndex].description,
      updatedAt: new Date().toISOString()
    }

    printers[printerIndex] = updatedPrinter
    await writeUSBPrinters(printers)

    return NextResponse.json({
      success: true,
      printer: updatedPrinter
    })
  } catch (error) {
    console.error('Error updating USB printer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update USB printer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete USB printer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Printer ID is required' },
        { status: 400 }
      )
    }

    const printers = await readUSBPrinters()
    const printerIndex = printers.findIndex(p => p.id === id)
    
    if (printerIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'USB printer not found' },
        { status: 404 }
      )
    }

    const deletedPrinter = printers[printerIndex]
    printers.splice(printerIndex, 1)
    await writeUSBPrinters(printers)

    return NextResponse.json({
      success: true,
      message: 'USB printer deleted successfully',
      printer: deletedPrinter
    })
  } catch (error) {
    console.error('Error deleting USB printer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete USB printer' },
      { status: 500 }
    )
  }
}