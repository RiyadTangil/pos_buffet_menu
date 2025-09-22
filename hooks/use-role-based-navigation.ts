"use client"

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { RBACManager, NavigationItem, UserRole } from '@/lib/rbac'
import { useUserPermissions, updateRoleConfig } from '@/lib/rbac-client'

export function useRoleBasedNavigation(session: Session | null) {
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([])
  const { permissions, navigationItems: allowedNavItems, loading } = useUserPermissions()

  useEffect(() => {
    if (session?.user?.id && !loading && allowedNavItems.length > 0) {
      // Get navigation items based on user role and permissions
      const userRole = session.user.role as UserRole
      const allItems = RBACManager.getNavigationItems(userRole)
      
      // Filter navigation items based on user's allowed navigation items
     
      const filteredItems = allItems.filter(item => {
        const itemId = item.href.replace('/admin/', '')
        return allowedNavItems.includes(itemId) || allowedNavItems.includes(item.id)
      })
      
      setNavigationItems(filteredItems)
    }
  }, [session?.user?.id, session?.user?.role, allowedNavItems, loading])

  const updateNavigationConfig = async (navItemIds: string[]) => {
    if (!session?.user?.role) return

    try {
      const userRole = session.user.role as string
      const success = await updateRoleConfig(userRole, {
        role: userRole,
        permissions,
        navigationItems: navItemIds
      })
      
      if (success) {
        // The useUserPermissions hook will automatically refetch and update
        console.log('Navigation configuration updated successfully')
      }
    } catch (error) {
      console.error('Failed to update navigation config:', error)
    }
  }

  return {
    navigationItems,
    userRole: (session?.user?.role as UserRole) || 'waiter',
    userId: session?.user?.id || '',
    userName: session?.user?.name || '',
    permissions,
    loading,
    updateNavigationConfig
  }
}