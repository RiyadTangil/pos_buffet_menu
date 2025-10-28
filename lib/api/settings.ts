// Types for buffet settings
export interface SessionConfig {
  name: string
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  adultPrice: number
  childPrice: number
  infantPrice: number
  isActive: boolean
  nextOrderAvailableInMinutes: number
}

export interface ExtraDrinksPricing {
  adultPrice: number
  childPrice: number
  infantPrice: number
}

export interface SessionSpecificExtraDrinksPricing {
  breakfast: ExtraDrinksPricing
  lunch: ExtraDrinksPricing
  dinner: ExtraDrinksPricing
}

// Interface for items limit per user type
export interface ItemsLimit {
  adultLimit: number
  childLimit: number
  infantLimit: number
}

// Interface for session-specific items limit
export interface SessionSpecificItemsLimit {
  breakfast: ItemsLimit
  lunch: ItemsLimit
  dinner: ItemsLimit
}

export interface BuffetSettings {
  id?: string
  sessions: {
    breakfast: SessionConfig
    lunch: SessionConfig
    dinner: SessionConfig
  }
  extraDrinksPrice: number // Keep for backward compatibility
  extraDrinksPricing: ExtraDrinksPricing // Keep for backward compatibility
  sessionSpecificExtraDrinksPricing: SessionSpecificExtraDrinksPricing
  itemsLimit?: ItemsLimit // Keep for backward compatibility
  sessionSpecificItemsLimit?: SessionSpecificItemsLimit
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateBuffetSettingsData {
  sessions: {
    breakfast: SessionConfig
    lunch: SessionConfig
    dinner: SessionConfig
  }
  extraDrinksPrice: number // Keep for backward compatibility
  extraDrinksPricing: ExtraDrinksPricing // Keep for backward compatibility
  sessionSpecificExtraDrinksPricing: SessionSpecificExtraDrinksPricing
  itemsLimit?: ItemsLimit // Keep for backward compatibility
  sessionSpecificItemsLimit?: SessionSpecificItemsLimit
}

export interface UpdateBuffetSettingsData extends Partial<CreateBuffetSettingsData> {}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// API functions for buffet settings
const API_BASE_URL = '/api/settings'

export async function getBuffetSettings(): Promise<ApiResponse<BuffetSettings>> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching buffet settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch buffet settings'
    }
  }
}

export async function updateBuffetSettings(settingsData: UpdateBuffetSettingsData): Promise<ApiResponse<BuffetSettings>> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settingsData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating buffet settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update buffet settings'
    }
  }
}

export async function createBuffetSettings(settingsData: CreateBuffetSettingsData): Promise<ApiResponse<BuffetSettings>> {
  return updateBuffetSettings(settingsData)
}