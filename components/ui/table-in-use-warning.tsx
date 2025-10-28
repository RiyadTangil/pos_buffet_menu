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
import { AlertTriangle, Users } from "lucide-react";

interface TableInUseWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: () => void;
  tableNumber: number;
  currentGuests: number;
  capacity: number;
  remainingCapacity: number;
}

export function TableInUseWarning({
  isOpen,
  onClose,
  onAddDevice,
  tableNumber,
  currentGuests,
  capacity,
  remainingCapacity,
}: TableInUseWarningProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Table Already in Use
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Table {tableNumber} is currently occupied
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                Current Occupancy
              </span>
            </div>
            <p className="text-sm text-orange-800">
              {currentGuests} of {capacity} seats are taken
            </p>
            <p className="text-sm text-orange-600 mt-1">
              {remainingCapacity} seats remaining
            </p>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-700 mb-3">
              This table is already in use by other customers. Would you like to add your device to this table?
            </p>
            <p className="text-xs text-gray-500">
              You'll be able to choose between joining as a separate group or sharing the same order group.
            </p>
          </div>
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
            onClick={onAddDevice}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            Add Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}