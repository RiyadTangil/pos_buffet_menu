import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { generateUniqueWaiterPIN } from '@/lib/userTypes'

// GET - Fetch single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const user = await db.collection(COLLECTIONS.USERS)
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } }
      )

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const formattedUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      ...(user.role === 'waiter' && user.pin && { pin: user.pin })
    }

    return NextResponse.json({
      success: true,
      data: formattedUser
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Check if user exists
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(id) })
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update object
    const updateData: any = {
      updatedAt: new Date().toISOString()
    }

    // Update allowed fields
    if (body.name !== undefined) {
      if (!body.name || body.name.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name must be at least 2 characters long' },
          { status: 400 }
        )
      }
      updateData.name = body.name
    }

    if (body.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email is already taken by another user
      const emailExists = await usersCollection.findOne({
        email: body.email,
        _id: { $ne: new ObjectId(id) }
      })
      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        )
      }
      updateData.email = body.email
    }

    if (body.role !== undefined) {
      if (!['admin', 'waiter'].includes(body.role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid role' },
          { status: 400 }
        )
      }
      updateData.role = body.role
      
      // Generate unique PIN when changing role to waiter
      if (body.role === 'waiter' && existingUser.role !== 'waiter') {
        // Get existing PINs to ensure uniqueness
        const existingWaiters = await usersCollection
          .find({ role: 'waiter', pin: { $exists: true } }, { projection: { pin: 1 } })
          .toArray()
        
        const existingPins = existingWaiters
          .map(waiter => waiter.pin)
          .filter(Boolean) as string[]
        
        updateData.pin = await generateUniqueWaiterPIN(existingPins)
      }
      
      // Remove PIN when changing role from waiter to admin
      if (body.role === 'admin' && existingUser.role === 'waiter') {
        updateData.pin = null
      }
    }

    if (body.status !== undefined) {
      if (!['active', 'inactive'].includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        )
      }
      updateData.status = body.status
    }

    // Handle password update
    if (body.password !== undefined) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters long' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(body.password, 12)
    }

    // Update user
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch updated user
    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    )

    const formattedUser = {
      id: updatedUser!._id.toString(),
      name: updatedUser!.name,
      email: updatedUser!.email,
      role: updatedUser!.role,
      status: updatedUser!.status,
      createdAt: updatedUser!.createdAt,
      updatedAt: updatedUser!.updatedAt,
      lastLogin: updatedUser!.lastLogin,
      ...(updatedUser!.role === 'waiter' && updatedUser!.pin && { pin: updatedUser!.pin })
    }

    return NextResponse.json({
      success: true,
      data: formattedUser,
      message: 'User updated successfully'
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Check if user exists
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(id) })
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}