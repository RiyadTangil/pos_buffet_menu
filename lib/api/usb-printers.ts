import { USBPrinterConfig } from '@/lib/models/printer'

const API_BASE = '/api'

export async function fetchUSBPrinters(): Promise<USBPrinterConfig[]> {
  try {
    const response = await fetch(`${API_BASE}/usb-printers`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch USB printers')
    }
    
    return data.printers || []
  } catch (error) {
    console.error('Error fetching USB printers:', error)
    throw error
  }
}

export async function createUSBPrinter(printerData: Omit<USBPrinterConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<USBPrinterConfig> {
  try {
    const response = await fetch(`${API_BASE}/usb-printers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printerData),
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create USB printer')
    }
    
    return data.printer
  } catch (error) {
    console.error('Error creating USB printer:', error)
    throw error
  }
}

export async function updateUSBPrinter(id: string, printerData: Partial<USBPrinterConfig>): Promise<USBPrinterConfig> {
  try {
    const response = await fetch(`${API_BASE}/usb-printers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...printerData }),
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update USB printer')
    }
    
    return data.printer
  } catch (error) {
    console.error('Error updating USB printer:', error)
    throw error
  }
}

export async function deleteUSBPrinter(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/usb-printers?id=${id}`, {
      method: 'DELETE',
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete USB printer')
    }
  } catch (error) {
    console.error('Error deleting USB printer:', error)
    throw error
  }
}

export async function fetchLocalPrinters(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/local-printers`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch local printers')
    }
    
    return data.printers || []
  } catch (error) {
    console.error('Error fetching local printers:', error)
    throw error
  }
}