"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, CreditCard, User, Users, Coffee, AlertTriangle } from "lucide-react"
import { saveOrder, getOrders, type CheckoutOrder, type SessionOrder } from "@/lib/api/orders-client"
import { getBuffetSettings, type BuffetSettings } from "@/lib/api/settings"
import { fetchUsers, type User as WaiterUser } from "@/lib/api/users"

export default function CheckoutPage() {
  const router = useRouter()
  const [waiterId, setWaiterId] = useState("")
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [waiterError, setWaiterError] = useState("")
  const [buffetSettings, setBuffetSettings] = useState<BuffetSettings | null>(null)
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([])
  const [waiters, setWaiters] = useState<WaiterUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tableId, setTableId] = useState<string>('')
  const [tableNumber, setTableNumber] = useState<number>(0)
  const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 1, infants: 0 })

  // Load real data from localStorage and APIs
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get table number and guest counts from localStorage
        const selectedTableId = localStorage.getItem('selectedTableId')
        const storedGuestCounts = localStorage.getItem('guestCounts')
        
        if (selectedTableId) {
          // Extract table number from table ID (assuming format like 'table-1', 'table-2', etc.)
          const tableNum = parseInt(selectedTableId.split('-')[1]) || 1
          setTableId(selectedTableId)
          setTableNumber(tableNum)
        }
        
        if (storedGuestCounts) {
          const parsedGuestCounts = JSON.parse(storedGuestCounts)
          setGuestCounts(parsedGuestCounts)
        }
        
        // Load settings, orders, and waiters
        const [settingsData, ordersData, waitersData] = await Promise.all([
          getBuffetSettings(),
          getOrders({ type: 'session', tableNumber: selectedTableId ? parseInt(selectedTableId.split('-')[1]) || 1 : 1 }),
          fetchUsers()
        ])
        
        setBuffetSettings(settingsData.settings)
        setSessionOrders(ordersData.orders as SessionOrder[])
        
        // Filter only active waiters
        if (waitersData.success && waitersData.data) {
          const activeWaiters = waitersData.data.filter(user => 
            user.role === 'waiter' && user.status === 'active'
          )
          setWaiters(activeWaiters)
        }
      } catch (error) {
        console.error('Error loading checkout data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Get current session based on time (simplified - you may want to add session selection)
  const getCurrentSession = () => {
    const now = new Date()
    const currentHour = now.getHours()
    
    if (currentHour >= 7 && currentHour < 12) {
      return buffetSettings?.sessions?.breakfast
    } else if (currentHour >= 12 && currentHour < 18) {
      return buffetSettings?.sessions?.lunch
    } else {
      return buffetSettings?.sessions?.dinner
    }
  }

  const currentSession = getCurrentSession()
  
  const sessionData = {
    adults: guestCounts.adults,
    children: guestCounts.children,
    infants: guestCounts.infants,
    extraDrinks: true,
    adultPrice: currentSession?.adultPrice || 25,
    childPrice: currentSession?.childPrice || 15,
    infantPrice: currentSession?.infantPrice || 0,
    drinkPrice: buffetSettings?.extraDrinksPrice || 5,
  }

  const calculateTotal = () => {
    let total = 0
    total += sessionData.adults * sessionData.adultPrice
    total += sessionData.children * sessionData.childPrice
    total += sessionData.infants * sessionData.infantPrice
    if (sessionData.extraDrinks) {
      total += sessionData.drinkPrice
    }
    return total
  }

  const sessionPrice = calculateTotal()
  const sessionDuration = "2 hours"

  const handlePayment = async () => {
    if (!waiterId.trim()) {
      setWaiterError("Please enter waiter ID")
      return
    }

    const waiter = waiters.find((w) => w.id.toLowerCase() === waiterId.toLowerCase())
    if (!waiter) {
      setWaiterError("Invalid waiter ID. Please check and try again.")
      return
    }

    setWaiterError("")
    setIsProcessing(true)

    try {
      // Create checkout order
      const checkoutOrder: CheckoutOrder = {
        orderId: `CHECKOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tableId: tableId,
        tableNumber: tableNumber,
        sessionData: sessionData,
        totalAmount: sessionPrice,
        waiterId: waiterId,
        waiterName: waiter.name,
        paymentStatus: 'completed',
        timestamp: new Date().toISOString(),
        sessionDuration: sessionDuration,
        type: 'checkout'
      }

      // Save checkout order
      const result = await saveOrder(checkoutOrder)
      
      if (result.success) {
        setPaymentProcessed(true)
        setIsProcessing(false)

        // Redirect to tables after 3 seconds
        setTimeout(() => {
          router.push("/tables")
        }, 3000)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      setWaiterError('Failed to process payment. Please try again.')
      setIsProcessing(false)
    }
  }

  if (paymentProcessed) {
    const waiter = waiters.find((w) => w.id.toLowerCase() === waiterId.toLowerCase())
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-2">
              £{sessionPrice} processed by {waiter?.name}
            </p>
            <p className="text-gray-600 mb-4">Table {tableNumber} is now available</p>
            <p className="text-sm text-gray-500">Redirecting to tables...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Session Checkout</h1>
          <p className="text-gray-600">Complete payment for Table {tableNumber}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Session Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Table Number:</span>
                <span className="font-semibold">#{tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Session Duration:</span>
                <span className="font-semibold">{sessionDuration}</span>
              </div>

              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">Guest Breakdown:</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      Adults ({sessionData.adults} × £{sessionData.adultPrice}):
                    </span>
                    <span className="font-semibold">£{sessionData.adults * sessionData.adultPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Children ({sessionData.children} × £{sessionData.childPrice}):
                    </span>
                    <span className="font-semibold">£{sessionData.children * sessionData.childPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Infants ({sessionData.infants} × £{sessionData.infantPrice}):
                    </span>
                    <span className="font-semibold">£{sessionData.infants * sessionData.infantPrice}</span>
                  </div>
                  {sessionData.extraDrinks && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        <Coffee className="w-3 h-3" />
                        Extra Drinks:
                      </span>
                      <span className="font-semibold">£{sessionData.drinkPrice}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold">
                <span>Total Amount:</span>
                <span className="text-orange-600">£{sessionPrice}</span>
              </div>
            </CardContent>
          </Card>

          {/* Orders History */}
          <Card>
            <CardHeader>
              <CardTitle>Orders This Session</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center text-gray-500 py-4">Loading orders...</div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {sessionOrders.length > 0 ? (
                    sessionOrders.slice(0, 5).map((order) => (
                      <div key={order.orderId} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">Order #{order.orderId.split('_')[1]}</span>
                          <Badge 
                            variant={order.status === 'completed' ? 'default' : 'outline'}
                            className={order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                     order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                                     order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                     order.status === 'served' ? 'bg-purple-100 text-purple-800' : ''}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{item.quantity}x {item.name}</span>
                              <span>£{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Total: £{order.totalAmount.toFixed(2)} • {new Date(order.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No orders found for this table
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Waiter Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="waiterId">Waiter ID / Register Number</Label>
                <Input
                  id="waiterId"
                  placeholder="Enter waiter ID (e.g., W001)"
                  value={waiterId}
                  onChange={(e) => {
                    setWaiterId(e.target.value)
                    setWaiterError("")
                  }}
                  className={`mt-1 ${waiterError ? "border-red-500" : ""}`}
                />
                {waiterError && (
                  <Alert className="mt-2 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700 text-sm">{waiterError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || !waiterId.trim()}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  size="lg"
                >
                  {isProcessing ? "Processing..." : `Process Payment £${sessionPrice}`}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1 mb-3">
                <li>• Collect £{sessionPrice} from the customer</li>
                <li>• Enter your waiter ID to process the payment</li>
                <li>• Table will be automatically freed after payment</li>
                <li>• Customer receipt will be generated</li>
              </ul>
              <div className="text-xs text-blue-700">
                <strong>Valid Waiter IDs:</strong> {waiters.length > 0 ? waiters.map(w => w.id).join(', ') : 'Loading...'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
