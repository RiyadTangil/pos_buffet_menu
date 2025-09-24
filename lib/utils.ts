import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Session Management Utilities for Multi-Device Table Sharing

/**
 * Generate a unique device ID based on browser fingerprint
 * This creates a consistent ID for the same device/browser
 */
export function generateDeviceId(): string {
  // Check if device ID already exists in localStorage
  let deviceId = localStorage.getItem('deviceId')
  
  if (!deviceId) {
    // Create a unique device ID using browser characteristics
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Device fingerprint', 2, 2)
    }
    
    const fingerprint = canvas.toDataURL()
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    
    // Combine multiple factors for unique device ID
    deviceId = btoa(`${fingerprint.slice(-20)}-${timestamp}-${random}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)
    
    // Store for future use
    localStorage.setItem('deviceId', deviceId)
  }
  
  return deviceId
}

/**
 * Generate a unique session ID for table booking
 * Format: tableId-deviceId-timestamp
 */
export function generateSessionId(tableId: string): string {
  const deviceId = generateDeviceId()
  const timestamp = Date.now()
  return `${tableId}-${deviceId}-${timestamp}`
}

/**
 * Parse session ID to extract components
 */
export function parseSessionId(sessionId: string): {
  tableId: string
  deviceId: string
  timestamp: number
} | null {
  const parts = sessionId.split('-')
  if (parts.length !== 3) return null
  
  return {
    tableId: parts[0],
    deviceId: parts[1],
    timestamp: parseInt(parts[2])
  }
}

/**
 * Get current session ID from localStorage
 */
export function getCurrentSessionId(): string | null {
  return localStorage.getItem('currentSessionId')
}

/**
 * Set current session ID in localStorage
 */
export function setCurrentSessionId(sessionId: string): void {
  localStorage.setItem('currentSessionId', sessionId)
}

/**
 * Clear current session
 */
export function clearCurrentSession(): void {
  localStorage.removeItem('currentSessionId')
  localStorage.removeItem('selectedTableId')
  localStorage.removeItem('guestCounts')
}

/**
 * Check if current device has an active session for a table
 */
export function hasActiveSessionForTable(tableId: string): boolean {
  const currentSessionId = getCurrentSessionId()
  if (!currentSessionId) return false
  
  const parsed = parseSessionId(currentSessionId)
  return parsed?.tableId === tableId
}

/**
 * Get remaining capacity for a table
 */
export function getRemainingCapacity(table: { capacity: number; currentGuests: number }): number {
  return Math.max(0, table.capacity - table.currentGuests)
}

/**
 * Check if guests can fit in remaining table capacity
 */
export function canFitInTable(table: { capacity: number; currentGuests: number }, guestCount: number): boolean {
  return getRemainingCapacity(table) >= guestCount
}
