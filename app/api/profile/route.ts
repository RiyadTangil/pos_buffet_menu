import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - Fetch current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = await getDatabase()
    const user = await db.collection(COLLECTIONS.USERS)
      .findOne(
        { _id: new ObjectId(session.user.id) },
        { projection: { password: 0 } }
      )

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const profile = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar || null,
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      bio: user.bio || '',
      location: user.location || '',
      timezone: user.timezone || 'UTC',
      language: user.language || 'en',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      ...(user.role === 'waiter' && user.pin && { pin: user.pin })
    }

    return NextResponse.json({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PUT - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Get current user data first
    const currentUser = await usersCollection.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { password: 0 } }
    )

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update data - only update fields that are provided
    const updateData: any = {
      updatedAt: new Date().toISOString()
    }

    // Handle individual field updates
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.email !== undefined) {
      if (!body.email.trim()) {
        return NextResponse.json(
          { success: false, error: 'Email cannot be empty' },
          { status: 400 }
        )
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email is already taken by another user
      if (body.email !== currentUser.email) {
        const existingUser = await usersCollection.findOne({ 
          email: body.email, 
          _id: { $ne: new ObjectId(session.user.id) } 
        })
        
        if (existingUser) {
          return NextResponse.json(
            { success: false, error: 'Email is already taken' },
            { status: 409 }
          )
        }
      }
      updateData.email = body.email.trim()
    }

    // Handle other optional fields
    if (body.phone !== undefined) updateData.phone = body.phone || ''
    if (body.department !== undefined) updateData.department = body.department || ''
    if (body.position !== undefined) updateData.position = body.position || ''
    if (body.bio !== undefined) updateData.bio = body.bio || ''
    if (body.location !== undefined) updateData.location = body.location || ''
    if (body.timezone !== undefined) updateData.timezone = body.timezone || 'UTC'
    if (body.language !== undefined) updateData.language = body.language || 'en'
    if (body.avatar !== undefined) updateData.avatar = body.avatar
    if (body.address !== undefined) updateData.address = body.address || ''
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact || ''

    // Update user profile
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch updated user data
    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { password: 0 } }
    )

    const profile = {
      id: updatedUser!._id.toString(),
      name: updatedUser!.name,
      email: updatedUser!.email,
      role: updatedUser!.role,
      status: updatedUser!.status,
      avatar: updatedUser!.avatar || null,
      phone: updatedUser!.phone || '',
      department: updatedUser!.department || '',
      position: updatedUser!.position || '',
      bio: updatedUser!.bio || '',
      location: updatedUser!.location || '',
      timezone: updatedUser!.timezone || 'UTC',
      language: updatedUser!.language || 'en',
      address: updatedUser!.address || '',
      emergencyContact: updatedUser!.emergencyContact || '',
      createdAt: updatedUser!.createdAt,
      updatedAt: updatedUser!.updatedAt,
      lastLogin: updatedUser!.lastLogin
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}