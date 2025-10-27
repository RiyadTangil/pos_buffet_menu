import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { WaiterRequest, WaiterRequestPrinterMapping } from '@/lib/models/printer'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const DATA_DIR = path.join(process.cwd(), 'data')
const WAITER_REQUESTS_FILE = path.join(DATA_DIR, 'waiter-requests.json')
const WAITER_REQUEST_MAPPINGS_FILE = path.join(DATA_DIR, 'waiter-request-mappings.json')

// Ensure data directory and files exist
async function ensureDataFiles() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }

  try {
    await fs.access(WAITER_REQUESTS_FILE)
  } catch {
    await fs.writeFile(WAITER_REQUESTS_FILE, JSON.stringify([]))
  }

  try {
    await fs.access(WAITER_REQUEST_MAPPINGS_FILE)
  } catch {
    await fs.writeFile(WAITER_REQUEST_MAPPINGS_FILE, JSON.stringify([]))
  }
}

// Read waiter requests
async function readWaiterRequests(): Promise<WaiterRequest[]> {
  await ensureDataFiles()
  const data = await fs.readFile(WAITER_REQUESTS_FILE, 'utf-8')
  return JSON.parse(data)
}

// Write waiter requests
async function writeWaiterRequests(requests: WaiterRequest[]): Promise<void> {
  await ensureDataFiles()
  await fs.writeFile(WAITER_REQUESTS_FILE, JSON.stringify(requests, null, 2))
}

// Read waiter request printer mappings from MongoDB
async function readWaiterRequestMappings(): Promise<WaiterRequestPrinterMapping[]> {
  try {
    const db = await getDatabase()
    const mappings = await db.collection(COLLECTIONS.WAITER_REQUEST_MAPPINGS)
      .find({})
      .toArray()
    
    return mappings.map(mapping => ({
      _id: mapping._id.toString(),
      requestType: mapping.requestType,
      printerId: mapping.printerId,
      printerName: mapping.printerName,
      connectionType: mapping.connectionType,
      isActive: mapping.isActive,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt
    }))
  } catch (error) {
    console.error('Error reading waiter request mappings from MongoDB:', error)
    // Fallback to JSON file for backward compatibility
    await ensureDataFiles()
    const data = await fs.readFile(WAITER_REQUEST_MAPPINGS_FILE, 'utf-8')
    return JSON.parse(data)
  }
}

// Write waiter request printer mapping to MongoDB
async function saveWaiterRequestMapping(mapping: Omit<WaiterRequestPrinterMapping, '_id'>): Promise<WaiterRequestPrinterMapping> {
  try {
    const db = await getDatabase()
    const collection = db.collection(COLLECTIONS.WAITER_REQUEST_MAPPINGS)
    
    const now = new Date().toISOString()
    const mappingData = {
      ...mapping,
      createdAt: now,
      updatedAt: now
    }

    // Remove existing mapping for this request type (upsert behavior)
    await collection.deleteMany({ requestType: mapping.requestType })
    
    const result = await collection.insertOne(mappingData)
    
    return {
      _id: result.insertedId.toString(),
      ...mappingData
    }
  } catch (error) {
    console.error('Error saving waiter request mapping to MongoDB:', error)
    throw error
  }
}

// Delete waiter request printer mapping from MongoDB
async function deleteWaiterRequestMapping(requestType: string): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection(COLLECTIONS.WAITER_REQUEST_MAPPINGS)
      .deleteMany({ requestType })
  } catch (error) {
    console.error('Error deleting waiter request mapping from MongoDB:', error)
    throw error
  }
}

// GET - Fetch all waiter requests and mappings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'mappings') {
      const mappings = await readWaiterRequestMappings()
      return NextResponse.json(mappings)
    }

    const requests = await readWaiterRequests()
    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching waiter requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waiter requests' },
      { status: 500 }
    )
  }
}

// POST - Create new waiter request or mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'mapping') {
      const newMapping = await saveWaiterRequestMapping({
        requestType: body.requestType,
        printerId: body.printerId,
        printerName: body.printerName,
        connectionType: body.connectionType,
        isActive: body.isActive ?? true
      })

      return NextResponse.json(newMapping, { status: 201 })
    }

    // Create waiter request
    const requests = await readWaiterRequests()
    const newRequest: WaiterRequest = {
      id: `wr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tableNumber: body.tableNumber,
      requestType: body.requestType,
      message: body.message || getDefaultMessage(body.requestType),
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    requests.push(newRequest)
    await writeWaiterRequests(requests)

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating waiter request:', error)
    return NextResponse.json(
      { error: 'Failed to create waiter request' },
      { status: 500 }
    )
  }
}

// PUT - Update waiter request or mapping
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (type === 'mapping') {
      const updatedMapping = await saveWaiterRequestMapping({
        requestType: body.requestType,
        printerId: body.printerId,
        printerName: body.printerName,
        connectionType: body.connectionType,
        isActive: body.isActive ?? true
      })

      return NextResponse.json(updatedMapping)
    }

    // Update waiter request
    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    const requests = await readWaiterRequests()
    const index = requests.findIndex(r => r.id === id)
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    requests[index] = {
      ...requests[index],
      ...body,
      acknowledgedAt: body.status === 'acknowledged' ? new Date().toISOString() : requests[index].acknowledgedAt,
      completedAt: body.status === 'completed' ? new Date().toISOString() : requests[index].completedAt
    }

    await writeWaiterRequests(requests)
    return NextResponse.json(requests[index])
  } catch (error) {
    console.error('Error updating waiter request:', error)
    return NextResponse.json(
      { error: 'Failed to update waiter request' },
      { status: 500 }
    )
  }
}

// DELETE - Delete waiter request or mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const requestType = searchParams.get('requestType')

    if (type === 'mapping') {
      if (!requestType) {
        return NextResponse.json(
          { error: 'Request type is required' },
          { status: 400 }
        )
      }

      await deleteWaiterRequestMapping(requestType)
      
      return NextResponse.json({ success: true })
    }

    // Delete waiter request
    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    const requests = await readWaiterRequests()
    const filteredRequests = requests.filter(r => r.id !== id)
    await writeWaiterRequests(filteredRequests)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting waiter request:', error)
    return NextResponse.json(
      { error: 'Failed to delete waiter request' },
      { status: 500 }
    )
  }
}

// Helper function to get default messages
function getDefaultMessage(requestType: string): string {
  const messages = {
    waiter: 'Customer is requesting waiter assistance',
    cleaning: 'Table needs cleaning service',
    bill: 'Customer is requesting the bill'
  }
  return messages[requestType as keyof typeof messages] || 'Customer service request'
}