"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProductsPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Items Management</CardTitle>
          <CardDescription>Manage your menu items, prices, and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button>Add New Item</Button>
            <div className="border rounded-lg p-4">
              <p className="text-center text-gray-500">Product management interface will be implemented here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}