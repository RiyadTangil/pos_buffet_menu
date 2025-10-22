'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { fetchPrinters, printOrderByCategories } from '@/lib/api/printers'
import { fetchUSBPrinters } from '@/lib/api/usb-printers'
import { PrinterConfig, USBPrinterConfig } from '@/lib/models/printer'

interface OrderPrinterProps {
  orderId: string
  orderItems: any[]
  tableNumber?: string | number
  guestCount?: number
  orderTime?: string
  onPrintComplete?: (success: boolean, errors?: string[]) => void
  autoPrint?: boolean
}

interface OrderPrinterState {
  isProcessing: boolean
  availablePrinters: PrinterConfig[]
  availableUSBPrinters: USBPrinterConfig[]
  defaultPrinter: PrinterConfig | null
  defaultUSBPrinter: USBPrinterConfig | null
}

export default function OrderPrinter({
  orderId,
  orderItems,
  tableNumber,
  guestCount,
  orderTime,
  onPrintComplete,
  autoPrint = true
}: OrderPrinterProps) {
  const [state, setState] = useState<OrderPrinterState>({
    isProcessing: false,
    availablePrinters: [],
    availableUSBPrinters: [],
    defaultPrinter: null,
    defaultUSBPrinter: null
  })

  // Load available printers on component mount
  useEffect(() => {
    loadPrinters()
  }, [])

  // Auto-print when order data is available
  useEffect(() => {
    if (autoPrint && orderId && orderItems.length > 0 && 
        (state.availablePrinters.length > 0 || state.availableUSBPrinters.length > 0)) {
      handleAutoPrint()
    }
  }, [autoPrint, orderId, orderItems, state.availablePrinters, state.availableUSBPrinters])

  const loadPrinters = async () => {
    try {
      // Load IP printers
      const printers = await fetchPrinters()
      const activePrinters = printers.filter(p => p.isActive)
      
      // Load USB printers
      const usbPrinters = await fetchUSBPrinters()
      const activeUSBPrinters = usbPrinters.filter(p => p.isActive)
      
      // Find default IP printer
      const ipPrinter = activePrinters.find(p => p.ipAddress)
      const defaultIPPrinter = ipPrinter || activePrinters[0] || null

      // Find default USB printer
      const defaultUSBPrinter = activeUSBPrinters.find(p => p.isDefault) || activeUSBPrinters[0] || null

      setState(prev => ({
        ...prev,
        availablePrinters: activePrinters,
        availableUSBPrinters: activeUSBPrinters,
        defaultPrinter: defaultIPPrinter,
        defaultUSBPrinter: defaultUSBPrinter
      }))
    } catch (error) {
      console.error('Error loading printers:', error)
      toast.error('Failed to load printer configuration')
    }
  }

  const handleAutoPrint = async () => {
    if (state.isProcessing) return

    setState(prev => ({ ...prev, isProcessing: true }))

    try {
      let printSuccess = false
      let errors: string[] = []

      // First try category-based printing with IP printers
      if (state.availablePrinters.some(p => p.ipAddress)) {
        try {
          const printJobs = await printOrderByCategories(orderId, orderItems)
          if (printJobs && printJobs.length > 0) {
            printSuccess = true
            toast.success(`Order sent to ${printJobs.length} IP printer(s)`)
          }
        } catch (error) {
          console.error('IP printer category-based printing failed:', error)
          errors.push('IP printer failed')
        }
      }

      // Try category-based printing with USB printers if IP printing failed or no IP printers
      if (!printSuccess && state.availableUSBPrinters.length > 0) {
        try {
          const usbPrintJobs = await printOrderByUSBCategories(orderId, orderItems)
          if (usbPrintJobs && usbPrintJobs.length > 0) {
            printSuccess = true
            toast.success(`Order sent to ${usbPrintJobs.length} USB printer(s)`)
          }
        } catch (error) {
          console.error('USB printer category-based printing failed:', error)
          errors.push('USB category printing failed')
        }
      }

      // Fallback to default USB printer if category printing failed
      if (!printSuccess && state.defaultUSBPrinter) {
        try {
          await printOrderViaUsb({
            orderId,
            orderItems,
            tableNumber,
            guestCount,
            orderTime,
            printerName: state.defaultUSBPrinter.localPrinterName
          })
          printSuccess = true
          toast.success('Order sent to default USB printer')
        } catch (error) {
          console.error('Default USB printing failed:', error)
          errors.push('Default USB printer failed')
        }
      }

      // Final fallback to legacy USB printing
      if (!printSuccess && state.defaultPrinter) {
        try {
          await printOrderViaUsb({
            orderId,
            orderItems,
            tableNumber,
            guestCount,
            orderTime
          })
          printSuccess = true
          toast.success('Order sent to legacy USB printer')
        } catch (error) {
          console.error('Legacy USB printing failed:', error)
          errors.push('Legacy USB printer failed')
        }
      }

      if (!printSuccess) {
        toast.error('Failed to print order - no printers available')
        errors.push('No printers available')
      }

      onPrintComplete?.(printSuccess, errors.length > 0 ? errors : undefined)
    } catch (error) {
      console.error('Printing error:', error)
      toast.error('Printing failed')
      onPrintComplete?.(false, ['Printing system error'])
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }))
    }
  }

  const printToLocalPrinter = async (orderData: {
    orderId: string
    orderItems: any[]
    tableNumber?: string | number
    guestCount?: number
    orderTime?: string
  }) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600')
        if (!printWindow) {
          reject(new Error('Could not open print window'))
          return
        }

        // Format the order for printing
        const orderDate = new Date(orderData.orderTime || new Date()).toLocaleString()
        const totalAmount = orderData.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Kitchen Order - ${orderData.orderId}</title>
            <style>
              body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; font-size: 12px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .restaurant-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
              .order-info { margin-bottom: 15px; }
              .order-info div { margin-bottom: 3px; }
              .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              .items-table th, .items-table td { text-align: left; padding: 5px 2px; border-bottom: 1px solid #ddd; }
              .items-table th { font-weight: bold; border-bottom: 2px solid #000; }
              .item-name { width: 60%; }
              .item-qty { width: 20%; text-align: center; }
              .item-price { width: 20%; text-align: right; }
              .total-section { border-top: 2px solid #000; padding-top: 10px; text-align: right; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; font-size: 10px; }
              @media print {
                body { margin: 0; padding: 10px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="restaurant-name">BUFFET RESTAURANT</div>
              <div>Kitchen Order</div>
            </div>
            
            <div class="order-info">
              <div><strong>Order ID:</strong> ${orderData.orderId}</div>
              <div><strong>Table:</strong> ${orderData.tableNumber || 'N/A'}</div>
              <div><strong>Guests:</strong> ${orderData.guestCount || 0}</div>
              <div><strong>Date & Time:</strong> ${orderDate}</div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th class="item-name">Item</th>
                  <th class="item-qty">Qty</th>
                  <th class="item-price">Price</th>
                </tr>
              </thead>
              <tbody>
                ${orderData.orderItems.map(item => `
                  <tr>
                    <td class="item-name">${item.name || item.menuItem?.name || 'Unknown Item'}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">£${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total-section">
              <div>Total: £${totalAmount.toFixed(2)}</div>
            </div>

            <div class="footer">
              <div>Thank you!</div>
              <div>Printed: ${new Date().toLocaleString()}</div>
            </div>

            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            </script>
          </body>
          </html>
        `

        printWindow.document.write(printContent)
        printWindow.document.close()

        // Wait for print to complete
        setTimeout(() => {
          resolve()
        }, 2000)
      } catch (error) {
        reject(error)
      }
    })
  }

  // Manual print trigger (for testing or manual use)
  const handleManualPrint = () => {
    if (!state.isProcessing) {
      handleAutoPrint()
    }
  }

  // Don't render anything for auto-print mode
  if (autoPrint) {
    return null
  }

  // Render manual print button if not auto-print
  return (
    <button
      onClick={handleManualPrint}
      disabled={state.isProcessing || !orderId || orderItems.length === 0}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
    >
      {state.isProcessing ? 'Printing...' : 'Print Order'}
    </button>
  )
}
  const printOrderViaUsb = async (orderData: {
    orderId: string
    orderItems: any[]
    tableNumber?: string | number
    guestCount?: number
    orderTime?: string
    printerName?: string
  }) => {
    const response = await fetch('/api/print-order-usb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })

    const result = await response.json()
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Failed to print order via USB')
    }
  }

  const printOrderByUSBCategories = async (orderId: string, orderItems: any[]) => {
    try {
      // Group items by category
      const itemsByCategory = orderItems.reduce((acc, item) => {
        const category = item.category || item.menuItem?.category || 'uncategorized'
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(item)
        return acc
      }, {} as Record<string, any[]>)

      const printJobs = []

      // Print each category to its assigned USB printer
      for (const [category, items] of Object.entries(itemsByCategory)) {
        // Find USB printer assigned to this category
        const assignedPrinter = state.availableUSBPrinters.find(printer => 
          printer.categories && printer.categories.includes(category)
        )

        if (assignedPrinter) {
          try {
            await printOrderViaUsb({
              orderId,
              orderItems: items,
              tableNumber,
              guestCount,
              orderTime,
              printerName: assignedPrinter.localPrinterName
            })
            printJobs.push({
              category,
              printer: assignedPrinter.displayName,
              itemCount: items.length
            })
          } catch (error) {
            console.error(`Failed to print ${category} items to ${assignedPrinter.displayName}:`, error)
          }
        } else {
          // Fallback to default USB printer for unassigned categories
          if (state.defaultUSBPrinter) {
            try {
              await printOrderViaUsb({
                orderId,
                orderItems: items,
                tableNumber,
                guestCount,
                orderTime,
                printerName: state.defaultUSBPrinter.localPrinterName
              })
              printJobs.push({
                category,
                printer: `${state.defaultUSBPrinter.displayName} (default)`,
                itemCount: items.length
              })
            } catch (error) {
              console.error(`Failed to print ${category} items to default USB printer:`, error)
            }
          }
        }
      }

      return printJobs
    } catch (error) {
      console.error('USB category printing error:', error)
      throw error
    }
  }