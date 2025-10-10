"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, Calendar, ShoppingCart, BarChart3, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "@/components/ui/use-toast"

export default function DashboardPage() {
  const [stats, setStats] = useState([
    { title: "Total Users", value: "-", description: "Active staff members", icon: Users, trend: "" },
    { title: "Menu Items", value: "-", description: "Available products", icon: Package, trend: "" },
    { title: "Today's Orders", value: "-", description: "Orders processed", icon: ShoppingCart, trend: "" },
    { title: "Bookings", value: "-", description: "Table reservations", icon: Calendar, trend: "" }
  ])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/admin-dashboard')
        const json = await res.json()
        if (!json?.success) throw new Error(json?.error || 'Failed to load dashboard metrics')
        const { totalUsers, menuItems, todaysOrders, bookings } = json.data || {}
        if (!isMounted) return
        setStats([
          { title: "Total Users", value: String(totalUsers ?? 0), description: "Active staff members", icon: Users, trend: "" },
          { title: "Menu Items", value: String(menuItems ?? 0), description: "Available products", icon: Package, trend: "" },
          { title: "Today's Orders", value: String(todaysOrders ?? 0), description: "Orders processed", icon: ShoppingCart, trend: "" },
          { title: "Bookings", value: String(bookings ?? 0), description: "Table reservations", icon: Calendar, trend: "" }
        ])
      } catch (e: any) {
        console.error('Failed to load dashboard metrics', e)
        toast?.({ title: 'Dashboard error', description: e?.message || 'Unable to load metrics', variant: 'destructive' })
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Welcome to your restaurant management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-600 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">New user registered</span>
                <span className="text-xs text-gray-500">2 min ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Order #1234 completed</span>
                <span className="text-xs text-gray-500">5 min ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">New booking received</span>
                <span className="text-xs text-gray-500">10 min ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Server Status</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Backup</span>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}