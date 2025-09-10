"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CouponsPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Coupon Management</CardTitle>
          <CardDescription>Create and manage discount coupons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button>Create New Coupon</Button>
            <div className="border rounded-lg p-4">
              <p className="text-center text-gray-500">Coupon management interface will be implemented here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}