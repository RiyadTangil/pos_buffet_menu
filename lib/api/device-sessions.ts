// Client-side API functions for device session management

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface DeviceSession {
  sessionId: string
  tableId: string
  deviceId: string
  groupType: 'different' | 'same'
  groupId: string
  guestCounts: {
    adults: number
    children: number
    infants: number
    includeDrinks: boolean
  }
  cart: any[]
  orders: any[]
  sessionStartTime: string
  lastActivity: string
  isActive: boolean
  waiterVerified?: boolean
}

export interface SynchronizedGroup {
  groupId: string
  tableId: string
  masterDeviceId: string
  devices: string[]
  sharedCart: any[]
  sharedOrders: any[]
  sessionTimer: {
    startTime: string
    endTime?: string
    remainingTime: number
  }
  guestCounts: {
    adults: number
    children: number
    infants: number
    includeDrinks: boolean
  }
  isActive: boolean
}

// Create a new device session
export async function createDeviceSession(sessionData: {
  sessionId: string
  tableId: string
  deviceId: string
  groupType: 'different' | 'same'
  guestCounts: any
  waiterVerified?: boolean
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/device-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to create device session:', error)
    return { success: false, error: 'Failed to create device session' }
  }
}

// Get device sessions
export async function getDeviceSessions(params: {
  sessionId?: string
  deviceId?: string
  tableId?: string
  groupId?: string
}): Promise<{ success: boolean; data?: DeviceSession[]; error?: string }> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params.sessionId) searchParams.append('sessionId', params.sessionId)
    if (params.deviceId) searchParams.append('deviceId', params.deviceId)
    if (params.tableId) searchParams.append('tableId', params.tableId)
    if (params.groupId) searchParams.append('groupId', params.groupId)

    const response = await fetch(`${API_BASE_URL}/api/device-sessions?${searchParams}`)
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to fetch device sessions:', error)
    return { success: false, error: 'Failed to fetch device sessions' }
  }
}

// Update device session
export async function updateDeviceSession(updateData: {
  sessionId: string
  deviceId: string
  cart?: any[]
  orders?: any[]
  guestCounts?: any
  sessionTimer?: any
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/device-sessions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to update device session:', error)
    return { success: false, error: 'Failed to update device session' }
  }
}

// End device session
export async function endDeviceSession(sessionId: string, deviceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/device-sessions?sessionId=${sessionId}&deviceId=${deviceId}`, {
      method: 'DELETE',
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to end device session:', error)
    return { success: false, error: 'Failed to end device session' }
  }
}

// Get synchronized group
export async function getSynchronizedGroup(groupId: string): Promise<{ success: boolean; data?: SynchronizedGroup; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/synchronized-groups?groupId=${groupId}`)
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to fetch synchronized group:', error)
    return { success: false, error: 'Failed to fetch synchronized group' }
  }
}

// Update synchronized group
export async function updateSynchronizedGroup(updateData: {
  groupId: string
  sharedCart?: any[]
  sharedOrders?: any[]
  sessionTimer?: any
  guestCounts?: any
  deviceId: string
}): Promise<{ success: boolean; data?: SynchronizedGroup; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/synchronized-groups`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to update synchronized group:', error)
    return { success: false, error: 'Failed to update synchronized group' }
  }
}

// Verify waiter PIN
export async function verifyWaiterPin(pin: string, tableId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/waiter-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin, tableId }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to verify waiter PIN:', error)
    return { success: false, error: 'Failed to verify waiter PIN' }
  }
}

// Real-time synchronization utilities
export class DeviceSessionManager {
  private sessionId: string
  private deviceId: string
  private groupId?: string
  private groupType: 'different' | 'same'
  private syncInterval?: NodeJS.Timeout
  private onSyncUpdate?: (data: any) => void

  constructor(sessionId: string, deviceId: string, groupType: 'different' | 'same', groupId?: string) {
    this.sessionId = sessionId
    this.deviceId = deviceId
    this.groupType = groupType
    this.groupId = groupId
  }

  // Start real-time synchronization
  startSync(onUpdate: (data: any) => void, intervalMs: number = 2000) {
    this.onSyncUpdate = onUpdate
    
    this.syncInterval = setInterval(async () => {
      if (this.groupType === 'same' && this.groupId) {
        const result = await getSynchronizedGroup(this.groupId)
        if (result.success && result.data) {
          this.onSyncUpdate?.(result.data)
        }
      }
    }, intervalMs)
  }

  // Stop synchronization
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
  }

  // Update cart and sync with other devices
  async updateCart(cart: any[]) {
    if (this.groupType === 'same' && this.groupId) {
      return await updateSynchronizedGroup({
        groupId: this.groupId,
        sharedCart: cart,
        deviceId: this.deviceId
      })
    } else {
      return await updateDeviceSession({
        sessionId: this.sessionId,
        deviceId: this.deviceId,
        cart
      })
    }
  }

  // Update orders and sync with other devices
  async updateOrders(orders: any[]) {
    if (this.groupType === 'same' && this.groupId) {
      return await updateSynchronizedGroup({
        groupId: this.groupId,
        sharedOrders: orders,
        deviceId: this.deviceId
      })
    } else {
      return await updateDeviceSession({
        sessionId: this.sessionId,
        deviceId: this.deviceId,
        orders
      })
    }
  }

  // Update session timer and sync
  async updateSessionTimer(sessionTimer: any) {
    if (this.groupType === 'same' && this.groupId) {
      return await updateSynchronizedGroup({
        groupId: this.groupId,
        sessionTimer,
        deviceId: this.deviceId
      })
    } else {
      return await updateDeviceSession({
        sessionId: this.sessionId,
        deviceId: this.deviceId,
        sessionTimer
      })
    }
  }

  // End session
  async endSession() {
    this.stopSync()
    return await endDeviceSession(this.sessionId, this.deviceId)
  }
}