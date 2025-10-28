export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed'

interface PrintJobItem {
  id: string
  name: string
  quantity: number
  price?: number
}

interface PrintJob {
  id: string
  type: 'order'
  printerName: string
  status: PrintJobStatus
  items: PrintJobItem[]
  createdAt: string
  updatedAt: string
  meta?: {
    orderId: string
    tableNumber?: string | number
    guestCount?: number
    orderTime?: string
    totalAmount?: number
  }
  error?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const TMP_DIR = path.join(DATA_DIR, 'tmp')
const PRINT_JOBS_FILE = path.join(DATA_DIR, 'print-jobs.json')

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
}

function readJson<T>(file: string, fallback: T): T {
  try {
    ensureDirs()
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    }
  } catch {}
  return fallback
}

function writeJson(file: string, data: any) {
  ensureDirs()
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function uid(prefix = 'job'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function updatePrintJob(jobId: string, updater: (job: PrintJob) => void) {
  const jobs = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
  const idx = jobs.findIndex(j => j.id === jobId)
  if (idx !== -1) {
    updater(jobs[idx])
    jobs[idx].updatedAt = new Date().toISOString()
    writeJson(PRINT_JOBS_FILE, jobs)
  }
}

async function buildOrderPDF(
  title: string,
  items: PrintJobItem[],
  meta: { orderId: string; tableNumber?: string | number; guestCount?: number; orderTime?: string; totalAmount?: number },
  filePath: string
) {
  const pdfDoc = await PDFDocument.create()
  // Use a narrower page width for receipt-like format (80mm width)
  const page = pdfDoc.addPage([300, 600]) // Custom size for receipt
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 30
  const pageWidth = 300
  const centerX = pageWidth / 2
  let y = 570

  // Title - KITCHEN ORDER
  page.setFont(boldFont)
  page.setFontSize(18)
  const titleWidth = boldFont.widthOfTextAtSize(title, 18)
  page.drawText(title, { 
    x: centerX - titleWidth / 2, 
    y, 
    color: rgb(0,0,0) 
  })
  y -= 20

  // Table number
  page.setFontSize(14)
  const tableText = `Table ${meta.tableNumber ?? 'N/A'}`
  const tableWidth = boldFont.widthOfTextAtSize(tableText, 14)
  page.drawText(tableText, { 
    x: centerX - tableWidth / 2, 
    y,
    color: rgb(0,0,0) 
  })
  y -= 30

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0,0,0),
  })
  y -= 15

  // Order info
  page.setFont(font)
  page.setFontSize(10)
  page.drawText(`Order ID: ${meta.orderId}`, { x: margin, y }); y -= 14
  page.drawText(`Guests: ${meta.guestCount ?? 0}`, { x: margin, y }); y -= 14
  page.drawText(`Date & Time: ${meta.orderTime ? new Date(meta.orderTime).toLocaleString() : new Date().toLocaleString()}`, { x: margin, y }); y -= 20

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0,0,0),
  })
  y -= 20

  // Items header
  page.setFont(boldFont)
  page.setFontSize(12)
  const itemsHeader = "ITEMS TO PREPARE"
  const headerWidth = boldFont.widthOfTextAtSize(itemsHeader, 12)
  page.drawText(itemsHeader, { 
    x: centerX - headerWidth / 2, 
    y,
    color: rgb(0,0,0) 
  })
  y -= 15

  // Column headers
  page.setFontSize(10)
  page.drawText("Item", { x: margin, y })
  page.drawText("Qty", { x: pageWidth - margin - 40, y })
  y -= 10

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0,0,0),
  })
  y -= 15

  // Items
  page.setFont(font)
  for (const item of items) {
    if (y < 60) {
      const p = pdfDoc.addPage([300, 600])
      p.setFont(font)
      p.setFontSize(10)
      y = 570
    }
    
    // Item name with truncation if needed
    let itemName = item.name
    if (itemName.length > 25) {
      itemName = itemName.substring(0, 22) + '...'
    }
    
    page.drawText(itemName, { x: margin, y })
    
    // Quantity (right-aligned)
    const qtyText = `${item.quantity}`
    const qtyWidth = font.widthOfTextAtSize(qtyText, 10)
    page.drawText(qtyText, { 
      x: pageWidth - margin - qtyWidth, 
      y 
    })
    
    y -= 15
  }

  // Horizontal line
  y -= 5
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0,0,0),
  })
  y -= 20

  // Total items count
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  page.setFont(boldFont)
  page.setFontSize(12)
  const totalText = `ITEMS: ${totalItems}`
  const totalWidth = boldFont.widthOfTextAtSize(totalText, 12)
  page.drawText(totalText, { 
    x: centerX - totalWidth / 2, 
    y 
  })
  y -= 25

  // Footer
  page.setFont(boldFont)
  page.setFontSize(12)
  const footerText = "PREPARE IMMEDIATELY"
  const footerWidth = boldFont.widthOfTextAtSize(footerText, 12)
  page.drawText(footerText, { 
    x: centerX - footerWidth / 2, 
    y 
  })
  y -= 15
  
  page.setFont(font)
  page.setFontSize(8)
  const printedText = `Printed: ${new Date().toLocaleString()}`
  const printedWidth = font.widthOfTextAtSize(printedText, 8)
  page.drawText(printedText, { 
    x: centerX - printedWidth / 2, 
    y 
  })

  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(filePath, pdfBytes)
}

