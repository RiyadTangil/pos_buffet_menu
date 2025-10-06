export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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
const PRINT_JOBS_FILE = path.join(DATA_DIR, 'print-jobs.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson<T>(file: string, fallback: T): T {
  try {
    ensureDataDir()
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    }
  } catch {}
  return fallback
}

function writeJson(file: string, data: any) {
  ensureDataDir()
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

function buildEscPosPayload(title: string, items: PrintJobItem[]): Buffer {
  const ESC = Buffer.from([0x1B])
  const GS = Buffer.from([0x1D])
  const initialize = Buffer.from([0x1B, 0x40])
  const alignCenter = Buffer.from([0x1B, 0x61, 0x01])
  const alignLeft = Buffer.from([0x1B, 0x61, 0x00])
  const boldOn = Buffer.from([0x1B, 0x45, 0x01])
  const boldOff = Buffer.from([0x1B, 0x45, 0x00])
  const doubleHeight = Buffer.from([0x1B, 0x21, 0x10])
  const normalHeight = Buffer.from([0x1B, 0x21, 0x00])
  const lineFeed = Buffer.from([0x0A])
  const cut = Buffer.from([0x1D, 0x56, 0x42, 0x00])

  const lines: Buffer[] = []
  lines.push(initialize)
  lines.push(alignCenter)
  lines.push(boldOn)
  lines.push(doubleHeight)
  lines.push(Buffer.from(`${title}\n`, 'ascii'))
  lines.push(normalHeight)
  lines.push(boldOff)
  lines.push(lineFeed)
  lines.push(alignLeft)

  const now = new Date().toLocaleString()
  lines.push(Buffer.from(`Generated: ${now}\n`, 'ascii'))
  lines.push(lineFeed)

  for (const item of items) {
    const name = item.name.length > 24 ? item.name.slice(0, 24) : item.name
    lines.push(Buffer.from(`${name.padEnd(24)} x${String(item.quantity).padStart(3)}\n`, 'ascii'))
  }

  lines.push(lineFeed)
  lines.push(lineFeed)
  lines.push(alignCenter)
  lines.push(Buffer.from(`\n\n— End —\n`, 'ascii'))
  lines.push(lineFeed)
  lines.push(cut)

  return Buffer.concat(lines)
}

async function pickBluetoothComPort(SerialPortMod: any): Promise<string | null> {
  try {
    const ports = await SerialPortMod.list()
    const btPort = ports.find((p: any) =>
      /bluetooth/i.test(`${p.manufacturer || ''}${p.friendlyName || ''}${p.vendorId || ''}`)
    ) || ports.find((p: any) => /COM\d+/i.test(p.path))
    return btPort?.path || null
  } catch (e) {
    console.error('Failed to list serial ports', e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Lazy-load serialport to avoid module load errors breaking the route
    let SerialPortMod: any
    try {
      SerialPortMod = await import('serialport')
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'Serial port module not available. Please run npm install serialport and restart.' },
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
      name: `${p.paymentId} £${(p.totalAmount ?? 0).toFixed(2)} Table ${p.tableNumber ?? ''}`,
      quantity: 1
    }))

    const jobId = uid('payments')
    const jobs = readJson<PrintJob[]>(PRINT_JOBS_FILE, [])
    const printJob: PrintJob = {
      id: jobId,
      type: 'payments',
      printerName: 'Bluetooth/Serial',
      status: 'pending',
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    jobs.push(printJob)
    writeJson(PRINT_JOBS_FILE, jobs)

    // Select COM port automatically (Bluetooth serial profile or first COM)
    const comPath = await pickBluetoothComPort(SerialPortMod)
    if (!comPath) {
      updatePrintJob(jobId, j => { j.status = 'failed'; j.error = 'No COM ports found for Bluetooth printer' })
      return NextResponse.json({ success: false, error: 'No Bluetooth/serial printer detected' }, { status: 404 })
    }

    const payload = buildEscPosPayload(title, items)

    // Attempt to write to serial port
    await new Promise<void>((resolve, reject) => {
      updatePrintJob(jobId, j => { j.status = 'printing' })
      const port = new SerialPortMod.SerialPort({ path: comPath, baudRate: 9600 })

      port.on('error', (err) => {
        updatePrintJob(jobId, j => { j.status = 'failed'; j.error = err?.message || 'Serial port error' })
        try { port.close(() => {}) } catch {}
        reject(err)
      })

      port.on('open', () => {
        port.write(payload, (err) => {
          if (err) {
            updatePrintJob(jobId, j => { j.status = 'failed'; j.error = err?.message || 'Write failed' })
            try { port.close(() => {}) } catch {}
            reject(err)
            return
          }
          // small delay to flush
          setTimeout(() => {
            try { port.close(() => {}) } catch {}
            updatePrintJob(jobId, j => { j.status = 'completed' })
            resolve()
          }, 500)
        })
      })
    })

    return NextResponse.json({ success: true, data: [printJob], message: 'Payments report sent to Bluetooth/serial printer' })
  } catch (error) {
    console.error('Error printing payments report via serial:', error)
    const msg = (error as any)?.message || 'Failed to print payments report via serial'
    // Always return JSON so the client never sees an HTML error page
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}