'use server'

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Minimal models to avoid deep imports
type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed'

interface PrintJobItem {
  type: 'text' | 'line'
  content: string
}

interface PrintJob {
  id: string
  printerId: string
  orderId: string
  items: PrintJobItem[]
  template: string
  status: PrintJobStatus
  retryCount: number
  metadata?: Record<string, any>
  createdAt: string
  updatedAt?: string
  error?: string
}

interface PrinterConfig {
  id: string
  name: string
  ipAddress: string
  port: number
  type: string
  isActive: boolean
  categories?: string[]
}

// Data paths
const DATA_DIR = path.join(process.cwd(), 'data')
const PRINT_JOBS_FILE = path.join(DATA_DIR, 'print-jobs.json')
const PRINTERS_FILE = path.join(DATA_DIR, 'printers.json')

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write JSON', filePath, e)
  }
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function simulatePrintJobProcessing(jobId: string) {
  // Simulate async printing lifecycle
  setTimeout(() => {
    const jobs = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    job.status = 'printing'
    job.updatedAt = new Date().toISOString()
    writeJson(PRINT_JOBS_FILE, jobs)

    setTimeout(() => {
      const jobs2 = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
      const job2 = jobs2.find(j => j.id === jobId)
      if (!job2) return
      job2.status = 'completed'
      job2.updatedAt = new Date().toISOString()
      writeJson(PRINT_JOBS_FILE, jobs2)
    }, 1200)
  }, 600)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payments: any[] = Array.isArray(body?.payments) ? body.payments : []
    const title: string = body?.title || 'Payments Report'

    if (payments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payments provided to print' },
        { status: 400 }
      )
    }

    const printers = readJson<PrinterConfig[]>(PRINTERS_FILE, [])
    const activePrinters = printers.filter(p => p.isActive)
    if (activePrinters.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active printers configured' },
        { status: 400 }
      )
    }

    // Choose the first active printer for the report
    const selectedPrinter = activePrinters[0]

    // Build printable items
    const now = new Date()
    const headerItems: PrintJobItem[] = [
      { type: 'text', content: title },
      { type: 'text', content: `Generated: ${now.toLocaleString()}` },
      { type: 'line', content: '----------------------------------------' }
    ]

    const rows: PrintJobItem[] = payments.map((p) => {
      const id = p.paymentId || p._id || '-'
      const date = p.paymentDate || (p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-')
      const time = p.paymentTime || (p.paidAt ? new Date(p.paidAt).toLocaleTimeString() : '-')
      const table = p.tableNumber ?? p.tableId ?? '-'
      const method = p.paymentMethod ?? '-'
      const amount = (p.totalAmount ?? p.amount ?? 0).toFixed ? (p.totalAmount ?? p.amount ?? 0).toFixed(2) : String(p.totalAmount ?? p.amount ?? 0)
      const line = `#${id}  ${date} ${time}  T:${table}  ${method}  £${amount}`
      return { type: 'text', content: line }
    })

    const total = payments.reduce((sum, p) => sum + (p.totalAmount ?? p.amount ?? 0), 0)
    const footerItems: PrintJobItem[] = [
      { type: 'line', content: '----------------------------------------' },
      { type: 'text', content: `Total: £${total.toFixed(2)}` }
    ]

    const printJob: PrintJob = {
      id: generateId(),
      printerId: selectedPrinter.id,
      orderId: `payments-report-${now.getTime()}`,
      items: [...headerItems, ...rows, ...footerItems],
      template: 'payments-report',
      status: 'pending',
      retryCount: 0,
      metadata: {
        printerName: selectedPrinter.name,
        count: payments.length
      },
      createdAt: new Date().toISOString()
    }

    const existingJobs = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
    existingJobs.unshift(printJob)
    writeJson(PRINT_JOBS_FILE, existingJobs)

    simulatePrintJobProcessing(printJob.id)

    return NextResponse.json({
      success: true,
      data: [printJob],
      message: 'Payments report sent to printer'
    })
  } catch (error) {
    console.error('Error printing payments report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to print payments report' },
      { status: 500 }
    )
  }
}