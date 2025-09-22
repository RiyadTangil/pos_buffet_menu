"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

// Simple navigation item interface that matches DynamicNavigation expectations
interface NavItem {
  id: string
  name: string
  href: string
  icon: string
  children?: NavItem[]
}

// Simple role configuration from database
interface RoleConfig {
  role: string
  permissions: string[]
  navigationItems: string[]
}

// All available navigation items
const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { id: 'profile', name: 'Profile', href: '/admin/profile', icon: 'User' },
  { id: 'users', name: 'Users', href: '/admin/users', icon: 'Users' },
  { id: 'tables', name: 'Tables', href: '/admin/tables', icon: 'Table' },
  { id: 'categories', name: 'Categories', href: '/admin/categories', icon: 'Package' },
  { id: 'products', name: 'Products', href: '/admin/products', icon: 'ShoppingCart' },
  { id: 'order-management', name: 'Order Management', href: '/admin/order-management', icon: 'ClipboardList' },
  { id: 'payments', name: 'Payments', href: '/admin/payments', icon: 'CreditCard' },
  { id: 'printers', name: 'Printers', href: '/admin/printers', icon: 'Printer' },
  { id: 'role-management', name: 'Role Management', href: '/admin/role-management', icon: 'Shield' },
  { id: 'settings', name: 'Settings', href: '/admin/settings', icon: 'Settings' }
]

export function useSimpleRBAC() {
  const { data: session } = useSession()
  const [navigationItems, setNavigationItems] = useState<NavItem[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoleData = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        // Get all role configurations from database
        const response = await fetch('/api/rbac/public')
        const data = await response.json()

        if (data.success && data.data) {
          // Get current user's role from session
          const userRole = (session.user as any).role as string
          const roleConfig: RoleConfig = data.data[userRole]

          if (roleConfig) {
            // Set permissions
            setPermissions(roleConfig.permissions)

            // Filter navigation items based on user's allowed items
            const allowedNavItems = ALL_NAV_ITEMS.filter(item => 
              roleConfig.navigationItems.includes(item.id)
            )
            setNavigationItems(allowedNavItems)
          }
        }
      } catch (error) {
        console.error('Error fetching role data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoleData()
  }, [session])

  // Helper function to check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission)
  }

  return {
    // User info
    userRole: (session?.user as any)?.role || 'waiter',
    userId: (session?.user as any)?.id || '',
    userName: session?.user?.name || '',
    
    // Navigation and permissions
    navigationItems,
    permissions,
    hasPermission,
    loading
  }
}