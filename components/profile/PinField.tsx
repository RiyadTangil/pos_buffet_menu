"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Key, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateUserField } from '@/lib/api/users'

interface PinFieldProps {
  value: string
  userId: string
  onUpdate: (field: string, value: string) => Promise<void>
  isLoading?: boolean
}

export function PinField({ value, userId, onUpdate, isLoading = false }: PinFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validatePin = async (pin: string) => {
    if (!pin) {
      setValidationError(null)
      return true
    }

    if (!/^\d{4}$/.test(pin)) {
      setValidationError('PIN must be exactly 4 digits')
      return false
    }

    if (pin === value) {
      setValidationError(null)
      return true
    }

    try {
      setValidating(true)
      const response = await fetch('/api/users/check-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin,
          excludeUserId: userId
        })
      })

      const data = await response.json()
      
      if (!data.success || !data.available) {
        setValidationError(data.error || 'PIN is not available')
        return false
      }

      setValidationError(null)
      return true
    } catch (error) {
      setValidationError('Failed to validate PIN')
      return false
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    if (!editValue || editValue.length !== 4) {
      toast.error('PIN must be exactly 4 digits')
      return
    }

    if (!/^\d{4}$/.test(editValue)) {
      toast.error('PIN must contain only digits')
      return
    }

    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      // Check PIN uniqueness
      const checkResponse = await fetch('/api/users/check-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          pin: editValue,
          excludeUserId: userId 
        }),
      })

      const checkResult = await checkResponse.json()
      
      if (!checkResult.success) {
        toast.error(checkResult.error || 'PIN validation failed')
        return
      }

      if (!checkResult.available) {
        toast.error('This PIN is already in use by another waiter')
        return
      }

      // Update PIN
      const updateResult = await updateUserField(userId, 'pin', editValue)
      
      if (updateResult.success) {
        await onUpdate('pin', editValue)
        setIsEditing(false)
        toast.success('PIN updated successfully')
      } else {
        toast.error(updateResult.error || 'Failed to update PIN')
      }
    } catch (error) {
      console.error('Error updating PIN:', error)
      toast.error('Failed to update PIN')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setValidationError(null)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, '') // Only allow digits
    setEditValue(inputValue)
    setValidationError(null)
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3 flex-1">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Key className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">4-Digit PIN</p>
          {isEditing ? (
            <div className="mt-1">
              <Input
                type="text"
                maxLength={4}
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                className={`h-8 ${validationError ? 'border-red-500' : ''}`}
                placeholder="Enter 4-digit PIN"
                autoFocus
                disabled={saving || isLoading || validating}
              />
              {validationError && (
                <p className="text-xs text-red-500 mt-1">{validationError}</p>
              )}
              {validating && (
                <p className="text-xs text-blue-500 mt-1 flex items-center">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Checking PIN availability...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-900">
              {value ? '••••' : 'Not set'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {isEditing ? (
          <>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleSave}
              disabled={saving || isLoading || validating || !!validationError}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleCancel}
              disabled={saving || isLoading}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}