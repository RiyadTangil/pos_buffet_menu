"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { BuffetSettings } from "@/lib/api/settings"

interface ItemsLimitProgressProps {
  currentItems: number
  buffetSettings: BuffetSettings
  currentSession: 'breakfast' | 'lunch' | 'dinner'
  className?: string
}

export function ItemsLimitProgress({ currentItems, buffetSettings, currentSession, className }: ItemsLimitProgressProps) {
  const [guestCounts, setGuestCounts] = useState({ adults: 0, children: 0, infants: 0 })

  // Update guest counts when localStorage changes
  useEffect(() => {
    const updateGuestCounts = async () => {
      // Check if we're in a synchronized group
      const groupType = localStorage.getItem('groupType')
      const groupId = localStorage.getItem('groupId')
      
      if (groupType === 'same' && groupId) {
        // Fetch combined guest counts from synchronized group
        try {
          const response = await fetch(`/api/synchronized-groups?groupId=${groupId}`)
          const result = await response.json()
          
          if (result.success && result.data?.guestCounts) {
            setGuestCounts({
              adults: result.data.guestCounts.adults || 0,
              children: result.data.guestCounts.children || 0,
              infants: result.data.guestCounts.infants || 0
            })
            return
          }
        } catch (error) {
          console.error('Failed to fetch synchronized group guest counts:', error)
        }
      }
      
      // Fallback to localStorage guest counts
      const storedGuestCounts = JSON.parse(localStorage.getItem('guestCounts') || '{}')
      setGuestCounts({
        adults: storedGuestCounts.adults || 0,
        children: storedGuestCounts.children || 0,
        infants: storedGuestCounts.infants || 0
      })
    }

    updateGuestCounts()
    
    // Listen for storage changes
    window.addEventListener('storage', updateGuestCounts)
    
    // Custom event for same-tab localStorage changes
    window.addEventListener('guestCountsUpdated', updateGuestCounts)
    
    return () => {
      window.removeEventListener('storage', updateGuestCounts)
      window.removeEventListener('guestCountsUpdated', updateGuestCounts)
    }
  }, [])

  // Calculate max items based on guest counts and session-specific limits
  const calculateMaxItems = () => {
    // Get items limit for current session
    let itemsLimit = buffetSettings.itemsLimit
    
    // Check if there's session-specific items limit
    if (buffetSettings.sessionSpecificItemsLimit && buffetSettings.sessionSpecificItemsLimit[currentSession]) {
      itemsLimit = buffetSettings.sessionSpecificItemsLimit[currentSession]
    }

    // If no items limit is configured, return 0 (no limit)
    if (!itemsLimit) {
      return 0
    }

    // Calculate maximum allowed items using state
    return (
      (guestCounts.adults * itemsLimit.adultLimit) +
      (guestCounts.children * itemsLimit.childLimit) +
      (guestCounts.infants * itemsLimit.infantLimit)
    )
  }

  const maxItems = calculateMaxItems()
  
  // Don't render if no items limit is configured
  if (maxItems === 0) {
    return null
  }
  
  const percentage = (currentItems / maxItems) * 100
  const remainingItems = Math.max(0, maxItems - currentItems)
  
  // Determine status and styling based on usage
  const getStatus = () => {
    if (currentItems >= maxItems) {
      return {
        status: 'full',
        color: 'destructive',
        bgColor: 'bg-red-50 border-red-200',
        textColor: 'text-red-700',
        icon: AlertTriangle,
        message: 'Limit reached'
      }
    } else if (percentage >= 80) {
      return {
        status: 'warning',
        color: 'warning',
        bgColor: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-700',
        icon: Clock,
        message: 'Almost full'
      }
    } else {
      return {
        status: 'normal',
        color: 'secondary',
        bgColor: 'bg-green-50 border-green-200',
        textColor: 'text-green-700',
        icon: CheckCircle,
        message: 'Available'
      }
    }
  }

  const statusInfo = getStatus()
  const StatusIcon = statusInfo.icon

  return (
    <div className={cn(
      "px-4 py-2 rounded-lg border transition-all duration-300 shadow-sm",
      statusInfo.bgColor,
      percentage >= 100 && "animate-pulse",
      percentage >= 80 && percentage < 100 && "ring-1 ring-yellow-300",
      className
    )}>
      {/* Single line layout */}
      <div className="flex items-center gap-4">
        {/* Status icon and label */}
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={cn(
            "h-4 w-4 transition-all duration-200 flex-shrink-0", 
            statusInfo.textColor,
            percentage >= 100 && "animate-bounce"
          )} />
          <span className={cn("font-medium text-sm whitespace-nowrap", statusInfo.textColor)}>
            Items Limit
          </span>
        </div>
        
        {/* Progress bar - takes available space */}
        <div className="flex-1 min-w-0">
          <Progress 
            value={percentage} 
            className="h-2 bg-gray-100"
            indicatorClassName={cn(
              "transition-all duration-500 ease-out",
              percentage >= 100 ? "bg-gradient-to-r from-red-500 to-red-600" :
              percentage >= 80 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" : 
              "bg-gradient-to-r from-green-400 to-green-500"
            )}
          />
        </div>
        
        {/* Items count */}
        <div className="flex items-center gap-3 text-sm whitespace-nowrap">
          <span className={cn("font-medium", statusInfo.textColor)}>
            {currentItems}/{maxItems}
          </span>
          <span className={cn("text-xs opacity-75", statusInfo.textColor)}>
            {Math.round(percentage)}%
          </span>
        </div>
        
        {/* Status badge */}
        <Badge 
          variant={statusInfo.color as any}
          className={cn(
            "text-xs transition-all duration-200 flex-shrink-0",
            percentage >= 100 && "animate-pulse"
          )}
        >
          {statusInfo.message}
        </Badge>
      </div>
      
      {/* Compact tip - only show for critical states */}
      {currentItems >= maxItems && (
        <div className="mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <span className="font-medium">⚠️ Limit reached!</span> Complete your order to add more items.
        </div>
      )}
    </div>
  )
}

export default ItemsLimitProgress