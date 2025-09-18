import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { generateWaiterPIN } from '@/lib/userTypes'

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
      pin: user.pin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin
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

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

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

    // Generate PIN for waiters
    const pin = role === 'waiter' ? generateWaiterPIN() : undefined

    // Create user document
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role,
      status: 'active',
      ...(pin && { pin }),
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
      ...(pin && { pin }),
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