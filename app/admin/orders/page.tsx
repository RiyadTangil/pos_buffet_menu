"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OrdersPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>View and manage all restaurant orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button variant="outline">All Orders</Button>
              <Button variant="outline">Pending</Button>
              <Button variant="outline">Completed</Button>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-center text-gray-500">Order management interface will be implemented here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}