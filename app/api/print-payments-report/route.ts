// Ensure Node.js runtime so we can use TCP sockets
export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import net from 'net'

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

function updatePrintJob(jobId: string, updater: (job: PrintJob) => void) {
  const jobs = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
  const idx = jobs.findIndex(j => j.id === jobId)
  if (idx !== -1) {
    updater(jobs[idx])
    jobs[idx].updatedAt = new Date().toISOString()
    writeJson(PRINT_JOBS_FILE, jobs)
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

// Build very simple ESC/POS payload from text items
function buildEscPosPayload(items: PrintJobItem[]): Buffer {
  const cmds: number[] = []
  // Initialize printer
  cmds.push(0x1B, 0x40)
  for (const item of items) {
    if (item.type === 'line') {
      // Separator line
      const line = item.content || '--------------------------------'
      cmds.push(...Buffer.from(line + "\n", 'ascii'))
    } else {
      const text = (item.content || '') + "\n"
      cmds.push(...Buffer.from(text, 'ascii'))
    }
  }
  // Feed and partial cut (GS V 1) — some printers may ignore cut
  cmds.push(0x1D, 0x56, 0x01)
  return Buffer.from(cmds)
}

async function sendToNetworkPrinter(printer: PrinterConfig, items: PrintJobItem[], timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        socket.destroy()
        reject(new Error('Printer connection timeout'))
      }
    }, timeoutMs)

    socket.once('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    })

    socket.connect(printer.port, printer.ipAddress, () => {
      try {
        const payload = buildEscPosPayload(items)
        socket.write(payload, (writeErr) => {
          if (writeErr && !settled) {
            settled = true
            clearTimeout(timer)
            socket.destroy()
            reject(writeErr)
            return
          }
          // Give the printer a short moment to accept data
          setTimeout(() => {
            if (!settled) {
              settled = true
              clearTimeout(timer)
              socket.end()
              resolve()
            }
          }, 300)
        })
      } catch (e) {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          socket.destroy()
          reject(e as Error)
        }
      }
    })
  })
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

    // Attempt actual network printing if printer is thermal and has IP:PORT
    try {
      updatePrintJob(printJob.id, (j) => { j.status = 'printing' })
      if (selectedPrinter.type === 'thermal' && selectedPrinter.ipAddress && selectedPrinter.port) {
        await sendToNetworkPrinter(selectedPrinter, printJob.items)
        updatePrintJob(printJob.id, (j) => { j.status = 'completed' })
      } else {
        // Fallback to simulation for non-network printers
        simulatePrintJobProcessing(printJob.id)
      }
      return NextResponse.json({
        success: true,
        data: [printJob],
        message: 'Payments report sent to printer'
      })
    } catch (err: any) {
      updatePrintJob(printJob.id, (j) => {
        j.status = 'failed'
        j.error = err?.message || 'Printer error'
      })
      return NextResponse.json({
        success: false,
        error: `Failed to send to printer: ${err?.message || 'Unknown error'}`
      }, { status: 502 })
    }
  } catch (error) {
    console.error('Error printing payments report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to print payments report' },
      { status: 500 }
    )
  }
}