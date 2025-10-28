import { NextRequest, NextResponse } from 'next/server'
import { getRBACCollection } from '@/lib/mongodb'
import { DEFAULT_ROLE_CONFIGURATIONS } from '@/lib/models/rbac'

// POST - Reset RBAC configurations to defaults
export async function POST(request: NextRequest) {
  try {
    const rbacCollection = await getRBACCollection()
    
    // Clear existing roles
    await rbacCollection.deleteMany({})
    
    // Insert default role configurations
    const rolesWithTimestamps = DEFAULT_ROLE_CONFIGURATIONS.map(role => ({
      ...role,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    
    await rbacCollection.insertMany(rolesWithTimestamps)
    console.log('RBAC roles reset to defaults')
    
    return NextResponse.json({
      success: true,
      message: 'RBAC roles reset successfully'
    })
  } catch (error) {
    console.error('Error resetting RBAC roles:', error)
    return NextResponse.json(
      { error: 'Failed to reset RBAC roles' },
      { status: 500 }
    )
  }
}