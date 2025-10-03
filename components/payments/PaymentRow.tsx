'use client'

import { Badge } from '@/components/ui/badge'
import { TableRow, TableCell } from '@/components/ui/table'
import { Payment } from '@/lib/models/payment'

interface PaymentRowProps {
  payment: Payment
}

// Presentational row for the admin Payments table with a print action.
export default function PaymentRow({ payment }: PaymentRowProps) {
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getSessionBadgeVariant = (session: string) => {
    switch (session) {
      case 'breakfast':
        return 'outline'
      case 'lunch':
        return 'default'
      case 'dinner':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {payment.paymentId}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{payment.paymentDate}</span>
          <span className="text-xs text-muted-foreground">{payment.paymentTime}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">Table {payment.tableNumber}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getSessionBadgeVariant(payment.sessionType)}>
          {payment.sessionType.charAt(0).toUpperCase() + payment.sessionType.slice(1)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{payment.waiterName}</span>
          <span className="text-xs text-muted-foreground font-mono">{payment.waiterId}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-xs">
          <div>Adults: {payment.sessionData?.adults ?? 0}</div>
          <div>Children: {payment.sessionData?.children ?? 0}</div>
          <div>Infants: {payment.sessionData?.infants ?? 0}</div>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-green-600">
          {formatCurrency(payment.totalAmount)}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(payment.status)}>
          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </Badge>
      </TableCell>
    </TableRow>
  )
}