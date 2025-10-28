'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock } from 'lucide-react'

interface SessionCountdownProps {
  currentSession: {
    key: string
    data: {
      startTime: string
      endTime: string
    }
  }
}

export function SessionCountdown({ currentSession }: SessionCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [showCountdown, setShowCountdown] = useState<boolean>(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      const [endHour, endMin] = currentSession.data.endTime.split(':').map(Number)
      
      const endTime = new Date()
      endTime.setHours(endHour, endMin, 0, 0)
      
      // If end time is before current time, it's for the next day
      if (endTime < now) {
        endTime.setDate(endTime.getDate() + 1)
      }
      
      const diffMs = endTime.getTime() - now.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)
      
      setTimeRemaining(diffSeconds)
      setShowCountdown(diffMinutes <= 15 && diffSeconds > 0)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [currentSession])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    }
    return `${minutes}m ${seconds}s`
  }

  // If countdown should show, return the countdown display
  if (showCountdown) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 font-medium">
          Session ending in {formatTime(timeRemaining)} - Please complete your order soon!
        </AlertDescription>
      </Alert>
    )
  }

  // If countdown shouldn't show, return the normal session display
  return (
    <div className="flex items-center gap-4 bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
      <Clock className="h-5 w-5 text-blue-600" />
      <div className="text-sm">
        <div className="font-semibold text-blue-900 capitalize">{currentSession.key}</div>
        <div className="text-blue-700">{currentSession.data.startTime} - {currentSession.data.endTime}</div>
      </div>
    </div>
  )
}