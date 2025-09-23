import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// POST - Check PIN uniqueness
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, excludeUserId } = body

    // Validation
    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'PIN is required' },
        { status: 400 }
      )
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Build query to check for existing PIN
    const query: any = { 
      role: 'waiter', 
      pin: pin 
    }

    // Exclude current user if updating existing user
    if (excludeUserId) {
      query._id = { $ne: new ObjectId(excludeUserId) }
    }

    // Check if PIN already exists
    const existingPinUser = await usersCollection.findOne(query)

    if (existingPinUser) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'This PIN is already in use by another waiter'
      })
    }

    return NextResponse.json({
      success: true,
      available: true,
      message: 'PIN is available'
    })

  } catch (error) {
    console.error('Error checking PIN:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check PIN' },
      { status: 500 }
    )
  }
}