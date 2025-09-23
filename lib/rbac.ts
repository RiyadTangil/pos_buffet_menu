// Role-Based Access Control (RBAC) System
// Enhanced system for managing user roles, permissions, and navigation

import { UserRole } from './userTypes'

// Define all possible permissions in the system
export type Permission = 
  | 'dashboard.view'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'tables.view'
  | 'tables.manage'
  | 'categories.view'
  | 'categories.manage'
  | 'products.view'
  | 'products.manage'
  | 'orders.view'
  | 'orders.manage'
  | 'payments.view'
  | 'payments.manage'
  | 'printers.view'
  | 'printers.manage'
  | 'settings.view'
  | 'settings.manage'
  | 'profile.view'
  | 'my-payments.view'
  | 'profile.edit'
  | 'reports.view'
  | 'reports.generate'
  | 'roles.manage'

// Navigation item configuration
export interface NavigationItem {
  id: string
  name: string
  href: string
  icon: string
  requiredPermissions: Permission[]
  isVisible: boolean
  order: number
  children?: NavigationItem[]
}

// Role configuration with permissions
export interface RoleConfig {
  name: string
  displayName: string
  permissions: Permission[]
  defaultNavigation: string[] // Array of navigation item IDs
  canBeCustomized: boolean
}

// User-specific navigation override
export interface UserNavigationConfig {
  userId: string
  role: UserRole
  visibleNavItems: string[] // Array of navigation item IDs
  customPermissions?: Permission[] // Additional permissions for this user
  updatedAt: string
  updatedBy: string
}

// Default role configurations
export const DEFAULT_ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    permissions: [
      'dashboard.view',
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'tables.view', 'tables.manage',
      'categories.view', 'categories.manage',
      'products.view', 'products.manage',
      'orders.view', 'orders.manage',
      'payments.view', 'payments.manage',
      'printers.view', 'printers.manage',
      'settings.view', 'settings.manage',
      'profile.view', 'profile.edit',
      'reports.view', 'reports.generate',
      'roles.manage'
    ],
    defaultNavigation: [
      'dashboard', 'users', 'tables', 'categories', 'products', 
      'order-management', 'payments', 'printers', 'role-management', 'settings', 'profile'
    ],
    canBeCustomized: true
  },
  waiter: {
    name: 'waiter',
    displayName: 'Waiter',
    permissions: [
      'dashboard.view',
      'tables.view',
      'orders.view', 'orders.create', 'orders.edit',
      'payments.view', 'payments.process',  'my-payments.view',
      'products.view',
      'categories.view',
      'profile.view', 'profile.edit'
    ],
    defaultNavigation: ['dashboard', 'profile', 'payments','my-payments', 'products', 'categories'],
    canBeCustomized: true
  },
  stall_manager: {
    name: 'stall_manager',
    displayName: 'Stall Manager',
    permissions: [
      'dashboard.view',
      'tables.view', 'tables.manage',
      'categories.view', 'categories.manage',
      'products.view', 'products.manage',
      'orders.view', 'orders.manage',
      'payments.view', 'payments.manage',
      'profile.view', 'profile.edit',
      'reports.view'
    ],
    defaultNavigation: [
      'dashboard', 'tables', 'categories', 'products', 
      'order-management', 'payments', 'profile'
    ],
    canBeCustomized: true
  }
}

// All available navigation items
export const ALL_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: 'LayoutDashboard',
    requiredPermissions: ['dashboard.view'],
    isVisible: true,
    order: 1
  },
  {
    id: 'profile',
    name: 'Profile',
    href: '/admin/profile',
    icon: 'User',
    requiredPermissions: ['profile.view'],
    isVisible: true,
    order: 2
  },
  {
    id: 'users',
    name: 'Users',
    href: '/admin/users',
    icon: 'Users',
    requiredPermissions: ['users.view'],
    isVisible: true,
    order: 3
  },
  {
    id: 'tables',
    name: 'Tables',
    href: '/admin/tables',
    icon: 'Table',
    requiredPermissions: ['tables.view'],
    isVisible: true,
    order: 4
  },
  {
    id: 'categories',
    name: 'Categories',
    href: '/admin/categories',
    icon: 'Package',
    requiredPermissions: ['categories.view'],
    isVisible: true,
    order: 5
  },
  {
    id: 'products',
    name: 'Products',
    href: '/admin/products',
    icon: 'ShoppingCart',
    requiredPermissions: ['products.view'],
    isVisible: true,
    order: 6
  },
  {
    id: 'order-management',
    name: 'Order Management',
    href: '/admin/order-management',
    icon: 'ClipboardList',
    requiredPermissions: ['orders.view'],
    isVisible: true,
    order: 7
  },
  {
    id: 'payments',
    name: 'Payments',
    href: '/admin/payments',
    icon: 'CreditCard',
    requiredPermissions: ['payments.view'],
    isVisible: true,
    order: 8
  },
  {
    id: 'my-payments',
    name: 'Payments',
    href: '/admin/my-payments',
    icon: 'CreditCard',
    requiredPermissions: ['my-payments.view'],
    isVisible: true,
    order: 12
  },
  {
    id: 'printers',
    name: 'Printers',
    href: '/admin/printers',
    icon: 'Printer',
    requiredPermissions: ['printers.view'],
    isVisible: true,
    order: 9
  },
  {
    id: 'role-management',
    name: 'Role Management',
    href: '/admin/role-management',
    icon: 'Shield',
    requiredPermissions: ['roles.manage'],
    isVisible: true,
    order: 10
  },
  {
    id: 'settings',
    name: 'Settings',
    href: '/admin/settings',
    icon: 'Settings',
    requiredPermissions: ['settings.view'],
    isVisible: true,
    order: 11
  }
]

