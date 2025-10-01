import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, tableId } = body

    if (!pin || !tableId) {
      return NextResponse.json(
        { success: false, error: 'PIN and tableId are required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Find waiter with matching PIN
    const waiter = await usersCollection.findOne({
      role: 'waiter',
      pin: pin,
      status: 'active'
    })

    if (!waiter) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Log the verification attempt
    const verificationsCollection = db.collection('pin_verifications')
    await verificationsCollection.insertOne({
      waiterId: waiter._id,
      waiterName: waiter.name,
      tableId,
      pin,
      timestamp: new Date(),
      success: true
    })

    return NextResponse.json({
      success: true,
      data: {
        waiterId: waiter._id,
        waiterName: waiter.name,
        verified: true
      },
      message: 'PIN verified successfully'
    })
  } catch (error) {
    console.error('Failed to verify waiter PIN:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify PIN' },
      { status: 500 }
    )
  }
}