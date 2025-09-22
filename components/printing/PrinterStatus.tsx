'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer, Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { PrinterConfig } from '@/lib/models/printer'
import { fetchPrinters } from '@/lib/api/printers'

interface PrinterStatusProps {
  className?: string
  showDetails?: boolean
  onPrinterClick?: (printer: PrinterConfig) => void
}

export function PrinterStatus({ className, showDetails = false, onPrinterClick }: PrinterStatusProps) {
  const [printers, setPrinters] = useState<PrinterConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPrinters()
  }, [])

  const loadPrinters = async () => {
    try {
      setLoading(true)
      setError(null)
      const printersData = await fetchPrinters()
      setPrinters(printersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load printers')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (printer: PrinterConfig) => {
    if (!printer.isActive) {
      return <WifiOff className="h-4 w-4 text-gray-400" />
    }
    
    // In a real implementation, you would check actual printer connectivity
    // For now, we'll simulate based on printer configuration
    const isOnline = Math.random() > 0.2 // 80% chance of being online
    
    if (isOnline) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (printer: PrinterConfig) => {
    if (!printer.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    
    // Simulate status
    const isOnline = Math.random() > 0.2
    
    if (isOnline) {
      return <Badge variant="default" className="bg-green-500">Online</Badge>
    } else {
      return <Badge variant="destructive">Offline</Badge>
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printer Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Clock className="h-4 w-4 animate-spin mr-2" />
            Loading printers...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printer Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={loadPrinters}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (printers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printer Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            No printers configured
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!showDetails) {
    // Compact view - show overall status
    const activePrinters = printers.filter(p => p.isActive)
    const onlinePrinters = activePrinters.filter(() => Math.random() > 0.2) // Simulate online status
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Printer className="h-4 w-4" />
        <span className="text-sm">
          {onlinePrinters.length}/{activePrinters.length} printers online
        </span>
        {onlinePrinters.length === activePrinters.length ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Printer Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {printers.map((printer) => (
            <div
              key={printer.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                onPrinterClick ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
              onClick={() => onPrinterClick?.(printer)}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(printer)}
                <div>
                  <div className="font-medium">{printer.name}</div>
                  <div className="text-sm text-gray-500">
                    {printer.ipAddress}:{printer.port}
                  </div>
                  {printer.categories.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Categories: {printer.categories.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(printer)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={loadPrinters} className="w-full">
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}