import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Get orders by tableSessionId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableSessionId = searchParams.get('tableSessionId')
    
    if (!tableSessionId) {
      return NextResponse.json(
        { success: false, message: 'tableSessionId is required' },
        { status: 400 }
      )
    }
    // Validate ObjectId format to avoid runtime ReferenceErrors
    if (!ObjectId.isValid(tableSessionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid tableSessionId format' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const ordersCollection = db.collection(COLLECTIONS.ORDERS)
    const sessionsCollection = db.collection('table_sessions')
    
    // Find orders by tableSessionId
    const orders = await ordersCollection
      .find({ tableSessionId })
      .sort({ createdAt: -1 })
      .toArray()
    
    // Format orders for response
    const formattedOrders = orders.map(order => ({
      id: order.orderId || order._id.toString(),
      tableId: order.tableId,
      tableNumber: order.tableNumber,
      session: order.session,
      date: order.date,
      time: order.time,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      guestCount: order.guestCount,
      groupType: order.groupType,
      tableSessionId: order.tableSessionId
    }))
    
    // Also fetch the table session document to avoid a second API call
    const sessionDoc = await sessionsCollection.findOne({ _id: new ObjectId(tableSessionId) })
    let formattedSession = null
    if (sessionDoc) {
      formattedSession = {
        id: sessionDoc._id.toString(),
        tableId: sessionDoc.tableId,
        deviceId: sessionDoc.deviceId,
        secondaryDeviceId: sessionDoc.secondaryDeviceId,
        guestCounts: sessionDoc.guestCounts,
        cartItems: sessionDoc.cartItems || [],
        nextOrderAvailableUntil: sessionDoc.nextOrderAvailableUntil,
        sessionEnded: sessionDoc.sessionEnded || false,
        status: sessionDoc.status,
        createdAt: sessionDoc.createdAt,
        updatedAt: sessionDoc.updatedAt,
        isSecondaryDevice: sessionDoc.isSecondaryDevice || false,
        groupType: sessionDoc.groupType || 'same'
      }
    }

    return NextResponse.json({ 
      success: true,
      orders: formattedOrders,
      session: formattedSession
    })
  } catch (error) {
    console.error('Error fetching orders by session:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}