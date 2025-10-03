'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Printer } from 'lucide-react'

interface SendPaymentsToPrintersButtonProps {
  payments: any[]
  title?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export default function SendPaymentsToPrintersButton({
  payments,
  title = 'Payments Report',
  className,
  variant = 'secondary',
  size = 'sm'
}: SendPaymentsToPrintersButtonProps) {
  const handleSend = async () => {
    try {
      if (!payments || payments.length === 0) {
        toast.error('No payments to print')
        return
      }

      const res = await fetch('/api/print-payments-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments, title })
      })

      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send report to printers')
      }

      toast.success('Report sent to printers', {
        description: data?.message || 'Printing started'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Print failed'
      toast.error(msg)
    }
  }

  return (
    <Button onClick={handleSend} variant={variant} size={size} className={className} disabled={!payments || payments.length === 0}>
      <Printer className="h-4 w-4 mr-2" />
      Send to Printers (No Preview)
    </Button>
  )
}