import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'

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
    
    const db = await getDatabase()
    const ordersCollection = db.collection(COLLECTIONS.ORDERS)
    
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
    
    return NextResponse.json({ 
      success: true,
      orders: formattedOrders 
    })
  } catch (error) {
    console.error('Error fetching orders by session:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}