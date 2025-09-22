import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'

// PUT - Change current user's password
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
    const { currentPassword, newPassword } = body

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check password complexity
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)

    if (!hasLowerCase || !hasUpperCase || !hasNumbers || !hasSpecialChar) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character' 
        },
        { status: 400 }
      )
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection(COLLECTIONS.USERS)

    // Get current user with password
    const user = await usersCollection.findOne({ _id: new ObjectId(session.user.id) })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          password: hashedNewPassword,
          updatedAt: new Date().toISOString(),
          passwordChangedAt: new Date().toISOString()
        } 
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    )
  }
}