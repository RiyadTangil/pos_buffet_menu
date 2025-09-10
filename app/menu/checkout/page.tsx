"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, CreditCard, User, Users, Coffee, AlertTriangle } from "lucide-react"
import { exampleOrders } from "@/lib/mockData"

const mockWaiters = [
  { id: "W001", name: "Alice Johnson", shift: "morning" },
  { id: "W002", name: "Bob Smith", shift: "afternoon" },
  { id: "W003", name: "Carol Davis", shift: "evening" },
  { id: "W004", name: "David Wilson", shift: "night" },
]

export default function CheckoutPage() {
  const router = useRouter()
  const [waiterId, setWaiterId] = useState("")
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [waiterError, setWaiterError] = useState("")

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
  const tableNumber = 5 // This would come from selected table

  const handlePayment = async () => {
    if (!waiterId.trim()) {
      setWaiterError("Please enter waiter ID")
      return
    }

    const waiter = mockWaiters.find((w) => w.id.toLowerCase() === waiterId.toLowerCase())
    if (!waiter) {
      setWaiterError("Invalid waiter ID. Please check and try again.")
      return
    }

    setWaiterError("")
    setIsProcessing(true)

    // Simulate payment processing
    setTimeout(() => {
      setPaymentProcessed(true)
      setIsProcessing(false)

      // Redirect to tables after 3 seconds
      setTimeout(() => {
        router.push("/mtables")
      }, 3000)
    }, 2000)
  }

  if (paymentProcessed) {
    const waiter = mockWaiters.find((w) => w.id.toLowerCase() === waiterId.toLowerCase())
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
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {exampleOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">Order #{order.id}</span>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.items.map((item, index) => (
                        <div key={index}>
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                <strong>Valid Waiter IDs:</strong> W001, W002, W003, W004
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
