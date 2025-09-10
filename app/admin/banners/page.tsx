"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BannersPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Banner Management</CardTitle>
          <CardDescription>Manage promotional banners and advertisements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button>Add New Banner</Button>
            <div className="border rounded-lg p-4">
              <p className="text-center text-gray-500">Banner management interface will be implemented here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}