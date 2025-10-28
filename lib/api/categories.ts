import { MenuCategory } from '@/lib/mockData'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Fetch all categories
export async function fetchCategories(queryParams?: string): Promise<MenuCategory[]> {
  try {
    const url = queryParams ? `${API_BASE_URL}/api/categories${queryParams}` : `${API_BASE_URL}/api/categories`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<MenuCategory[]> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch categories')
    }

    return result.data || []
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

// Fetch a specific category by ID
export async function fetchCategoryById(id: string): Promise<MenuCategory> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<MenuCategory> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch category')
    }

    if (!result.data) {
      throw new Error('Category not found')
    }

    return result.data
  } catch (error) {
    console.error('Error fetching category:', error)
    throw error
  }
}

// Create a new category
export async function createCategory(categoryData: Omit<MenuCategory, 'id'>): Promise<MenuCategory> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<MenuCategory> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create category')
    }

    if (!result.data) {
      throw new Error('No category data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error creating category:', error)
    throw error
  }
}

// Update an existing category
export async function updateCategory(id: string, categoryData: Omit<MenuCategory, 'id'>): Promise<MenuCategory> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<MenuCategory> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update category')
    }

    if (!result.data) {
      throw new Error('No category data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error updating category:', error)
    throw error
  }
}

// Delete a category
export async function deleteCategory(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<MenuCategory> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete category')
    }
  } catch (error) {
    console.error('Error deleting category:', error)
    throw error
  }
}