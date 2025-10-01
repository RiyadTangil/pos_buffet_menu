"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface WaiterPinVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  tableNumber: number;
  tableId: string;
}

export function WaiterPinVerification({
  isOpen,
  onClose,
  onVerified,
  tableNumber,
  tableId,
}: WaiterPinVerificationProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!pin.trim()) {
      toast.error("Please enter the waiter PIN");
      return;
    }

    if (pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }

    setIsVerifying(true);

    try {
      // TODO: Implement actual PIN verification with backend
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock verification - in real implementation, this would call an API
      const isValidPin = await verifyWaiterPin(pin, tableId);
      
      if (isValidPin) {
        toast.success("PIN verified successfully!");
        onVerified();
      } else {
        toast.error("Invalid PIN. Please check with your waiter.");
        setPin("");
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPin("");
    setShowPin(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Waiter PIN Required
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Verify with waiter to join Table {tableNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
            <p className="text-sm text-green-800">
              To join the same group and share orders with other devices at this table, 
              please ask your waiter for the verification PIN.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waiter-pin" className="text-sm font-medium">
              Waiter PIN
            </Label>
            <div className="relative">
              <Input
                id="waiter-pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyPress={handleKeyPress}
                placeholder="Enter 4-6 digit PIN"
                className="pr-10"
                disabled={isVerifying}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPin(!showPin)}
                disabled={isVerifying}
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              This PIN ensures only authorized devices can join the same order group
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isVerifying}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={!pin.trim() || pin.length < 4 || isVerifying}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isVerifying ? "Verifying..." : "Verify PIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Mock function for PIN verification - replace with actual API call
async function verifyWaiterPin(pin: string, tableId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/waiter-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        pin, 
        tableId 
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('PIN verification error:', error);
    return false;
  }
}