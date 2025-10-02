"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, AlertCircle } from "lucide-react"
import { verifyWaiterPin } from "@/lib/api/table-sessions"

interface WaiterVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: (waiterInfo: { name: string; role: string }) => void
  title?: string
  description?: string
}

export function WaiterVerificationModal({
  isOpen,
  onClose,
  onVerified,
  title = "Waiter Verification Required",
  description = "Please enter your waiter PIN to proceed with joining this table."
}: WaiterVerificationModalProps) {
  const [pin, setPin] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")

  const handleVerify = async () => {
    if (!pin.trim()) {
      setError("Please enter your PIN")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const waiterInfo = await verifyWaiterPin(pin)
      onVerified(waiterInfo)
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid PIN")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    setPin("")
    setError("")
    setIsVerifying(false)
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      handleVerify()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="waiter-pin">Waiter PIN</Label>
            <Input
              id="waiter-pin"
              type="password"
              placeholder="Enter your 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={4}
              className="text-center text-lg tracking-widest"
              disabled={isVerifying}
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Demo PINs:</p>
            <ul className="space-y-1 text-xs">
              <li>• 1234 - John Doe (Waiter)</li>
              <li>• 5678 - Jane Smith (Senior Waiter)</li>
              <li>• 9999 - Manager</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isVerifying}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleVerify}
            disabled={isVerifying || !pin.trim()}
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}