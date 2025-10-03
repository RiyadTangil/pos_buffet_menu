'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { Payment } from '@/lib/models/payment'

interface PrintPaymentsTableButtonProps {
  payments: Payment[]
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  title?: string
}

export default function PrintPaymentsTableButton({
  payments,
  className,
  variant = 'outline',
  size = 'sm',
  title = 'Payments Report',
}: PrintPaymentsTableButtonProps) {
  const handlePrint = () => {
    if (!payments || payments.length === 0) return

    try {
      const createdAt = new Date().toLocaleString()
      const total = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0)

      const rows = payments
        .map((p) => `
          <tr>
            <td>${p.paymentId}</td>
            <td>${p.paymentDate}</td>
            <td>${p.paymentTime}</td>
            <td>${p.tableNumber ?? ''}</td>
            <td>${p.sessionType ?? ''}</td>
            <td>${p.paymentMethod ?? ''}</td>
            <td>${p.status ?? ''}</td>
            <td>${p.waiterName ?? ''}</td>
            <td>Adults: ${p.sessionData?.adults ?? 0}, Children: ${p.sessionData?.children ?? 0}, Infants: ${p.sessionData?.infants ?? 0}</td>
            <td>£${(p.totalAmount ?? 0).toFixed(2)}</td>
          </tr>
        `)
        .join('')

      const doc = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
            .title { font-size: 20px; font-weight: 700; }
            .muted { color:#666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f5f5f5; text-align: left; }
            tfoot td { font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${title}</div>
            <div class="muted">Generated: ${createdAt}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Table</th>
                <th>Session</th>
                <th>Method</th>
                <th>Status</th>
                <th>Waiter</th>
                <th>Guests</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="9">Total</td>
                <td>£${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>`

      // Use hidden iframe to avoid about:blank popup and print reliably
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      // Prefer srcdoc to avoid navigation flicker
      try {
        (iframe as any).srcdoc = doc
      } catch {
        const docRef = iframe.contentWindow?.document
        if (!docRef) {
          document.body.removeChild(iframe)
          return
        }
        docRef.open()
        docRef.write(doc)
        docRef.close()
      }

      iframe.onload = () => {
        const win = iframe.contentWindow
        try {
          win?.focus()
          win?.print()
        } catch (e) {
          console.error('Iframe print failed', e)
        }
        const cleanup = () => {
          try { document.body.removeChild(iframe) } catch {}
        }
        // Remove iframe after print completes, with a timeout fallback
        try { win?.addEventListener('afterprint', cleanup) } catch {}
        setTimeout(cleanup, 2000)
      }
    } catch (e) {
      console.error('Failed to print payments table', e)
    }
  }

  return (
    <Button onClick={handlePrint} variant={variant} size={size} className={className} disabled={!payments || payments.length === 0}>
      <Printer className="h-4 w-4 mr-2" />
      Print Table
    </Button>
  )
}