export async function POST(request: NextRequest) {
  try {
    // Lazy-load pdf-to-printer so module load errors don't produce HTML responses
    let printFn: any
    try {
      const mod = await import('pdf-to-printer')
      printFn = mod.print
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'Printing module not available. Please install pdf-to-printer and restart.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { orderId, orderItems, tableNumber, guestCount, orderTime, printerName } = body || {}

    if (!orderId || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Order ID and items are required' }, { status: 400 })
    }

    const items: PrintJobItem[] = orderItems.map((item: any, idx: number) => ({
      id: String(item.id ?? idx + 1),
      name: String(item.name || item.menuItem?.name || 'Unknown Item'),
      quantity: Number(item.quantity || 1),
      price: Number(item.price ?? item.menuItem?.price ?? 0)
    }))

    const totalAmount = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0)

    const jobId = uid('order')
    const jobs = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
    const printJob: PrintJob = {
      id: jobId,
      type: 'order',
      printerName: printerName || 'USB/Spooler',
      status: 'pending',
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meta: { orderId, tableNumber, guestCount, orderTime, totalAmount }
    }
    jobs.push(printJob)
    writeJson(PRINT_JOBS_FILE, jobs)

    const pdfPath = path.join(TMP_DIR, `${jobId}.pdf`)
    await buildOrderPDF('Kitchen Order', items, printJob.meta!, pdfPath)

    updatePrintJob(jobId, j => { j.status = 'printing' })
    const sumatraPath = process.env.SUMATRA_PDF || process.env.SUMATRA_PDF_PATH
    try {
      // Use specific printer if provided, otherwise use default spooler
      const printOptions = sumatraPath 
        ? { sumatraPdfPath: sumatraPath, printer: printerName }
        : { printer: printerName || undefined }
      
      await printFn(pdfPath, printOptions)
    } catch (e: any) {
      if (e?.code === 'ENOENT' || /SumatraPDF/i.test(e?.message || '')) {
        updatePrintJob(jobId, j => { j.status = 'failed'; j.error = 'SumatraPDF not found. Install SumatraPDF or set SUMATRA_PDF env var.' })
        return NextResponse.json(
          { success: false, error: 'SumatraPDF not found. Install SumatraPDF or set SUMATRA_PDF env var.' },
          { status: 500 }
        )
      }
      throw e
    }
    updatePrintJob(jobId, j => { j.status = 'completed' })

    return NextResponse.json({ success: true, data: [printJob], message: 'Order sent to USB printer (spooler)' })
  } catch (error: any) {
    console.error('Error printing order via USB/spooler:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to print order via USB/spooler' },
      { status: 500 }
    )
  }
}