"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { RBACManager, UserRole } from "@/lib/rbac"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft } from "lucide-react"

interface RouteProtectionProps {
  children: React.ReactNode
  requiredPermission?: string
  allowedRoles?: UserRole[]
  fallbackPath?: string
}

export function RouteProtection({ 
  children, 
  requiredPermission, 
  allowedRoles, 
  fallbackPath = "/admin/dashboard" 
}: RouteProtectionProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") {
      setLoading(true)
      return
    }

    if (status === "unauthenticated") {
      router.push("/auth/admin/login")
      return
    }

    if (session?.user) {
      const userRole = session.user.role as UserRole
      const userId = session.user.id
      
      // Check if user can access this route
      const canAccess = RBACManager.canAccessRoute(userRole, pathname, userId)
      
      // Additional permission check if specified
      if (requiredPermission && canAccess) {
        const hasPermission = RBACManager.hasPermission(userRole, requiredPermission, userId)
        setIsAuthorized(hasPermission)
      } else if (allowedRoles && canAccess) {
        const roleAllowed = allowedRoles.includes(userRole)
        setIsAuthorized(roleAllowed)
      } else {
        setIsAuthorized(canAccess)
      }
    } else {
      setIsAuthorized(false)
    }
    
    setLoading(false)
  }, [session, status, pathname, requiredPermission, allowedRoles, router])

  // Show loading state
  if (loading || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized message
  if (isAuthorized === false) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <Shield className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Access Denied</h3>
                  <p className="text-sm">
                    You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(fallbackPath)}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push("/admin/profile")}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Render children if authorized
  return <>{children}</>
}

// Higher-order component for page-level protection
export function withRouteProtection<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredPermission?: string
    allowedRoles?: UserRole[]
    fallbackPath?: string
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteProtection {...options}>
        <Component {...props} />
      </RouteProtection>
    )
  }
}

// Hook for checking permissions in components
export function usePermissions() {
  const { data: session } = useSession()
  
  const hasPermission = (permission: string): boolean => {
    if (!session?.user?.role) return false
    const userRole = session.user.role as UserRole
    const userId = session.user.id
    return RBACManager.hasPermission(userRole, permission, userId)
  }
  
  const canAccessRoute = (route: string): boolean => {
    if (!session?.user?.role) return false
    const userRole = session.user.role as UserRole
    const userId = session.user.id
    return RBACManager.canAccessRoute(userRole, route, userId)
  }
  
  const getUserRole = (): UserRole | null => {
    return (session?.user?.role as UserRole) || null
  }
  
  const isAdmin = (): boolean => {
    return session?.user?.role === 'admin'
  }
  
  const isWaiter = (): boolean => {
    return session?.user?.role === 'waiter'
  }
  
  const isStallManager = (): boolean => {
    return session?.user?.role === 'stall_manager'
  }
  
  return {
    hasPermission,
    canAccessRoute,
    getUserRole,
    isAdmin,
    isWaiter,
    isStallManager,
    user: session?.user
  }
}

// Component for conditional rendering based on permissions
interface PermissionGateProps {
  children: React.ReactNode
  permission?: string
  roles?: UserRole[]
  fallback?: React.ReactNode
}

export function PermissionGate({ children, permission, roles, fallback = null }: PermissionGateProps) {
  const { hasPermission, getUserRole } = usePermissions()
  const userRole = getUserRole()
  
  let hasAccess = true
  
  if (permission) {
    hasAccess = hasPermission(permission)
  }
  
  if (roles && userRole) {
    hasAccess = hasAccess && roles.includes(userRole)
  }
  
  return hasAccess ? <>{children}</> : <>{fallback}</>
}