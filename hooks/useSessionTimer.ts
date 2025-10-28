"use client"

import { useEffect, useState } from "react"
import { getActiveSession } from "@/lib/mockData"
import { toast } from "@/hooks/use-toast"

export function useSessionTimer() {
  const [sessionStartTime] = useState(() => {
    // Simulate session start time - in real app this would come from when user logged in
    const now = new Date()
    return now.getTime()
  })

  useEffect(() => {
    const activeSession = getActiveSession()
    if (!activeSession) return

    // Calculate when to show the 30-minute warning
    const sessionDurationMs = activeSession.duration * 60 * 1000 // Convert minutes to milliseconds
    const warningTimeMs = sessionDurationMs - 30 * 60 * 1000 // 30 minutes before end

    const warningTimer = setTimeout(() => {
      toast({
        title: "Session Ending Soon",
        description: "Your session will end in 30 minutes.",
        duration: 10000, // Show for 10 seconds
      })
    }, warningTimeMs)

    const endTimer = setTimeout(() => {
      toast({
        title: "Session Ended",
        description: "Your buffet session has ended. Please proceed to payment.",
        duration: 15000, // Show for 15 seconds
      })
    }, sessionDurationMs)

    // Cleanup timers on unmount
    return () => {
      clearTimeout(warningTimer)
      clearTimeout(endTimer)
    }
  }, [sessionStartTime])

  return null
}
