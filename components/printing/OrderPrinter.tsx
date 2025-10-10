'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { fetchPrinters, printOrderByCategories } from '@/lib/api/printers'
import { PrinterConfig } from '@/lib/models/printer'

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
  defaultPrinter: PrinterConfig | null
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
    defaultPrinter: null
  })

  // Load available printers on component mount
  useEffect(() => {
    loadPrinters()
  }, [])

  // Auto-print when order data is available
  useEffect(() => {
    if (autoPrint && orderId && orderItems.length > 0 && state.availablePrinters.length > 0) {
      handleAutoPrint()
    }
  }, [autoPrint, orderId, orderItems, state.availablePrinters])

  const loadPrinters = async () => {
    try {
      const printers = await fetchPrinters()
      const activePrinters = printers.filter(p => p.isActive)
      
      // Find default printer (USB first, then IP)
      const usbPrinter = activePrinters.find(p => p.type === 'thermal' && !p.ipAddress)
      const ipPrinter = activePrinters.find(p => p.ipAddress)
      const defaultPrinter = usbPrinter || ipPrinter || activePrinters[0] || null

      setState(prev => ({
        ...prev,
        availablePrinters: activePrinters,
        defaultPrinter
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
      // First try category-based printing (IP printers)
      let printSuccess = false
      let errors: string[] = []

      if (state.availablePrinters.some(p => p.ipAddress)) {
        try {
          const printJobs = await printOrderByCategories(orderId, orderItems)
          if (printJobs && printJobs.length > 0) {
            printSuccess = true
            toast.success(`Order sent to ${printJobs.length} printer(s)`)
          }
        } catch (error) {
          console.error('Category-based printing failed:', error)
          errors.push('IP printer failed')
        }
      }

      // Fallback to USB/local printing if IP printing failed or no IP printers
      if (!printSuccess && state.defaultPrinter) {
        try {
          await printToLocalPrinter({
            orderId,
            orderItems,
            tableNumber,
            guestCount,
            orderTime
          })
          printSuccess = true
          toast.success('Order printed to local printer')
        } catch (error) {
          console.error('Local printing failed:', error)
          errors.push('Local printer failed')
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