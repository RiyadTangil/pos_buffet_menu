import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PrintJob } from '@/lib/models/printer'

// File path for storing print jobs
const printJobsFilePath = path.join(process.cwd(), 'data', 'print-jobs.json')

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load print jobs from file
function loadPrintJobs(): PrintJob[] {
  try {
    ensureDataDirectory()
    if (fs.existsSync(printJobsFilePath)) {
      const data = fs.readFileSync(printJobsFilePath, 'utf8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error loading print jobs:', error)
    return []
  }
}

// Save print jobs to file
function savePrintJobs(printJobs: PrintJob[]) {
  try {
    ensureDataDirectory()
    fs.writeFileSync(printJobsFilePath, JSON.stringify(printJobs, null, 2))
  } catch (error) {
    console.error('Error saving print jobs:', error)
    throw error
  }
}

// Generate unique ID
function generateId(): string {
  return `print-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// GET - Fetch print jobs with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const printerId = searchParams.get('printerId')
    const orderId = searchParams.get('orderId')

    let printJobs = loadPrintJobs()

    // Apply filters
    if (status) {
      printJobs = printJobs.filter(job => job.status === status)
    }
    if (printerId) {
      printJobs = printJobs.filter(job => job.printerId === printerId)
    }
    if (orderId) {
      printJobs = printJobs.filter(job => job.orderId === orderId)
    }

    // Sort by creation date (newest first)
    printJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      data: printJobs
    })
  } catch (error) {
    console.error('Error fetching print jobs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch print jobs' },
      { status: 500 }
    )
  }
}

// POST - Create new print job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { printerId, orderId, items, template, metadata } = body

    // Validation
    if (!printerId || !orderId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Printer ID, order ID, and items are required' },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      )
    }

    const printJobs = loadPrintJobs()

    const newPrintJob: PrintJob = {
      id: generateId(),
      printerId,
      orderId,
      items,
      template: template || 'default',
      status: 'pending',
      retryCount: 0,
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    }

    printJobs.push(newPrintJob)
    savePrintJobs(printJobs)

    // Here you would typically send the job to the actual printer
    // For now, we'll simulate processing
    setTimeout(() => {
      simulatePrintJobProcessing(newPrintJob.id)
    }, 1000)

    return NextResponse.json({
      success: true,
      data: newPrintJob,
      message: 'Print job created successfully'
    })
  } catch (error) {
    console.error('Error creating print job:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create print job' },
      { status: 500 }
    )
  }
}

// Simulate print job processing (in a real implementation, this would interact with actual printers)
function simulatePrintJobProcessing(jobId: string) {
  try {
    const printJobs = loadPrintJobs()
    const jobIndex = printJobs.findIndex(job => job.id === jobId)
    
    if (jobIndex !== -1) {
      // Simulate processing time and random success/failure
      const success = Math.random() > 0.1 // 90% success rate
      
      if (success) {
        printJobs[jobIndex].status = 'completed'
        printJobs[jobIndex].completedAt = new Date().toISOString()
      } else {
        printJobs[jobIndex].status = 'failed'
        printJobs[jobIndex].error = 'Simulated printer error'
        printJobs[jobIndex].retryCount = (printJobs[jobIndex].retryCount || 0) + 1
      }
      
      savePrintJobs(printJobs)
    }
  } catch (error) {
    console.error('Error processing print job:', error)
  }
}