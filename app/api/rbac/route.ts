import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRBACCollection } from '@/lib/mongodb'
import { RoleConfiguration, DEFAULT_ROLE_CONFIGURATIONS } from '@/lib/models/rbac'

// Helper function to initialize default role configurations
async function initializeDefaultRoles() {
  try {
    const rbacCollection = await getRBACCollection()
    
    // Check if roles already exist
    const existingRoles = await rbacCollection.find({}).toArray()
    
    if (existingRoles.length === 0) {
      // Insert default role configurations
      const rolesWithTimestamps = DEFAULT_ROLE_CONFIGURATIONS.map(role => ({
        ...role,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      
      await rbacCollection.insertMany(rolesWithTimestamps)
      console.log('Default RBAC roles initialized')
    }
  } catch (error) {
    console.error('Error initializing default roles:', error)
  }
}

// Helper function to get all role configurations
async function getAllRoleConfigurations() {
  const rbacCollection = await getRBACCollection()
  const roles = await rbacCollection.find({}).toArray()
  
  // Convert to the expected format
  const roleConfigurations: Record<string, RoleConfiguration> = {}
  roles.forEach(role => {
    roleConfigurations[role.role] = {
      role: role.role,
      permissions: role.permissions,
      navigationItems: role.navigationItems
    }
  })
  
  return roleConfigurations
}

// GET - Get role configurations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize default roles if needed
    await initializeDefaultRoles()
    
    // Get role configurations from MongoDB
    const roleConfigurations = await getAllRoleConfigurations()

    // Only admins can view all role configurations
    if (session.user.role !== 'admin') {
      // Non-admins can only see their own role configuration
      const userRole = session.user.role as string
      const userRoleConfig = roleConfigurations[userRole]
      
      if (!userRoleConfig) {
        return NextResponse.json({ error: 'Role configuration not found' }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        data: { [userRole]: userRoleConfig }
      })
    }

    return NextResponse.json({
      success: true,
      data: roleConfigurations
    })
  } catch (error) {
    console.error('Error fetching role configurations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role configurations' },
      { status: 500 }
    )
  }
}

// GET endpoint for public access to role configurations (for client-side RBAC)
export async function OPTIONS(request: NextRequest) {
  try {
    // Initialize default roles if needed
    await initializeDefaultRoles()
    
    // Get role configurations from MongoDB
    const roleConfigurations = await getAllRoleConfigurations()
    
    return NextResponse.json({
      success: true,
      data: roleConfigurations
    })
  } catch (error) {
    console.error('Error fetching public role configurations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role configurations' },
      { status: 500 }
    )
  }
}

// POST - Update role configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, config } = await request.json()

    if (!role || !config) {
      return NextResponse.json(
        { error: 'Role and config are required' },
        { status: 400 }
      )
    }

    // Don't allow modifying admin role
    if (role === 'admin') {
      return NextResponse.json(
        { error: 'Admin role cannot be modified' },
        { status: 403 }
      )
    }

    // Update the role configuration in MongoDB
    const rbacCollection = await getRBACCollection()
    
    const updateData = {
      ...config,
      updatedAt: new Date()
    }
    
    const result = await rbacCollection.updateOne(
      { role: role },
      { 
        $set: updateData,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    if (result.matchedCount === 0 && result.upsertedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update role configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${role} configuration updated successfully`,
      data: config
    })
  } catch (error) {
    console.error('Error updating role configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update role configuration' },
      { status: 500 }
    )
  }
}

// PUT - Check user permissions
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { permission } = await request.json()

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission is required' },
        { status: 400 }
      )
    }

    // Initialize default roles if needed
    await initializeDefaultRoles()
    
    // Get role configurations from MongoDB
    const roleConfigurations = await getAllRoleConfigurations()
    
    const userRole = session.user.role as string
    const roleConfig = roleConfigurations[userRole]

    if (!roleConfig) {
      return NextResponse.json(
        { error: 'Role configuration not found' },
        { status: 404 }
      )
    }

    const hasPermission = roleConfig.permissions.includes(permission)

    return NextResponse.json({
      success: true,
      hasPermission,
      userRole,
      permission
    })
  } catch (error) {
    console.error('Error checking permission:', error)
    return NextResponse.json(
      { error: 'Failed to check permission' },
      { status: 500 }
    )
  }
}