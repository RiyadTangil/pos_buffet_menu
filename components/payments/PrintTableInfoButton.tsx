'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { Payment } from '@/lib/models/payment'

interface PrintTableInfoButtonProps {
  payment: Payment
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

// Minimal, self-contained print implementation that opens a print window
// and renders a tidy summary of the payment's table info.
export default function PrintTableInfoButton({
  payment,
  className,
  variant = 'outline',
  size = 'sm',
}: PrintTableInfoButtonProps) {
  const handlePrint = () => {
    try {
      const doc = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Table ${payment.tableNumber} • Payment ${payment.paymentId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
            .title { font-size: 20px; font-weight: 700; }
            .muted { color:#666; font-size: 12px; }
            .section { margin-top: 16px; }
            .row { display:flex; justify-content:space-between; margin:6px 0; }
            .label { color:#333; }
            .value { font-weight: 600; }
            .amount { color: #0a7e2f; font-size: 18px; font-weight: 700; }
            hr { border: none; border-top: 1px solid #eee; margin: 12px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Table ${payment.tableNumber ?? '—'}</div>
            <div class="muted">Payment #${payment.paymentId}</div>
          </div>
          <hr />
          <div class="section">
            <div class="row"><span class="label">Date</span><span class="value">${payment.paymentDate}</span></div>
            <div class="row"><span class="label">Time</span><span class="value">${payment.paymentTime}</span></div>
            <div class="row"><span class="label">Session</span><span class="value">${payment.sessionType}</span></div>
            <div class="row"><span class="label">Method</span><span class="value">${payment.paymentMethod ?? '—'}</span></div>
            <div class="row"><span class="label">Status</span><span class="value">${payment.status}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="label">Waiter</span><span class="value">${payment.waiterName}</span></div>
            <div class="row"><span class="label">Guests</span><span class="value">Adults: ${payment.sessionData?.adults ?? 0}, Children: ${payment.sessionData?.children ?? 0}, Infants: ${payment.sessionData?.infants ?? 0}</span></div>
          </div>
          <hr />
          <div class="section">
            <div class="row"><span class="label">Total</span><span class="amount">£${payment.totalAmount?.toFixed(2)}</span></div>
          </div>
        </body>
      </html>`

      const printWindow = window.open('', 'PRINT', 'height=600,width=480')
      if (!printWindow) return
      printWindow.document.write(doc)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    } catch (e) {
      console.error('Failed to print table info', e)
    }
  }

  return (
    <Button onClick={handlePrint} variant={variant} size={size} className={className}>
      <Printer className="h-4 w-4 mr-2" />
      Print Table Info
    </Button>
  )
}