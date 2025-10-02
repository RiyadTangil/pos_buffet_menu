import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'

// POST - Verify waiter PIN
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body

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

    return NextResponse.json({
      success: true,
      data: {
        name: waiter.name,
        role: waiter.role,
        verified: true
      }
    })
  } catch (error) {
    console.error('Error verifying waiter PIN:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify PIN' },
      { status: 500 }
    )
  }
}