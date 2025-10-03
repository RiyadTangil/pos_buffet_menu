'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Home } from 'lucide-react'

interface SessionEndedModalProps {
  isOpen: boolean
  tableNumber?: number
}

export default function SessionEndedModal({ isOpen, tableNumber }: SessionEndedModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleRedirect = () => {
    // Clear any remaining localStorage data
    localStorage.clear()
    
    // Redirect to tables page
    router.push('/menu/tables')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Session Ended
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">
              The session for {tableNumber ? `Table ${tableNumber}` : 'this table'} has been completed.
            </p>
            <p className="text-gray-600 text-sm">
              Payment has been processed and the table is now available for new customers.
            </p>
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={handleRedirect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
              size="lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Return to Tables
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            This window will automatically redirect you to the tables page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}