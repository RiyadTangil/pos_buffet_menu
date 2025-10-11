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
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const margin = 50
  let y = 800

  page.setFont(font)
  page.setFontSize(18)
  page.drawText(title, { x: margin, y, color: rgb(0,0,0) })
  y -= 24
  page.setFontSize(12)
  page.drawText(`Generated: ${new Date().toLocaleString()}`, { x: margin, y })
  y -= 24

  // Order info
  page.drawText(`Order ID: ${meta.orderId}`, { x: margin, y }); y -= 16
  page.drawText(`Table: ${meta.tableNumber ?? 'N/A'}`, { x: margin, y }); y -= 16
  page.drawText(`Guests: ${meta.guestCount ?? 0}`, { x: margin, y }); y -= 16
  page.drawText(`Date & Time: ${meta.orderTime ? new Date(meta.orderTime).toLocaleString() : new Date().toLocaleString()}`, { x: margin, y }); y -= 24

  // Header
  page.drawText('Item / Qty / Price', { x: margin, y })
  y -= 16

  for (const item of items) {
    if (y < 60) {
      const p = pdfDoc.addPage([595.28, 841.89])
      p.setFont(font)
      p.setFontSize(12)
      y = 800
    }
    const priceText = item.price != null ? ` £${(item.price * item.quantity).toFixed(2)}` : ''
    page.drawText(`${item.name}  x${item.quantity}${priceText}`, { x: margin, y })
    y -= 16
  }

  if (meta.totalAmount != null) {
    y -= 16
    page.drawText(`Total: £${meta.totalAmount.toFixed(2)}`, { x: margin, y })
  }

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
    const { orderId, orderItems, tableNumber, guestCount, orderTime } = body || {}

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
      printerName: 'USB/Spooler',
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
      await printFn(pdfPath, sumatraPath ? { sumatraPdfPath: sumatraPath } : { printer: undefined })
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