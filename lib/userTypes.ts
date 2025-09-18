// User Management Types and Interfaces

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  pin?: string; // 4-digit PIN for waiters
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export type UserRole = 'admin' | 'waiter' | 'stall_manager';
export type UserStatus = 'active' | 'inactive';

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  id: number;
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserLoginResponse {
  user: Omit<User, 'password'>;
  token: string;
  expiresAt: string;
}

// User permissions based on role
export const USER_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageMenu: true,
    canViewOrders: true,
    canManageBookings: true,
    canManageCoupons: true,
    canViewReports: true,
    canManageSettings: true,
  },
  waiter: {
    canManageUsers: false,
    canManageMenu: false,
    canViewOrders: true,
    canManageBookings: true,
    canManageCoupons: false,
    canViewReports: false,
    canManageSettings: false,
  },
  stall_manager: {
    canManageUsers: false,
    canManageMenu: true,
    canViewOrders: true,
    canManageBookings: true,
    canManageCoupons: true,
    canViewReports: true,
    canManageSettings: false,
  },
} as const;

// Helper functions for user management
export const getUserPermissions = (role: UserRole) => {
  return USER_PERMISSIONS[role];
};

export const canUserAccess = (userRole: UserRole, permission: keyof typeof USER_PERMISSIONS.admin): boolean => {
  return USER_PERMISSIONS[userRole][permission];
};

export const validateUserData = (userData: CreateUserRequest): string[] => {
  const errors: string[] = [];
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!userData.password || userData.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!['admin', 'waiter'].includes(userData.role)) {
    errors.push('Invalid user role');
  }
  
  return errors;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Mock user data for development
export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'John Admin',
    email: 'admin@restaurant.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-15',
    lastLogin: '2024-01-25T10:30:00Z'
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah@restaurant.com',
    role: 'waiter',
    status: 'active',
    pin: '1234',
    createdAt: '2024-01-20',
    lastLogin: '2024-01-25T09:15:00Z'
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@restaurant.com',
    role: 'waiter',
    status: 'inactive',
    pin: '5678',
    createdAt: '2024-02-01'
  },
  {
    id: '4',
    name: 'Alex Manager',
    email: 'alex@restaurant.com',
    role: 'stall_manager',
    status: 'active',
    createdAt: '2024-01-18',
    lastLogin: '2024-01-25T08:45:00Z'
  },
];

// Generate a random 4-digit PIN
export const generateWaiterPIN = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Validate PIN format
export const isValidPIN = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

// User role display helpers
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames = {
    admin: '👑 Administrator',
    waiter: '👤 Waiter',
    stall_manager: '🏪 Stall Manager'
  };
  return roleNames[role];
};

export const getStatusDisplayName = (status: UserStatus): string => {
  const statusNames = {
    active: '✅ Active',
    inactive: '❌ Inactive'
  };
  return statusNames[status];
};

// Customer management (table-based)
export interface TableCustomer {
  tableNumber: number;
  sessionId: string;
  guestCount: number;
  startTime: string;
  endTime?: string;
  totalAmount?: number;
  status: 'active' | 'completed' | 'cancelled';
}

export const getCustomerByTable = (tableNumber: number): TableCustomer | null => {
  // This would typically fetch from a database or API
  // For now, returning mock data structure
  return {
    tableNumber,
    sessionId: `session_${tableNumber}_${Date.now()}`,
    guestCount: 2,
    startTime: new Date().toISOString(),
    status: 'active'
  };
};