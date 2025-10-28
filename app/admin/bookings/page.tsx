"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BookingsPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Management</CardTitle>
          <CardDescription>Manage table reservations and bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button>New Booking</Button>
            <div className="border rounded-lg p-4">
              <p className="text-center text-gray-500">Booking management interface will be implemented here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}