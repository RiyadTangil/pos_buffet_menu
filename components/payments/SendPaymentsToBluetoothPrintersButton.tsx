'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bluetooth } from 'lucide-react'

interface SendPaymentsToBluetoothPrintersButtonProps {
  payments: any[]
  title?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export default function SendPaymentsToBluetoothPrintersButton({
  payments,
  title = 'Payments Report',
  className,
  variant = 'secondary',
  size = 'sm'
}: SendPaymentsToBluetoothPrintersButtonProps) {
  const handleSend = async () => {
    try {
      if (!payments || payments.length === 0) {
        toast.error('No payments to print')
        return
      }

      const res = await fetch('/api/print-payments-report-serial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments, title, transport: 'bluetooth' })
      })

      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send report to Bluetooth printer')
      }

      toast.success('Report sent to Bluetooth printer', {
        description: data?.message || 'Printing started'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bluetooth print failed'
      toast.error(msg)
    }
  }

  return (
    <Button onClick={handleSend} variant={variant} size={size} className={className} disabled={!payments || payments.length === 0}>
      <Bluetooth className="h-4 w-4 mr-2" />
      Send to Bluetooth (No Preview)
    </Button>
  )
}