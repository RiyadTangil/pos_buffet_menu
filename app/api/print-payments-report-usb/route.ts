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
}

interface PrintJob {
  id: string
  type: 'payments'
  printerName: string
  status: PrintJobStatus
  items: PrintJobItem[]
  createdAt: string
  updatedAt: string
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

async function buildPaymentsPDF(title: string, items: PrintJobItem[], filePath: string) {
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

  // Header
  page.drawText('Payment ID / Amount / Table', { x: margin, y })
  y -= 16

  for (const item of items) {
    if (y < 60) {
      // new page
      const p = pdfDoc.addPage([595.28, 841.89])
      p.setFont(font)
      p.setFontSize(12)
      y = 800
    }
    page.drawText(item.name, { x: margin, y })
    y -= 16
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
    const payments = Array.isArray(body?.payments) ? body.payments : []
    const title: string = body?.title || 'Payments Report'

    if (!payments.length) {
      return NextResponse.json({ success: false, error: 'No payments provided' }, { status: 400 })
    }

    const items: PrintJobItem[] = payments.map((p: any, idx: number) => ({
      id: String(idx + 1),
      name: `${p.paymentId}  £${(p.totalAmount ?? 0).toFixed(2)}  Table ${p.tableNumber ?? ''}`,
      quantity: 1
    }))

    const jobId = uid('payments')
    const jobs = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
    const printJob: PrintJob = {
      id: jobId,
      type: 'payments',
      printerName: 'USB/Spooler',
      status: 'pending',
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    jobs.push(printJob)
    writeJson(PRINT_JOBS_FILE, jobs)

    // Build PDF and send to Windows spooler (default printer)
    const pdfPath = path.join(TMP_DIR, `${jobId}.pdf`)
    await buildPaymentsPDF(title, items, pdfPath)

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

    // Optionally cleanup temp file (keep for debugging)
    // try { fs.unlinkSync(pdfPath) } catch {}

    return NextResponse.json({ success: true, data: [printJob], message: 'Payments report sent to USB printer (spooler)' })
  } catch (error: any) {
    console.error('Error printing payments report via USB/spooler:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to print payments report via USB/spooler' },
      { status: 500 }
    )
  }
}