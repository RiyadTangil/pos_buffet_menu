import { NextRequest, NextResponse } from 'next/server'
import {  getDatabase } from '@/lib/mongodb'
import { broadcastTablesUpdate } from '@/app/api/socket/route'
import { ObjectId } from 'mongodb'

// GET - Fetch a single table by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table ID' },
        { status: 400 }
      )
    }

    const  db  = await getDatabase()
    const table = await db.collection('tables').findOne({ _id: new ObjectId(id) })

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      )
    }

    // Get current orders for this table
    const orders = await db.collection('orders')
      .find({ tableId: id, status: { $in: ['pending', 'preparing', 'ready', 'served'] } })
      .toArray()

    const formattedTable = {
      id: table._id.toString(),
      number: table.number,
      status: table.status,
      capacity: table.capacity || 4,
      currentGuests: table.currentGuests || 0,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      currentOrders: orders.length,
      totalItems: orders.reduce((sum, order) => 
        sum + (order.items?.length || 0), 0
      )
    }

    return NextResponse.json({
      success: true,
      data: formattedTable
    })
  } catch (error) {
    console.error('Error fetching table:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table' },
      { status: 500 }
    )
  }
}

// PUT - Update a table
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { number, status, capacity, currentGuests } = body

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table ID' },
        { status: 400 }
      )
    }

    const db  = await getDatabase()
    
    // Check if table exists
    const existingTable = await db.collection('tables').findOne({ _id: new ObjectId(id) })
    if (!existingTable) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      )
    }

    const updateData: any = { updatedAt: new Date() }

    // Validate and update fields
    if (number !== undefined) {
      if (typeof number !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Table number must be a number' },
          { status: 400 }
        )
      }
      
      // Check if new number conflicts with existing table
      if (number !== existingTable.number) {
        const conflictTable = await db.collection('tables').findOne({ 
          number, 
          _id: { $ne: new ObjectId(id) } 
        })
        if (conflictTable) {
          return NextResponse.json(
            { success: false, error: 'Table number already exists' },
            { status: 409 }
          )
        }
      }
      updateData.number = number
    }

    if (status !== undefined) {
      const validStatuses = ['available', 'occupied', 'cleaning', 'selected']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid table status' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (capacity !== undefined) {
      if (typeof capacity !== 'number' || capacity < 1 || capacity > 12) {
        return NextResponse.json(
          { success: false, error: 'Table capacity must be between 1 and 12' },
          { status: 400 }
        )
      }
      updateData.capacity = capacity
    }

    if (currentGuests !== undefined) {
      if (typeof currentGuests !== 'number' || currentGuests < 0) {
        return NextResponse.json(
          { success: false, error: 'Current guests must be a non-negative number' },
          { status: 400 }
        )
      }
      updateData.currentGuests = currentGuests
    }

    const result = await db.collection('tables').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      )
    }

    // Fetch updated table
    const updatedTable = await db.collection('tables').findOne({ _id: new ObjectId(id) })
    
    const formattedTable = {
      id: updatedTable!._id.toString(),
      number: updatedTable!.number,
      status: updatedTable!.status,
      capacity: updatedTable!.capacity,
      currentGuests: updatedTable!.currentGuests,
      createdAt: updatedTable!.createdAt,
      updatedAt: updatedTable!.updatedAt
    }

    // Notify all devices watching the tables list
    broadcastTablesUpdate({ type: 'refresh' })

    return NextResponse.json({
      success: true,
      data: formattedTable
    })
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update table' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a table
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table ID' },
        { status: 400 }
      )
    }

    const db  = await getDatabase()
    
    // Check if table has active orders
    const activeOrders = await db.collection('orders')
      .findOne({ 
        tableId: id, 
        status: { $in: ['pending', 'preparing', 'ready', 'served'] } 
      })

    if (activeOrders) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete table with active orders' },
        { status: 409 }
      )
    }

    const result = await db.collection('tables').deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      )
    }

    // Notify all devices watching the tables list
    broadcastTablesUpdate({ type: 'refresh' })

    return NextResponse.json({
      success: true,
      message: 'Table deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting table:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete table' },
      { status: 500 }
    )
  }
}