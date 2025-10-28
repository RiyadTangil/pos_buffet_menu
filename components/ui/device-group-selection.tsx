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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, ShoppingCart, Clock } from "lucide-react";

interface DeviceGroupSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifferentGroup: () => void;
  onSelectSameGroup: () => void;
  tableNumber: number;
}

export function DeviceGroupSelection({
  isOpen,
  onClose,
  onSelectDifferentGroup,
  onSelectSameGroup,
  tableNumber,
}: DeviceGroupSelectionProps) {
  const [selectedOption, setSelectedOption] = useState<'different' | 'same' | null>(null);

  const handleConfirm = () => {
    if (selectedOption === 'different') {
      onSelectDifferentGroup();
    } else if (selectedOption === 'same') {
      onSelectSameGroup();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Choose Device Group Type
          </DialogTitle>
          <DialogDescription>
            How would you like to join Table {tableNumber}?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Different Group Option */}
          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              selectedOption === 'different' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedOption('different')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Different Group</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm mb-3">
                Join as a separate group with your own orders and timing
              </CardDescription>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3" />
                  <span>Separate cart and orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Independent session timing</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-3 w-3" />
                  <span>Own guest count and limits</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Same Group Option */}
          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              selectedOption === 'same' 
                ? 'ring-2 ring-green-500 bg-green-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedOption('same')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-lg">Same Group</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm mb-3">
                Join the existing group and share orders and timing
              </CardDescription>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3" />
                  <span>Shared cart and synchronized orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Synchronized session timing</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-3 w-3" />
                  <span>Requires waiter PIN verification</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOption}
            className="flex-1"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}