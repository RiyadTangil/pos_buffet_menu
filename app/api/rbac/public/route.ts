import { NextRequest, NextResponse } from 'next/server'
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

// GET - Public access to role configurations for client-side RBAC
export async function GET(request: NextRequest) {
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