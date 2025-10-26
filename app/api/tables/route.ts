import { NextRequest, NextResponse } from 'next/server'
import {  getDatabase } from '@/lib/mongodb'
import { broadcastTablesUpdate } from '@/app/api/socket/route'
import { ObjectId } from 'mongodb'

// GET - Fetch all tables
export async function GET() {
  try {
    const  db  = await getDatabase()
    const tables = await db.collection('tables').find({}).toArray()
    
    // Convert MongoDB _id to id and format response
    const formattedTables = tables.map(table => ({
      id: table._id.toString(),
      number: table.number,
      status: table.status,
      capacity: table.capacity || 4,
      currentGuests: table.currentGuests || 0,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: formattedTables
    })
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

// POST - Create a new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, capacity = 4, status = 'available' } = body

    // Validation
    if (!number || typeof number !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Table number is required and must be a number' },
        { status: 400 }
      )
    }

    if (capacity < 1 || capacity > 12) {
      return NextResponse.json(
        { success: false, error: 'Table capacity must be between 1 and 12' },
        { status: 400 }
      )
    }

    const validStatuses = ['available', 'occupied', 'cleaning', 'selected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table status' },
        { status: 400 }
      )
    }

    const  db  = await getDatabase()
    
    // Check if table number already exists
    const existingTable = await db.collection('tables').findOne({ number })
    if (existingTable) {
      return NextResponse.json(
        { success: false, error: 'Table number already exists' },
        { status: 409 }
      )
    }

    const newTable = {
      number,
      status,
      capacity,
      currentGuests: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('tables').insertOne(newTable)
    
    const createdTable = {
      id: result.insertedId.toString(),
      ...newTable
    }

    // Notify all devices watching the tables list
    broadcastTablesUpdate({ type: 'refresh' })

    return NextResponse.json({
      success: true,
      data: createdTable
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create table' },
      { status: 500 }
    )
  }
}