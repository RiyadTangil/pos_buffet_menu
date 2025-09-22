'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw
} from 'lucide-react'
import { printOrderByCategories } from '@/lib/api/printers'
import { PrintJob } from '@/lib/models/printer'

interface PrintButtonProps {
  orderId: string
  orderItems: any[]
  tableNumber?: string | number
  guestCount?: number
  orderTime?: string
  onPrintStart?: () => void
  onPrintSuccess?: (printJobs: PrintJob[]) => void
  onPrintError?: (error: string) => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
}

export function PrintButton({
  orderId,
  orderItems,
  tableNumber,
  guestCount,
  orderTime,
  onPrintStart,
  onPrintSuccess,
  onPrintError,
  disabled = false,
  variant = 'default',
  size = 'default',
  className,
  children
}: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle')

  const handlePrint = async () => {
    if (isPrinting || disabled) return

    try {
      setIsPrinting(true)
      setPrintStatus('printing')
      onPrintStart?.()

      // Validate order items
      if (!orderItems || orderItems.length === 0) {
        throw new Error('No items to print')
      }

      // Prepare print data
      const printData = {
        orderId,
        orderItems,
        tableNumber: tableNumber?.toString() || 'Unknown',
        guestCount: guestCount || 1,
        orderTime: orderTime || new Date().toISOString()
      }

      // Send to print API
      const printJobs = await printOrderByCategories(
        printData.orderId,
        printData.orderItems
      )

      if (printJobs.length === 0) {
        throw new Error('No print jobs were created. Please check printer configuration.')
      }

      setPrintStatus('success')
      onPrintSuccess?.(printJobs)

      // Show success toast
      toast.success(`Order printed successfully!`, {
        description: `${printJobs.length} print job(s) created for different departments.`
      })

      // Reset status after a delay
      setTimeout(() => {
        setPrintStatus('idle')
      }, 3000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to print order'
      setPrintStatus('error')
      onPrintError?.(errorMessage)

      // Show error toast
      toast.error('Print failed', {
        description: errorMessage
      })

      // Reset status after a delay
      setTimeout(() => {
        setPrintStatus('idle')
      }, 5000)
    } finally {
      setIsPrinting(false)
    }
  }

  const getButtonContent = () => {
    if (children) {
      return children
    }

    switch (printStatus) {
      case 'printing':
        return (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Printing...
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Printed
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            Print Failed
          </>
        )
      default:
        return (
          <>
            <Printer className="h-4 w-4 mr-2" />
            Print Order
          </>
        )
    }
  }

  const getButtonVariant = () => {
    switch (printStatus) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      default:
        return variant
    }
  }

  return (
    <Button
      onClick={handlePrint}
      disabled={disabled || isPrinting}
      variant={getButtonVariant()}
      size={size}
      className={className}
    >
      {getButtonContent()}
    </Button>
  )
}

// Compact version for use in lists or small spaces
export function PrintButtonCompact({
  orderId,
  orderItems,
  tableNumber,
  guestCount,
  orderTime,
  onPrintSuccess,
  onPrintError,
  disabled = false,
  className
}: Omit<PrintButtonProps, 'children' | 'variant' | 'size'>) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    if (isPrinting || disabled) return

    try {
      setIsPrinting(true)

      const printData = {
        orderId,
        orderItems,
        tableNumber: tableNumber?.toString() || 'Unknown',
        guestCount: guestCount || 1,
        orderTime: orderTime || new Date().toISOString()
      }

      const printJobs = await printOrderByCategories(
        printData.orderId,
        printData.orderItems
      )

      if (printJobs.length === 0) {
        throw new Error('No print jobs were created')
      }

      onPrintSuccess?.(printJobs)
      toast.success('Order printed!')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Print failed'
      onPrintError?.(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Button
      onClick={handlePrint}
      disabled={disabled || isPrinting}
      variant="outline"
      size="icon"
      className={className}
    >
      {isPrinting ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
    </Button>
  )
}