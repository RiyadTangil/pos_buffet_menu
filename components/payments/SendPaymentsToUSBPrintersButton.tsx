'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Usb } from 'lucide-react'

interface SendPaymentsToUSBPrintersButtonProps {
  payments: any[]
  title?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export default function SendPaymentsToUSBPrintersButton({
  payments,
  title = 'Payments Report',
  className,
  variant = 'secondary',
  size = 'sm'
}: SendPaymentsToUSBPrintersButtonProps) {
  const handleSend = async () => {
    try {
      if (!payments || payments.length === 0) {
        toast.error('No payments to print')
        return
      }

      const res = await fetch('/api/print-payments-report-usb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments, title })
      })

      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send report to USB printer')
      }

      toast.success('Report sent to USB printer', {
        description: data?.message || 'Printing started'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'USB print failed'
      toast.error(msg)
    }
  }

  return (
    <Button onClick={handleSend} variant={variant} size={size} className={className} disabled={!payments || payments.length === 0}>
      <Usb className="h-4 w-4 mr-2" />
      Send to USB (No Preview)
    </Button>
  )
}