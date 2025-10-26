// Client-side API functions for table management

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'

export interface Table {
  id: string
  number: number
  status: 'available' | 'occupied' | 'cleaning' | 'selected'
  capacity: number
  currentGuests: number
  createdAt: string
  updatedAt: string
  currentOrders?: number
  totalItems?: number
}

export interface CreateTableData {
  number: number
  capacity?: number
  status?: 'available' | 'occupied' | 'cleaning' | 'selected'
}

export interface UpdateTableData {
  number?: number
  status?: 'available' | 'occupied' | 'cleaning' | 'selected'
  capacity?: number
  currentGuests?: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Fetch all tables
export async function fetchTables(): Promise<Table[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/tables`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Table[]> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch tables')
    }

    return result.data || []
  } catch (error) {
    console.error('Error fetching tables:', error)
    throw error
  }
}

// Fetch a single table by ID
export async function fetchTableById(id: string): Promise<Table> {
  try {
    const response = await fetch(`${API_BASE_URL}/tables/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Table> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch table')
    }

    if (!result.data) {
      throw new Error('Table not found')
    }

    return result.data
  } catch (error) {
    console.error('Error fetching table:', error)
    throw error
  }
}

// Create a new table
export async function createTable(tableData: CreateTableData): Promise<Table> {
  try {
    const response = await fetch(`${API_BASE_URL}/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tableData),
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorResult = await response.json()
        errorMessage = errorResult.error || errorMessage
      } catch (parseError) {
        // If we can't parse the error response, use the default message
        console.error('Failed to parse error response:', parseError)
      }
      throw new Error(errorMessage)
    }

    const result: ApiResponse<Table> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create table')
    }

    if (!result.data) {
      throw new Error('No table data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error creating table:', error)
    // Re-throw the error to ensure it propagates to the UI
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred while creating the table')
  }
}

// Update a table
export async function updateTable(id: string, updateData: UpdateTableData): Promise<Table> {
  try {
    const response = await fetch(`${API_BASE_URL}/tables/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorResult = await response.json()
        errorMessage = errorResult.error || errorMessage
      } catch (parseError) {
        // If we can't parse the error response, use the default message
        console.error('Failed to parse error response:', parseError)
      }
      throw new Error(errorMessage)
    }

    const result: ApiResponse<Table> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update table')
    }

    if (!result.data) {
      throw new Error('No table data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error updating table:', error)
    // Re-throw the error to ensure it propagates to the UI
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred while updating the table')
  }
}

// Delete a table
export async function deleteTable(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/tables/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorResult = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<void> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete table')
    }
  } catch (error) {
    console.error('Error deleting table:', error)
    throw error
  }
}

// Update table status (convenience function)
export async function updateTableStatus(
  id: string, 
  status: 'available' | 'occupied' | 'cleaning' | 'selected'
): Promise<Table> {
  return updateTable(id, { status })
}

// Update table guest count (convenience function)
export async function updateTableGuests(id: string, currentGuests: number): Promise<Table> {
  return updateTable(id, { currentGuests })
}

// Get table statistics
export async function getTableStatistics(): Promise<{
  total: number
  available: number
  occupied: number
  cleaning: number
  selected: number
}> {
  try {
    const tables = await fetchTables()
    
    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length,
      selected: tables.filter(t => t.status === 'selected').length,
    }

    return stats
  } catch (error) {
    console.error('Error getting table statistics:', error)
    throw error
  }
}