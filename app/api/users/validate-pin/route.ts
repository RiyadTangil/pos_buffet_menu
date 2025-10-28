import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'

// POST - Validate waiter PIN
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body

    // Validation
    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'PIN is required' },
        { status: 400 }
      )
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN must be 4 digits' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Find waiter with matching PIN
    const waiter = await usersCollection.findOne(
      { 
        pin: pin, 
        role: 'waiter', 
        status: 'active' 
      },
      { projection: { password: 0 } } // Exclude password from response
    )

    if (!waiter) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN or waiter not found' },
        { status: 404 }
      )
    }

    // Return waiter info
    const waiterInfo = {
      id: waiter._id.toString(),
      name: waiter.name,
      email: waiter.email,
      role: waiter.role,
      pin: waiter.pin
    }

    return NextResponse.json({
      success: true,
      data: waiterInfo,
      message: 'PIN validated successfully'
    })

  } catch (error) {
    console.error('Error validating PIN:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate PIN' },
      { status: 500 }
    )
  }
}