// RBAC Helper Functions
export class RBACManager {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userRole: UserRole, permission: Permission, customPermissions?: Permission[]): boolean {
    const roleConfig = DEFAULT_ROLE_CONFIGS[userRole]
    const hasRolePermission = roleConfig.permissions.includes(permission)
    const hasCustomPermission = customPermissions?.includes(permission) || false
    
    return hasRolePermission || hasCustomPermission
  }

  /**
   * Get all permissions for a user role
   */
  static getUserPermissions(userRole: UserRole, customPermissions?: Permission[]): Permission[] {
    const rolePermissions = DEFAULT_ROLE_CONFIGS[userRole].permissions
    const allPermissions = [...rolePermissions]
    
    if (customPermissions) {
      customPermissions.forEach(permission => {
        if (!allPermissions.includes(permission)) {
          allPermissions.push(permission)
        }
      })
    }
    
    return allPermissions
  }

  /**
   * Get navigation items for a user based on their role and custom config
   */
  static getNavigationItems(
    userRole: UserRole, 
    customNavConfig?: UserNavigationConfig,
    customPermissions?: Permission[]
  ): NavigationItem[] {
    const roleConfig = DEFAULT_ROLE_CONFIGS[userRole]
    const visibleNavIds = customNavConfig?.visibleNavItems || roleConfig.defaultNavigation
    
    return ALL_NAVIGATION_ITEMS
      .filter(item => {
        // Check if item is in visible nav items
        const isVisible = visibleNavIds.includes(item.id)
        
        // Check if user has required permissions
        const hasPermissions = item.requiredPermissions.every(permission => 
          this.hasPermission(userRole, permission, customPermissions)
        )
        
        return isVisible && hasPermissions && item.isVisible
      })
      .sort((a, b) => a.order - b.order)
  }

  /**
   * Check if a user can access a specific route
   */
  static canAccessRoute(
    userRole: UserRole, 
    route: string, 
    customPermissions?: Permission[]
  ): boolean {
    const navItem = ALL_NAVIGATION_ITEMS.find(item => item.href === route)
    
    if (!navItem) {
      // If route is not in navigation items, check basic role access
      return userRole === 'admin'
    }
    
    return navItem.requiredPermissions.every(permission => 
      this.hasPermission(userRole, permission, customPermissions)
    )
  }

  /**
   * Get available navigation items that can be assigned to a role
   */
  static getAvailableNavItems(userRole: UserRole): NavigationItem[] {
    const userPermissions = this.getUserPermissions(userRole)
    
    return ALL_NAVIGATION_ITEMS.filter(item => 
      item.requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      )
    )
  }

  /**
   * Validate navigation configuration for a user
   */
  static validateNavigationConfig(
    userRole: UserRole, 
    navItemIds: string[],
    customPermissions?: Permission[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const availableItems = this.getAvailableNavItems(userRole)
    const availableIds = availableItems.map(item => item.id)
    
    navItemIds.forEach(navId => {
      if (!availableIds.includes(navId)) {
        const navItem = ALL_NAVIGATION_ITEMS.find(item => item.id === navId)
        if (navItem) {
          errors.push(`User role '${userRole}' does not have permission to access '${navItem.name}'`)
        } else {
          errors.push(`Navigation item '${navId}' does not exist`)
        }
      }
    })
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export types and constants
export type { UserRole } from './userTypes'