// User API service functions

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'waiter'
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt?: string
  lastLogin?: string
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: 'admin' | 'waiter'
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: 'admin' | 'waiter'
  status?: 'active' | 'inactive'
  password?: string
}

const API_BASE_URL = '/api'

// Fetch all users
export async function fetchUsers(): Promise<ApiResponse<User[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching users:', error)
    return {
      success: false,
      error: 'Failed to fetch users'
    }
  }
}

// Create new user
export async function createUser(userData: CreateUserRequest & { pin?: string }): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error creating user:', error)
    return {
      success: false,
      error: 'Failed to create user'
    }
  }
}

// Update user
export async function updateUser(id: string, userData: UpdateUserRequest): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating user:', error)
    return {
      success: false,
      error: 'Failed to update user'
    }
  }
}

// Delete user
export async function deleteUser(id: string): Promise<ApiResponse<null>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error deleting user:', error)
    return {
      success: false,
      error: 'Failed to delete user'
    }
  }
}

// Toggle user status (activate/deactivate)
export async function toggleUserStatus(id: string, currentStatus: 'active' | 'inactive'): Promise<ApiResponse<User>> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  return updateUser(id, { status: newStatus })
}

// Validation helpers
export const validateUserData = (userData: CreateUserRequest): string[] => {
  const errors: string[] = []
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long')
  }
  
  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Please provide a valid email address')
  }
  
  if (!userData.password || userData.password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }
  
  if (!['admin', 'waiter'].includes(userData.role)) {
    errors.push('Invalid user role')
  }
  
  return errors
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Display helpers
export const getRoleDisplayName = (role: 'admin' | 'waiter'): string => {
  const roleNames = {
    admin: '👑 Administrator',
    waiter: '👤 Waiter'
  }
  return roleNames[role]
}

export const getStatusDisplayName = (status: 'active' | 'inactive'): string => {
  const statusNames = {
    active: '✅ Active',
    inactive: '❌ Inactive'
  }
  return statusNames[status]
}

// Update user profile field
export async function updateUserField(userId: string, field: string, value: any): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [field]: value }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating user field:', error)
    return {
      success: false,
      error: 'Failed to update user field'
    }
  }
}