import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { generateWaiterPIN, generateUniqueWaiterPIN } from '@/lib/userTypes'

// GET - Fetch all users
export async function GET() {
  try {
    const db = await getDatabase()
    const users = await db.collection(COLLECTIONS.USERS)
      .find({}, { projection: { password: 0 } }) // Exclude password from response
      .sort({ createdAt: -1 })
      .toArray()

    // Convert MongoDB _id to id for frontend compatibility
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      ...(user.role === 'waiter' && user.pin && { pin: user.pin })
    }))

    return NextResponse.json({
      success: true,
      data: formattedUsers
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, pin } = body

    // Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    if (!['admin', 'waiter', 'stall_manager'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Handle PIN for waiters
    let finalPin: string | undefined = undefined
    if (role === 'waiter') {
      if (pin) {
        // Validate provided PIN
        if (!/^\d{4}$/.test(pin)) {
          return NextResponse.json(
            { success: false, error: 'PIN must be exactly 4 digits' },
            { status: 400 }
          )
        }
        
        // Check if PIN already exists
        const existingPinUser = await usersCollection.findOne({ 
          role: 'waiter', 
          pin: pin 
        })
        if (existingPinUser) {
          return NextResponse.json(
            { success: false, error: 'This PIN is already in use by another waiter' },
            { status: 409 }
          )
        }
        
        finalPin = pin
      } else {
        // Generate unique PIN automatically
        const existingWaiters = await usersCollection
          .find({ role: 'waiter', pin: { $exists: true } }, { projection: { pin: 1 } })
          .toArray()
        
        const existingPins = existingWaiters
          .map(waiter => waiter.pin)
          .filter(Boolean) as string[]
        
        finalPin = await generateUniqueWaiterPIN(existingPins)
      }
    }

    // Create user document
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role,
      status: 'active',
      ...(finalPin && { pin: finalPin }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await usersCollection.insertOne(newUser)

    // Return user without password
    const createdUser = {
      id: result.insertedId.toString(),
      name,
      email,
      role,
      status: 'active',
      ...(finalPin && { pin: finalPin }),
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: createdUser,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}