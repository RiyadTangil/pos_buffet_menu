import { ObjectId } from 'mongodb'

export interface RoleConfiguration {
  _id?: ObjectId
  role: string
  permissions: string[]
  navigationItems: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface RBACDocument extends RoleConfiguration {
  _id: ObjectId
  createdAt: Date
  updatedAt: Date
}

// Default role configurations for initial setup
export const DEFAULT_ROLE_CONFIGURATIONS: Omit<RoleConfiguration, '_id' | 'createdAt' | 'updatedAt'>[] = [
  {
    role: 'waiter',
    permissions: [
      'orders.view', 'orders.create', 'orders.edit',
      'payments.view', 'payments.process',
      'tables.view',
      'products.view',
      'categories.view'
    ],
    navigationItems: ['profile', 'payments', 'products', 'categories']
  },
  {
    role: 'stall_manager',
    permissions: [
      'products.view', 'products.create', 'products.edit',
      'orders.view', 'orders.create', 'orders.edit',
      'payments.view', 'payments.process',
      'tables.view', 'tables.manage',
      'categories.view'
    ],
    navigationItems: ['profile', 'order-management', 'payments', 'products']
  },
  {
    role: 'admin',
    permissions: [
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'products.view', 'products.create', 'products.edit', 'products.delete',
      'orders.view', 'orders.create', 'orders.edit', 'orders.delete',
      'payments.view', 'payments.process', 'payments.refund',
      'tables.view', 'tables.manage',
      'categories.view', 'categories.manage',
      'settings.view', 'settings.edit',
      'reports.view', 'reports.export',
      'roles.manage'
    ],
    navigationItems: [
      'dashboard', 'users', 'tables', 'categories', 'products', 
      'order-management', 'payments', 'role-management', 'settings', 'profile'
    ]
  }
]