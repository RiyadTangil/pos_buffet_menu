// Client-side RBAC utilities
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export interface RoleConfig {
  role: string
  permissions: string[]
  navigationItems: string[]
}

export interface RBACResponse {
  success: boolean
  data?: Record<string, RoleConfig>
  hasPermission?: boolean
  userRole?: string
  permission?: string
  error?: string
}

// Hook to get user permissions
export function useUserPermissions() {
  const { data: session } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [navigationItems, setNavigationItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        // Try public endpoint first for client-side access
        const response = await fetch('/api/rbac/public')
        let data: RBACResponse
        
        if (response.ok) {
          data = await response.json()
        } else {
          // Fallback to authenticated endpoint
          const authResponse = await fetch('/api/rbac')
          data = await authResponse.json()
        }

        if (data.success && data.data) {
          const userRole = session.user.role as string
          const roleConfig = data.data[userRole]
          
          if (roleConfig) {
            setPermissions(roleConfig.permissions)
            setNavigationItems(roleConfig.navigationItems)
          }
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [session])

  return { permissions, navigationItems, loading }
}

// Hook to check specific permission
export function usePermission(permission: string) {
  const { permissions, loading } = useUserPermissions()
  const hasPermission = permissions.includes(permission)
  
  return { hasPermission, loading }
}

// Function to check permission via API
export async function checkPermission(permission: string): Promise<boolean> {
  try {
    const response = await fetch('/api/rbac', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permission }),
    })

    const data: RBACResponse = await response.json()
    return data.hasPermission || false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Function to update role configuration
export async function updateRoleConfig(role: string, config: RoleConfig): Promise<boolean> {
  try {
    const response = await fetch('/api/rbac', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role, config }),
    })

    const data: RBACResponse = await response.json()
    return data.success || false
  } catch (error) {
    console.error('Error updating role config:', error)
    return false
  }
}

// Component wrapper for permission-based rendering
export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null 
}: { 
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  const { hasPermission, loading } = usePermission(permission)

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

// Navigation item filter based on user role
export function filterNavigationByRole(
  navigationItems: any[], 
  userNavigationItems: string[]
): any[] {
  return navigationItems.filter(item => 
    userNavigationItems.includes(item.id) || 
    userNavigationItems.includes(item.href?.replace('/admin/', ''))
  )
}