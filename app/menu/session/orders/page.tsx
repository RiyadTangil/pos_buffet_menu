"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getOrders } from "@/lib/api/orders-client"
import { fetchUsers } from "@/lib/api/users"
import { getBuffetSettings } from "@/lib/api/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Users, Coffee, CheckCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function SessionOrdersPage() {
  const router = useRouter()
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [waiterId, setWaiterId] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [waiters, setWaiters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableNumber, setTableNumber] = useState<any>()
  const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0, infants: 0 })
  const [buffetSettings, setBuffetSettings] = useState<any>(null)

  // Get current session based on time
  const getCurrentSession = () => {


    if (!buffetSettings?.sessions) return null
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    
    const sessions = [
      { key: 'breakfast', data: buffetSettings.sessions.breakfast },
      { key: 'lunch', data: buffetSettings.sessions.lunch },
      { key: 'dinner', data: buffetSettings.sessions.dinner }
    ]
  
    for (const session of sessions) {
      if (!session.data.isActive) continue
      
      const [startHour, startMin] = session.data.startTime.split(':').map(Number)
      const [endHour, endMin] = session.data.endTime.split(':').map(Number)
      const startTime = startHour * 60 + startMin
      const endTime = endHour * 60 + endMin
      
      if (currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime) {
        return session
      }
    }
    
    return null
  }

  // Get current session and session data
  const currentSession = getCurrentSession()
  const sessionData = {
    adults: guestCounts.adults,
    children: guestCounts.children,
    infants: guestCounts.infants,
    extraDrinks: guestCounts.includeDrinks || false,
    adultPrice: currentSession?.data?.adultPrice || 25,
    childPrice: currentSession?.data?.childPrice || 15,
    infantPrice: currentSession?.data?.infantPrice || 0,
    drinkPrice: buffetSettings?.extraDrinksPrice || 5, // Keep for backward compatibility
    extraDrinksPricing: buffetSettings?.sessionSpecificExtraDrinksPricing?.[currentSession?.type] || buffetSettings?.extraDrinksPricing || {
      adultPrice: 5,
      childPrice: 3,
      infantPrice: 0
    },
  }

  // Load real data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get table ID from localStorage and fetch table data
        const storedTableId = localStorage.getItem('selectedTableId')
        if (storedTableId) {
          // Extract table number from table ID (assuming format like 'table-1', 'table-2', etc.)
   
          setTableNumber(storedTableId)
        }

        // Get guest counts from localStorage
      
        const storedGuestCounts = JSON.parse(localStorage.getItem('guestCounts') || '{}')
       
        setGuestCounts(storedGuestCounts)

        // Fetch buffet settings
        const settings = await getBuffetSettings()
        setBuffetSettings(settings.data)

        // Fetch waiters (users with role waiter)
        const {data} = await fetchUsers()
        const waiterUsers = data.filter((user: any) => user.role === 'waiter')
        console.log("waiterUsers", waiterUsers)

        setWaiters(waiterUsers)

        // Fetch orders for this table - only today's orders using API-level filtering
        const selectedTableId = localStorage.getItem('selectedTableId') || `table-${tableNumber}`
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        
        const tableOrders = await getOrders({
          tableId: selectedTableId,
          date: today
        })
        setOrders(tableOrders)

        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const calculateSessionTotal = () => {
    let total = 0
    // Buffet session pricing
    total += sessionData.adults * sessionData.adultPrice
    total += sessionData.children * sessionData.childPrice
    total += sessionData.infants * sessionData.infantPrice
    if (sessionData.extraDrinks) {
      // Use user-type-specific pricing for extra drinks
      total += sessionData.adults * sessionData.extraDrinksPricing.adultPrice
      total += sessionData.children * sessionData.extraDrinksPricing.childPrice
      total += sessionData.infants * sessionData.extraDrinksPricing.infantPrice
    }
    
    // Add individual item prices from orders
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemPrice = item.price || 0
          const itemQuantity = item.quantity || 1
          total += itemPrice * itemQuantity
        })
      }
    })
    
    return total
  }

  const grandTotal = calculateSessionTotal()

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "preparing":
        return "bg-blue-100 text-blue-800"
      case "ready":
        return "bg-green-100 text-green-800"
      case "served":
        return "bg-purple-100 text-purple-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handlePayment = async () => {
    if (!waiterId || !waiterId.trim()) return

    const waiter = waiters.find((w) => w.id?.toLowerCase() === waiterId.toLowerCase())
    if (!waiter) {
      alert("Invalid waiter ID. Please check and try again.")
      return
    }

    setIsProcessing(true)

    try {
      // Prepare payment data
      const selectedTableId = localStorage.getItem('selectedTableId')
      const paymentData = {
        tableId: selectedTableId || `table-${tableNumber}`,
        tableNumber: tableNumber,
        waiterId: waiter.id,
        waiterName: waiter.name,
        totalAmount: grandTotal,
        sessionType: currentSession?.key || 'lunch',
        sessionData: {
          adults: sessionData.adults,
          children: sessionData.children,
          infants: sessionData.infants,
          extraDrinks: sessionData.extraDrinks,
          adultPrice: sessionData.adultPrice,
          childPrice: sessionData.childPrice,
          infantPrice: sessionData.infantPrice,
          drinkPrice: sessionData.drinkPrice
        }
      }

      // Call payment API
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Payment failed')
      }

      setIsProcessing(false)
      setPaymentComplete(true)

      console.log(`Payment of £${grandTotal} successfully recorded:`, result.data)

      // Clear all localStorage data after successful payment
      localStorage.removeItem('tableId')
      localStorage.removeItem('guestCounts')
      localStorage.removeItem('sessionData')
      localStorage.removeItem('buffetSettings')
      localStorage.removeItem('waiters')
      localStorage.removeItem('orders')
      localStorage.removeItem('currentSession')
      localStorage.removeItem('selectedWaiterId')
      
      // Clear any other session-related data
      localStorage.clear()

      // Redirect to tables page after 2 seconds
      setTimeout(() => {
        router.push("/menu/tables")
      }, 2000)
    } catch (error) {
      console.error('Payment error:', error)
      setIsProcessing(false)
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Orders</h1>
          <p className="text-gray-600">Review all orders placed during this session</p>
        </div>

        {/* Session Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">Session Guests</div>
                  <div className="text-sm text-blue-700">
                    {sessionData.adults} Adults, {sessionData.children} Children, {sessionData.infants} Infants
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Coffee className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">Extra Drinks</div>
                  <div className="text-sm text-blue-700">
                    {sessionData.extraDrinks ? `Included (+£${(sessionData.adults * sessionData.extraDrinksPricing.adultPrice + sessionData.children * sessionData.extraDrinksPricing.childPrice + sessionData.infants * sessionData.extraDrinksPricing.infantPrice).toFixed(2)})` : "Not included"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">Session Total</div>
                  <div className="text-xl font-bold text-blue-900">£{grandTotal}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No orders found for this table</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm text-gray-600">{order.id.split('-')[1]?.toUpperCase()}</span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">{order.time}</td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {order.items.map((item: any, index: number) => (
                              <div key={index} className="text-sm">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-500 ml-2">×{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-green-600">
                            ${(order.totalAmount || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={`${getStatusColor(order.status)} border-0`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                      </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Total Card - E-commerce Style */}
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-xl font-bold text-gray-900">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Buffet Charges */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Buffet Access</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      Adults ({sessionData.adults} × £{sessionData.adultPrice})
                    </span>
                    <span className="font-medium">£{(sessionData.adults * sessionData.adultPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      Children ({sessionData.children} × £{sessionData.childPrice})
                    </span>
                    <span className="font-medium">£{(sessionData.children * sessionData.childPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      Infants ({sessionData.infants} × £{sessionData.infantPrice})
                    </span>
                    <span className="font-medium">£{(sessionData.infants * sessionData.infantPrice).toFixed(2)}</span>
                  </div>
                  {sessionData.extraDrinks && (
                    <div className="space-y-1">
                      <div className="text-gray-600 font-medium">Extra Drinks:</div>
                      {sessionData.adults > 0 && (
                        <div className="flex justify-between items-center text-sm pl-4">
                          <span className="text-gray-600">Adults ({sessionData.adults} × £{sessionData.extraDrinksPricing.adultPrice})</span>
                          <span className="font-medium">£{(sessionData.adults * sessionData.extraDrinksPricing.adultPrice).toFixed(2)}</span>
                        </div>
                      )}
                      {sessionData.children > 0 && (
                        <div className="flex justify-between items-center text-sm pl-4">
                          <span className="text-gray-600">Children ({sessionData.children} × £{sessionData.extraDrinksPricing.childPrice})</span>
                          <span className="font-medium">£{(sessionData.children * sessionData.extraDrinksPricing.childPrice).toFixed(2)}</span>
                        </div>
                      )}
                      {sessionData.infants > 0 && sessionData.extraDrinksPricing.infantPrice > 0 && (
                        <div className="flex justify-between items-center text-sm pl-4">
                          <span className="text-gray-600">Infants ({sessionData.infants} × £{sessionData.extraDrinksPricing.infantPrice})</span>
                          <span className="font-medium">£{(sessionData.infants * sessionData.extraDrinksPricing.infantPrice).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium text-gray-800">Buffet Subtotal:</span>
                  <span className="font-semibold">£{(sessionData.adults * sessionData.adultPrice + sessionData.children * sessionData.childPrice + sessionData.infants * sessionData.infantPrice + (sessionData.extraDrinks ? sessionData.drinkPrice : 0)).toFixed(2)}</span>
                </div>
              </div>

              {/* Order Items Total */}
              {orders.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Additional Orders</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        {orders.length} order{orders.length !== 1 ? "s" : ""} placed
                      </span>
                      <span className="font-medium">£{orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">£{grandTotal}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Including all buffet access and additional orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-800">Payment Required</h3>
                  <p className="text-amber-700">Please pay £{grandTotal} to complete your session</p>
                </div>
              </div>

              <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">Pay with Waiter</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Waiter Payment
                    </DialogTitle>
                    <DialogDescription>Select a waiter to process payment of £{grandTotal}</DialogDescription>
                  </DialogHeader>

                  {paymentComplete ? (
                    <div className="text-center py-6">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-green-700 mb-2">Payment Successful!</h3>
                      <p className="text-gray-600">Redirecting to tables...</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="waiterId">Select Waiter</Label>
                          <Select value={waiterId} onValueChange={setWaiterId}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Choose a waiter" />
                            </SelectTrigger>
                            <SelectContent>
                              {waiters.length > 0 ? waiters.map((waiter) => (
                                <SelectItem key={waiter.id} value={waiter.id}>
                                  {waiter.name} 
                                </SelectItem>
                              )) : (
                                <SelectItem value="" disabled>
                                  Loading waiters...
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button onClick={handlePayment} disabled={!waiterId || !waiterId.trim() || isProcessing} className="w-full">
                          {isProcessing ? "Processing..." : `Pay £${grandTotal}`}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
