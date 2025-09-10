"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { orders, menuItems } from "@/lib/mockData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Users, Coffee, CheckCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  // Get menu item details for display
  const getMenuItemName = (itemId: string) => {
    const item = menuItems.find((item) => item.id === itemId)
    return item?.name || "Unknown Item"
  }

  // Mock session data - in real app this would come from context/state
  const sessionData = {
    adults: 2,
    children: 1,
    infants: 0,
    extraDrinks: true,
    adultPrice: 25, // £25 per adult
    childPrice: 15, // £15 per child
    infantPrice: 0, // Free for infants
    drinkPrice: 5, // £5 for extra drinks
  }

  const calculateSessionTotal = () => {
    let total = 0
    total += sessionData.adults * sessionData.adultPrice
    total += sessionData.children * sessionData.childPrice
    total += sessionData.infants * sessionData.infantPrice
    if (sessionData.extraDrinks) {
      total += sessionData.drinkPrice
    }
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

  // Mock waiter database
  const waiters = [
    { id: "W001", name: "John Smith" },
    { id: "W002", name: "Sarah Johnson" },
    { id: "W003", name: "Mike Wilson" },
    { id: "W004", name: "Emma Davis" },
  ]

  const handlePayment = async () => {
    if (!waiterId.trim()) return

    const waiter = waiters.find((w) => w.id.toLowerCase() === waiterId.toLowerCase())
    if (!waiter) {
      alert("Invalid waiter ID. Please check and try again.")
      return
    }

    setIsProcessing(true)

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false)
      setPaymentComplete(true)

      // Record payment under waiter's name (in real app, this would be saved to database)
      console.log(`Payment of £${grandTotal} recorded under waiter: ${waiter.name} (${waiter.id})`)

      // Redirect to tables page after 2 seconds
      setTimeout(() => {
        router.push("/menu/tables")
      }, 2000)
    }, 2000)
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
                    {sessionData.extraDrinks ? "Included (+£5)" : "Not included"}
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.orderId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-gray-600">{order.orderId.toUpperCase()}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{formatTime(order.createdAt)}</td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {order.items.map((item, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{getMenuItemName(item.menuItemId)}</span>
                              <span className="text-gray-500 ml-2">×{item.quantity}</span>
                              {item.notes && <div className="text-xs text-gray-400 italic">Note: {item.notes}</div>}
                            </div>
                          ))}
                        </div>
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
          </CardContent>
        </Card>

        {/* Session Total Card */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Session Total</h3>
                  <p className="text-sm text-green-700">Buffet access for all guests</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-900">£{grandTotal}</div>
                  <div className="text-sm text-green-700">
                    {orders.length} order{orders.length !== 1 ? "s" : ""} placed
                  </div>
                </div>
              </div>

              <div className="text-sm text-green-700 space-y-1">
                <div className="flex justify-between">
                  <span>
                    Adults ({sessionData.adults} × £{sessionData.adultPrice}):
                  </span>
                  <span>£{sessionData.adults * sessionData.adultPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Children ({sessionData.children} × £{sessionData.childPrice}):
                  </span>
                  <span>£{sessionData.children * sessionData.childPrice}</span>
                </div>
                {sessionData.extraDrinks && (
                  <div className="flex justify-between">
                    <span>Extra Drinks:</span>
                    <span>£{sessionData.drinkPrice}</span>
                  </div>
                )}
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
                    <DialogDescription>Enter the waiter ID to process payment of £{grandTotal}</DialogDescription>
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
                          <Label htmlFor="waiterId">Waiter ID</Label>
                          <Input
                            id="waiterId"
                            placeholder="Enter waiter ID (e.g., W001)"
                            value={waiterId}
                            onChange={(e) => setWaiterId(e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-medium text-gray-700 mb-2">Available Waiters:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {waiters.map((waiter) => (
                              <div key={waiter.id} className="flex justify-between">
                                <span>{waiter.id}</span>
                                <span className="text-gray-600">{waiter.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button onClick={handlePayment} disabled={!waiterId.trim() || isProcessing} className="w-full">
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
