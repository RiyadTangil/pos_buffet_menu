"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Bell, Users, Sparkles, Receipt, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { createWaiterRequest, printWaiterRequest } from "@/lib/api/waiter-requests"
import { WaiterRequestType } from "@/lib/models/printer"
import { useTranslation } from "react-i18next"
import { toast } from "@/components/ui/use-toast"

interface WaiterRequestProps {
  tableNumber: number
  disabled?: boolean
}

interface RequestOption {
  type: WaiterRequestType
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

export default function WaiterRequest({ tableNumber, disabled = false }: WaiterRequestProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingType, setProcessingType] = useState<WaiterRequestType | null>(null)

  const requestOptions: RequestOption[] = [
    {
      type: 'waiter',
      title: t('waiter_request.waiter_title', 'Request Waiter'),
      description: t('waiter_request.waiter_desc', 'Need assistance from a waiter'),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100'
    },
    {
      type: 'cleaning',
      title: t('waiter_request.cleaning_title', 'Request Cleaning'),
      description: t('waiter_request.cleaning_desc', 'Table needs cleaning service'),
      icon: Sparkles,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100'
    },
    {
      type: 'bill',
      title: t('waiter_request.bill_title', 'Request Bill'),
      description: t('waiter_request.bill_desc', 'Ready to pay the bill'),
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100'
    }
  ]

  const handleRequest = async (requestType: WaiterRequestType) => {
    if (isProcessing) return

    setIsProcessing(true)
    setProcessingType(requestType)

    try {
      // Create the waiter request
      const request = await createWaiterRequest(tableNumber, requestType)
      
      // Print the request
      const printResult = await printWaiterRequest(
        tableNumber,
        requestType,
        request.message,
        request.id
      )

      if (printResult.success) {
        toast({
          title: t('waiter_request.success_title', 'Request Sent'),
          description: t('waiter_request.success_desc', `Your ${requestType} request has been sent and printed successfully.`),
          duration: 3000,
        })
        setIsOpen(false)
      } else {
        // Request was created but printing failed
        toast({
          title: t('waiter_request.partial_success_title', 'Request Created'),
          description: t('waiter_request.partial_success_desc', `Your ${requestType} request was created but could not be printed. ${printResult.error || ''}`),
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error processing waiter request:', error)
      toast({
        title: t('waiter_request.error_title', 'Request Failed'),
        description: t('waiter_request.error_desc', `Failed to process your ${requestType} request. Please try again.`),
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
      setProcessingType(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-800"
        >
          <Bell className="w-4 h-4" />
          {t('waiter_request.button_text', 'Request Waiter')}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-600" />
            {t('waiter_request.dialog_title', 'Service Request')}
          </DialogTitle>
          <DialogDescription>
            {t('waiter_request.dialog_desc', `Table ${tableNumber} - Choose the type of service you need`)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {requestOptions.map((option) => {
            const Icon = option.icon
            const isCurrentlyProcessing = isProcessing && processingType === option.type
            
            return (
              <Card 
                key={option.type}
                className={`cursor-pointer transition-all duration-200 border-2 ${option.bgColor} ${
                  isProcessing && processingType !== option.type 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => !isProcessing && handleRequest(option.type)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${option.bgColor}`}>
                      {isCurrentlyProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                      ) : (
                        <Icon className={`w-5 h-5 ${option.color}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {option.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {option.description}
                      </p>
                    </div>
                    {isCurrentlyProcessing && (
                      <Badge variant="secondary" className="text-xs">
                        {t('waiter_request.processing', 'Processing...')}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle className="w-4 h-4" />
            {t('waiter_request.auto_print', 'Will be printed automatically')}
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isProcessing}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
