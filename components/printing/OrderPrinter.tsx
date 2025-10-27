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
    console.log('🖨️ [OrderPrinter] Starting auto-print process...')
    console.log('🖨️ [OrderPrinter] Order ID:', orderId)
    console.log('🖨️ [OrderPrinter] Order Items:', orderItems)
    console.log('🖨️ [OrderPrinter] Available IP Printers:', state.availablePrinters)
    console.log('🖨️ [OrderPrinter] Available USB Printers:', state.availableUSBPrinters)
    console.log('🖨️ [OrderPrinter] Default USB Printer:', state.defaultUSBPrinter)
    
    if (state.isProcessing) {
      console.log('🖨️ [OrderPrinter] Already processing, skipping...')
      return
    }

    setState(prev => ({ ...prev, isProcessing: true }))

    try {
      let printSuccess = false
      let errors: string[] = []

      // First try category-based printing with IP printers
      console.log('🖨️ [OrderPrinter] Checking IP printers for category-based printing...')
      const ipPrintersWithIP = state.availablePrinters.filter(p => p.ipAddress)
      console.log('🖨️ [OrderPrinter] IP printers with IP address:', ipPrintersWithIP)
      
      if (ipPrintersWithIP.length > 0) {
        try {
          console.log('🖨️ [OrderPrinter] Attempting IP printer category-based printing...')
          const printJobs = await printOrderByCategories(orderId, orderItems)
          console.log('🖨️ [OrderPrinter] IP printer print jobs result:', printJobs)
          
          if (printJobs && printJobs.length > 0) {
            printSuccess = true
            console.log('🖨️ [OrderPrinter] ✅ IP printer category-based printing successful!')
            toast.success(`Order sent to ${printJobs.length} IP printer(s)`)
          } else {
            console.log('🖨️ [OrderPrinter] ❌ IP printer category-based printing returned no jobs')
          }
        } catch (error) {
          console.error('🖨️ [OrderPrinter] ❌ IP printer category-based printing failed:', error)
          errors.push('IP printer failed')
        }
      } else {
        console.log('🖨️ [OrderPrinter] No IP printers with IP addresses found')
      }

      // Try category-based printing with USB printers if IP printing failed or no IP printers
      console.log('🖨️ [OrderPrinter] Checking USB printers for category-based printing...')
      console.log('🖨️ [OrderPrinter] Print success so far:', printSuccess)
      console.log('🖨️ [OrderPrinter] Available USB printers count:', state.availableUSBPrinters.length)
      
      if (!printSuccess && state.availableUSBPrinters.length > 0) {
        try {
          console.log('🖨️ [OrderPrinter] Attempting USB printer category-based printing...')
          const usbPrintJobs = await printOrderByUSBCategories(
            orderId, 
            orderItems, 
            state.availableUSBPrinters, 
            state.defaultUSBPrinter,
            tableNumber,
            guestCount,
            orderTime
          )
          console.log('🖨️ [OrderPrinter] USB printer print jobs result:', usbPrintJobs)
          
          if (usbPrintJobs && usbPrintJobs.length > 0) {
            printSuccess = true
            console.log('🖨️ [OrderPrinter] ✅ USB printer category-based printing successful!')
            toast.success(`Order sent to ${usbPrintJobs.length} USB printer(s)`)
          } else {
            console.log('🖨️ [OrderPrinter] ❌ USB printer category-based printing returned no jobs')
          }
        } catch (error) {
          console.error('🖨️ [OrderPrinter] ❌ USB printer category-based printing failed:', error)
          errors.push('USB category printing failed')
        }
      } else if (!printSuccess) {
        console.log('🖨️ [OrderPrinter] No USB printers available for category-based printing')
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
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              html, body {
                height: 100%;
                width: 100%;
              }
              
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 14px;
                line-height: 1.6;
                color: #000;
                background: white;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
              }
              
              .receipt-container {
                width: 100%;
                max-width: 400px;
                margin: 0 auto;
                background: white;
                border: 2px solid #000;
                padding: 20px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              
              .header { 
                text-align: center; 
                border-bottom: 3px double #000; 
                padding-bottom: 15px; 
                margin-bottom: 20px; 
              }
              
              .restaurant-name { 
                font-size: 22px; 
                font-weight: bold; 
                margin-bottom: 8px;
                letter-spacing: 1px;
              }
              
              .order-type {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              
              .order-info { 
                margin-bottom: 20px; 
                border-bottom: 1px dashed #000;
                padding-bottom: 15px;
              }
              
              .order-info div { 
                margin-bottom: 5px;
                display: flex;
                justify-content: space-between;
              }
              
              .order-info strong {
                font-weight: bold;
              }
              
              .items-section {
                margin-bottom: 20px;
              }
              
              .items-header {
                text-align: center;
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                border-bottom: 2px solid #000;
                padding-bottom: 5px;
              }
              
              .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 15px; 
              }
              
              .items-table th, .items-table td { 
                padding: 8px 4px; 
                border-bottom: 1px solid #ccc; 
                text-align: left;
              }
              
              .items-table th { 
                font-weight: bold; 
                border-bottom: 2px solid #000;
                background-color: #f5f5f5;
              }
              
              .item-name { 
                width: 55%; 
              }
              
              .item-qty { 
                width: 15%; 
                text-align: center; 
              }
              
              .item-price { 
                width: 30%; 
                text-align: right; 
              }
              
              .total-section { 
                border-top: 3px double #000; 
                padding-top: 15px; 
                text-align: center;
                font-weight: bold;
                font-size: 18px;
              }
              
              .footer { 
                text-align: center; 
                margin-top: 25px; 
                font-size: 12px;
                border-top: 1px dashed #000;
                padding-top: 15px;
              }
              
              .footer div {
                margin-bottom: 5px;
              }
              
              @media print {
                html, body {
                  height: auto;
                  margin: 0;
                  padding: 0;
                }
                
                body {
                  min-height: auto;
                  padding: 10mm;
                  justify-content: flex-start;
                }
                
                .receipt-container {
                  border: none;
                  box-shadow: none;
                  max-width: none;
                  width: 100%;
                  margin: 0;
                  padding: 0;
                }
                
                .no-print { 
                  display: none; 
                }
                
                @page {
                  margin: 10mm;
                  size: A4;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <div class="header">
                <div class="restaurant-name">BUFFET RESTAURANT</div>
                <div class="order-type">Kitchen Order</div>
              </div>
              
              <div class="order-info">
                <div><strong>Order ID:</strong> <span>${orderData.orderId}</span></div>
                <div><strong>Table:</strong> <span>${orderData.tableNumber || 'N/A'}</span></div>
                <div><strong>Guests:</strong> <span>${orderData.guestCount || 0}</span></div>
                <div><strong>Date & Time:</strong> <span>${orderDate}</span></div>
              </div>

              <div class="items-section">
                <div class="items-header">ORDER ITEMS</div>
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
              </div>

              <div class="total-section">
                <div>TOTAL: £${totalAmount.toFixed(2)}</div>
              </div>

              <div class="footer">
                <div><strong>Thank you for your order!</strong></div>
                <div>Printed: ${new Date().toLocaleString()}</div>
              </div>
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

  const printOrderByUSBCategories = async (
    orderId: string, 
    orderItems: any[], 
    availableUSBPrinters: USBPrinterConfig[], 
    defaultUSBPrinter: USBPrinterConfig | null,
    tableNumber?: string | number,
    guestCount?: number,
    orderTime?: string
  ) => {
    console.log('🖨️ [USB Categories] Starting USB category-based printing...')
    console.log('🖨️ [USB Categories] Order ID:', orderId)
    console.log('🖨️ [USB Categories] Order Items:', orderItems)
    
    try {
      // Group items by category
      console.log('🖨️ [USB Categories] Grouping items by category...')
      const itemsByCategory = orderItems.reduce((acc, item) => {
        const category = item.category?.id || item.menuItem?.category?.id || 'uncategorized'
        console.log('🖨️ [USB Categories] Item:', item.name, 'Category:', category)
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(item)
        return acc
      }, {} as Record<string, any[]>)

      console.log('🖨️ [USB Categories] Items grouped by category:', itemsByCategory)
      console.log('🖨️ [USB Categories] Items grouped by category keys:', Object.keys(itemsByCategory))
      const printJobs = []

      // Print each category to its assigned USB printer
      console.log('🖨️ [USB Categories] Processing each category...')
      for (const [category, items] of Object.entries(itemsByCategory)) {
        console.log(`🖨️ [USB Categories] Processing category: ${category} with ${items.length} items`)
        
        // Find USB printer assigned to this category
        const assignedPrinter = availableUSBPrinters.find(printer => 
          printer.categories && printer.categories.includes(category)
        )

        console.log(`🖨️ [USB Categories] Assigned printer for ${category}:`, assignedPrinter)

        if (assignedPrinter) {
          try {
            console.log(`🖨️ [USB Categories] Printing ${category} items to ${assignedPrinter.displayName}...`)
            await printOrderViaUsb({
              orderId,
              orderItems: items,
              tableNumber,
              guestCount,
              orderTime,
              printerName: assignedPrinter.localPrinterName
            })
            console.log(`🖨️ [USB Categories] ✅ Successfully printed ${category} items to ${assignedPrinter.displayName}`)
            printJobs.push({
              category,
              printer: assignedPrinter.displayName,
              itemCount: items.length
            })
          } catch (error) {
            console.error(`🖨️ [USB Categories] ❌ Failed to print ${category} items to ${assignedPrinter.displayName}:`, error)
          }
        } else {
          console.log(`🖨️ [USB Categories] No assigned printer found for category: ${category}. Skipping this category.`)
          // Skip categories without assigned printers - don't print to default printer
        }
      }

      console.log('🖨️ [USB Categories] Final print jobs:', printJobs)
      return printJobs
    } catch (error) {
      console.error('🖨️ [USB Categories] ❌ USB category printing error:', error)
      throw error
    }
  }