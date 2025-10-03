import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { MongoPayment, CreatePaymentRequest } from '@/lib/models/payment'
import { broadcastTablesUpdate } from '@/app/api/socket/route'

// GET - Fetch all payments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Filter parameters
    const sessionType = searchParams.get('sessionType')
    const tableId = searchParams.get('tableId')
    const waiterId = searchParams.get('waiterId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    // Build filter query
    const filter: any = {}
    
    if (sessionType) filter.sessionType = sessionType
    if (tableId) filter.tableId = tableId
    if (waiterId) filter.waiterId = waiterId
    if (status) filter.status = status
    
    if (startDate || endDate) {
      filter.paymentDate = {}
      if (startDate) filter.paymentDate.$gte = startDate
      if (endDate) filter.paymentDate.$lte = endDate
    }

    const db = await getDatabase()
    const paymentsCollection = db.collection(COLLECTIONS.PAYMENTS)
    
    // Get total count for pagination
    const totalCount = await paymentsCollection.countDocuments(filter)
    
    // Fetch payments with pagination
    const payments = await paymentsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Convert MongoDB _id to id for frontend compatibility
    const formattedPayments = payments.map(payment => ({
      id: payment._id.toString(),
      paymentId: payment.paymentId,
      tableId: payment.tableId,
      tableNumber: payment.tableNumber,
      waiterId: payment.waiterId,
      waiterName: payment.waiterName,
      totalAmount: payment.totalAmount,
      sessionType: payment.sessionType,
      sessionData: payment.sessionData,
      paymentDate: payment.paymentDate,
      paymentTime: payment.paymentTime,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: formattedPayments,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST - Create new payment
export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json()
    const {
      tableId,
      tableNumber,
      waiterId,
      waiterName,
      totalAmount,
      sessionType,
      sessionData
    } = body

    // Validation
    if (!tableId || !tableNumber || !waiterId || !waiterName || !totalAmount || !sessionType || !sessionData) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total amount must be greater than 0' },
        { status: 400 }
      )
    }

    const now = new Date()
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const payment: MongoPayment = {
      paymentId,
      tableId,
      tableNumber,
      waiterId,
      waiterName,
      totalAmount,
      sessionType,
      sessionData,
      paymentDate: now.toISOString().split('T')[0], // YYYY-MM-DD format
      paymentTime: now.toTimeString().split(' ')[0], // HH:MM:SS format
      status: 'completed',
      paymentMethod: 'waiter',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }

    const db = await getDatabase()
    
    // First, set sessionEnded=true for all table sessions on this table
    try {
      await db.collection('table_sessions').updateMany(
        { tableId, status: 'active' },
        { 
          $set: { 
            sessionEnded: true,
            updatedAt: now.toISOString()
          }
        }
      )
    } catch (sessionUpdateError) {
      console.error('Error updating table sessions:', sessionUpdateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update table sessions' },
        { status: 500 }
      )
    }

    // Create the payment record
    const result = await db.collection(COLLECTIONS.PAYMENTS).insertOne(payment)

    if (!result.insertedId) {
      return NextResponse.json(
        { success: false, error: 'Failed to create payment' },
        { status: 500 }
      )
    }

    // Update table status to available after successful payment
    try {
      await db.collection(COLLECTIONS.TABLES).updateOne(
        { _id: new ObjectId(tableId) },
        { 
          $set: { 
            status: 'available',
            currentGuests: 0,
            updatedAt: now.toISOString()
          }
        }
      )

      // Notify all devices watching the tables list
      broadcastTablesUpdate({ type: 'refresh' })
    } catch (tableUpdateError) {
      console.error('Error updating table status:', tableUpdateError)
      // Don't fail the payment if table update fails, just log the error
    }

    // Clear all table session data for this table after successful payment
    try {
      await db.collection('table_sessions').deleteMany({ tableId })
      
      // Broadcast session deletion to all connected clients
      try {
        const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002/api'}/socket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'broadcast',
            room: `table-${tableId}`,
            event: 'tableSessionUpdate',
            data: null // Send null to indicate session has been cleared
          })
        })
        
        if (!response.ok) {
          console.error('Failed to broadcast session deletion')
        }
      } catch (broadcastError) {
        console.error('Error broadcasting session deletion:', broadcastError)
      }

      // Also broadcast a global tables update so /menu/tables auto-refreshes
      try {
        broadcastTablesUpdate({ type: 'refresh' })
      } catch (broadcastTablesError) {
        console.error('Error broadcasting global tables update:', broadcastTablesError)
      }
    } catch (sessionDeleteError) {
      console.error('Error clearing table sessions:', sessionDeleteError)
      // Don't fail the payment if session cleanup fails, just log the error
    }

    // Return the created payment with formatted id
    const createdPayment = {
      id: result.insertedId.toString(),
      ...payment
    }

    return NextResponse.json({
      success: true,
      data: createdPayment,
      message: 'Payment created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}