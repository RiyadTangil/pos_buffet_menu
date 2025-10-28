'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Printer,
  RefreshCw
} from 'lucide-react'
import { PrintJob } from '@/lib/models/printer'
import { fetchPrintJobs } from '@/lib/api/printers'

interface PrintJobStatusProps {
  className?: string
  orderId?: string
  maxItems?: number
  showHeader?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function PrintJobStatus({ 
  className, 
  orderId, 
  maxItems = 10, 
  showHeader = true,
  autoRefresh = false,
  refreshInterval = 5000
}: PrintJobStatusProps) {
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPrintJobs()
    
    if (autoRefresh) {
      const interval = setInterval(loadPrintJobs, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [orderId, autoRefresh, refreshInterval])

  const loadPrintJobs = async () => {
    try {
      setLoading(false) // Don't show loading on refresh
      setError(null)
      
      const filters = orderId ? { orderId } : {}
      const jobsData = await fetchPrintJobs(filters)
      
      // Limit the number of items if specified
      const limitedJobs = maxItems ? jobsData.slice(0, maxItems) : jobsData
      setPrintJobs(limitedJobs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load print jobs')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'printing':
        return <Printer className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'printing':
        return <Badge variant="default" className="bg-blue-500">Printing</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getItemsCount = (job: PrintJob) => {
    return job.items.reduce((total, item) => total + item.quantity, 0)
  }

  if (loading && printJobs.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Print Jobs
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading print jobs...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Print Jobs
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={loadPrintJobs}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (printJobs.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Print Jobs
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            {orderId ? 'No print jobs for this order' : 'No print jobs found'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Print Jobs
              {orderId && <span className="text-sm font-normal text-gray-500">for Order #{orderId}</span>}
            </div>
            <Button variant="outline" size="sm" onClick={loadPrintJobs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {printJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="font-medium">
                      Order #{job.orderId}
                      {job.metadata?.department && (
                        <span className="text-sm text-gray-500 ml-2">
                          • {job.metadata.department}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getItemsCount(job)} items • {formatTime(job.createdAt)}
                      {job.metadata?.tableNumber && (
                        <span> • Table {job.metadata.tableNumber}</span>
                      )}
                    </div>
                    {job.error && (
                      <div className="text-xs text-red-500 mt-1">
                        Error: {job.error}
                      </div>
                    )}
                    {job.retryCount > 0 && (
                      <div className="text-xs text-yellow-600 mt-1">
                        Retried {job.retryCount} time(s)
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(job.status)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        {!autoRefresh && (
          <div className="mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={loadPrintJobs} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}