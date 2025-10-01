import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MongoPayment } from '@/lib/models/payment'
import { ObjectId } from 'mongodb'

// GET - Fetch payments for the logged-in waiter with filtering
export async function GET(request: NextRequest) {
  try {
    // Get the current session to identify the logged-in waiter
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a waiter
    if (session.user.role !== 'waiter') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only waiters can access this endpoint.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Filter parameters (excluding waiterId as it's automatically set to logged-in waiter)
    const sessionType = searchParams.get('sessionType')
    const tableId = searchParams.get('tableId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    // Build filter query - always filter by the logged-in waiter's ID
    const filter: any = {
      waiterId: session.user.id // Only show payments for the logged-in waiter
    }
    
    if (sessionType && sessionType !== 'all') filter.sessionType = sessionType
    if (tableId && tableId !== 'all') filter.tableId = tableId
    if (status && status !== 'all') filter.status = status
    
    if (startDate || endDate) {
      filter.paymentDate = {}
      if (startDate) filter.paymentDate.$gte = startDate
      if (endDate) filter.paymentDate.$lte = endDate
    }

    const db = await getDatabase()
    const paymentsCollection = db.collection(COLLECTIONS.PAYMENTS)
    const tablesCollection = db.collection('tables')
    
    // Get total count for pagination
    const totalCount = await paymentsCollection.countDocuments(filter)
    
    // Fetch payments with pagination
    const payments = await paymentsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Fetch table information for each payment to get actual table numbers
    const tableIds = [...new Set(payments.map(payment => payment.tableId).filter(Boolean))]
    const tables = await tablesCollection
      .find({ _id: { $in: tableIds.map(id => new ObjectId(id)) } })
      .toArray()
    
    // Create a map of tableId to table number for quick lookup
    const tableMap = new Map()
    tables.forEach(table => {
      tableMap.set(table._id.toString(), table.number)
    })

    // Convert MongoDB _id to id for frontend compatibility and add proper table numbers
    const formattedPayments = payments.map(payment => ({
      id: payment._id.toString(),
      paymentId: payment.paymentId,
      tableId: payment.tableId,
      tableNumber: tableMap.get(payment.tableId) || payment.tableId, // Use actual table number or fallback to tableId
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
    console.error('Error fetching waiter payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}