"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ItemsLimitProgress } from '@/components/ui/items-limit-progress'
import { SessionCountdown } from '@/components/ui/session-countdown'
import { ShoppingCart, Plus, Minus, Leaf, Flame, X, Clock, Users, Utensils, ChefHat, Coffee, Cake, DollarSign } from "lucide-react"
import { type MenuCategory } from "@/lib/mockData"
import { fetchCategories } from "@/lib/api/categories"
import { fetchProducts, type Product } from "@/lib/api/products"
import { getBuffetSettings, type BuffetSettings } from "@/lib/api/settings"
import { saveOrder, type SessionOrder } from "@/lib/api/orders-client"
import { usePrinting } from '@/hooks/usePrinting'
import { PrintButton } from '@/components/printing/PrintButton'
import { PrintJobStatus } from '@/components/printing/PrintJobStatus'
import Confetti from "react-confetti"

interface CartItem {
  menuItem: Product
  quantity: number
}

const getCategoryIcon = (categoryId: string) => {
  const icons = {
    "category-starters": Utensils,
    "category-main": ChefHat,
    "category-desserts": Cake,
    "category-drinks": Coffee,
  }
  return icons[categoryId as keyof typeof icons] || Utensils
}



export default function ItemsPage() {
  const router = useRouter()
  const { printOrder, isPrinting } = usePrinting()
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)

  // Helper functions for localStorage persistence
  const saveOrderIntervalToStorage = (orderPlacedState: boolean, timeRemainingValue: number) => {
    const orderIntervalData = {
      orderPlaced: orderPlacedState,
      timeRemaining: timeRemainingValue,
      timestamp: Date.now()
    }
    localStorage.setItem('orderInterval', JSON.stringify(orderIntervalData))
  }

  const loadOrderIntervalFromStorage = () => {
    try {
      const stored = localStorage.getItem('orderInterval')
      if (!stored) return null

      const data = JSON.parse(stored)
      const now = Date.now()
      const elapsed = Math.floor((now - data.timestamp) / 1000) // seconds elapsed

      // If time has passed, calculate remaining time
      if (data.orderPlaced && data.timeRemaining > 0) {
        const remainingTime = Math.max(0, data.timeRemaining - elapsed)
        return {
          orderPlaced: remainingTime > 0,
          timeRemaining: remainingTime
        }
      }

      return null
    } catch (error) {
      console.error('Error loading order interval from storage:', error)
      return null
    }
  }

  const clearOrderIntervalFromStorage = () => {
    localStorage.removeItem('orderInterval')
  }
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  // Local printer function
  const printToLocalPrinter = (orderData: {
    orderId: string
    orderItems: any[]
    tableNumber?: string | number
    guestCount?: number
    orderTime?: string
  }) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      console.error('Could not open print window')
      return
    }

    // Format the order for printing
    const orderDate = new Date(orderData.orderTime || new Date()).toLocaleString()
    const totalAmount = orderData.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Receipt - ${orderData.orderId}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 20px;
            color: #000;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .restaurant-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .order-info {
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .order-info div {
            margin-bottom: 3px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .items-table th,
          .items-table td {
            text-align: left;
            padding: 5px 2px;
            border-bottom: 1px solid #ddd;
          }
          .items-table th {
            border-bottom: 2px solid #000;
            font-weight: bold;
          }
          .item-name {
            width: 50%;
          }
          .item-qty {
            width: 15%;
            text-align: center;
          }
          .item-price {
            width: 20%;
            text-align: right;
          }
          .item-total {
            width: 15%;
            text-align: right;
          }
          .total-section {
            border-top: 2px solid #000;
            padding-top: 10px;
            text-align: right;
          }
          .total-amount {
            font-size: 16px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">BUFFET RESTAURANT</div>
          <div>Kitchen Order</div>
        </div>
        
        <div class="order-info">
          <div><strong>Order ID:</strong> ${orderData.orderId}</div>
          <div><strong>Table:</strong> ${orderData.tableNumber || 'N/A'}</div>
          <div><strong>Guests:</strong> ${orderData.guestCount || 0}</div>
          <div><strong>Date & Time:</strong> ${orderDate}</div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="item-name">Item</th>
              <th class="item-qty">Qty</th>
              <th class="item-price">Price</th>
              <th class="item-total">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.orderItems.map(item => `
              <tr>
                <td class="item-name">${item.name}</td>
                <td class="item-qty">${item.quantity}</td>
                <td class="item-price">$${item.price.toFixed(2)}</td>
                <td class="item-total">$${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-amount">Total: $${totalAmount.toFixed(2)}</div>
        </div>

        <div class="footer">
          <div>Thank you for your order!</div>
          <div>Printed on ${new Date().toLocaleString()}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }
  const [loading, setLoading] = useState(true)
  const [buffetSettings, setBuffetSettings] = useState<any>(null)
  const [progressKey, setProgressKey] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)

  // Fetch categories, products, and buffet settings on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [settingsResponse] = await Promise.all([
          getBuffetSettings()
        ])
        
        // Set buffet settings first
        if (settingsResponse.success && settingsResponse.data) {
          setBuffetSettings(settingsResponse.data)
        }
        
        // Get current session to filter categories
        const currentSession = getCurrentSessionFromSettings(settingsResponse.data)
        
        // Fetch categories and products with session filtering
        const [categoriesData, productsData] = await Promise.all([
          currentSession ? fetchCategories(`?session=${currentSession.key}`) : fetchCategories(),
          fetchProducts()
        ])
        setCategories(categoriesData)
        setProducts(productsData)
        if (settingsResponse.success && settingsResponse.data) {
          setBuffetSettings(settingsResponse.data)
        }
        // Set first category as selected by default
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].id)
        }

        // Restore order interval state from localStorage after data is loaded
        const storedOrderInterval = loadOrderIntervalFromStorage()
        if (storedOrderInterval) {
          setOrderPlaced(storedOrderInterval.orderPlaced)
          setTimeRemaining(storedOrderInterval.timeRemaining)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      if (confirm("Are you sure you want to end your session?")) {
        router.push("/menu/session/orders")
      } else {
        window.history.pushState(null, "", window.location.href)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopState)
    window.history.pushState(null, "", window.location.href)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [router])

  // Update current time every minute to refresh session display
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
      
      // Check if current session has ended
      const currentSession = getCurrentSession()
      if (!currentSession) {
        setSessionEnded(true)
      } else {
        setSessionEnded(false)
      }
    }, 60000) // Update every minute

    return () => clearInterval(timeInterval)
  }, [buffetSettings])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const newValue = prev <= 1 ? 0 : prev - 1
          const newOrderPlaced = newValue > 0
          
          // Update localStorage with current state
          if (newValue > 0) {
            saveOrderIntervalToStorage(newOrderPlaced, newValue)
          } else {
            clearOrderIntervalFromStorage()
            setOrderPlaced(false)
          }
          
          return newValue
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeRemaining])

  const addToCart = (product: Product) => {
    // Check items limit before adding to cart
    const currentSession = getCurrentSession()
    if (!currentSession || !buffetSettings) {
      alert('No active session found. Please try again during buffet hours.')
      return
    }

    // Get guest counts from localStorage
    const storedGuestCounts = JSON.parse(localStorage.getItem('guestCounts') || '{}')
    const adultCount = storedGuestCounts.adults || 0
    const childCount = storedGuestCounts.children || 0
    const infantCount = storedGuestCounts.infants || 0

    if (adultCount === 0 && childCount === 0 && infantCount === 0) {
      alert('Guest information is missing. Please return to the tables page and enter guest information.')
      return
    }

    // Get items limit for current session
    const sessionKey = currentSession.key as 'breakfast' | 'lunch' | 'dinner'
    let itemsLimit = buffetSettings.itemsLimit
    
    // Check if there's session-specific items limit
    if (buffetSettings.sessionSpecificItemsLimit && buffetSettings.sessionSpecificItemsLimit[sessionKey]) {
      itemsLimit = buffetSettings.sessionSpecificItemsLimit[sessionKey]
    }

    // If no items limit is set, skip validation
    if (!itemsLimit) {
      // No validation needed
    } else {
      // Calculate maximum allowed items based on guest counts and limits
      const maxAllowedItems = (
        (adultCount * itemsLimit.adultLimit) +
        (childCount * itemsLimit.childLimit) +
        (infantCount * itemsLimit.infantLimit)
      )

      // Get current total items in cart
      const currentTotalItems = getTotalItems()

      // Check if adding this item would exceed the limit
      if (currentTotalItems >= maxAllowedItems) {
        alert(`You have reached the maximum limit of ${maxAllowedItems} items per round. Please complete your current order before adding more items.`)
        return
      }
    }

    setCart((prev) => {
      const existingItem = prev.find((item) => item.menuItem.id === product.id)
      if (existingItem) {
        return prev.map((item) => (item.menuItem.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { menuItem: product, quantity: 1 }]
    })
    setProgressKey(prev => prev + 1) // Force progress component re-render
  }

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      return prev
        .map((item) => (item.menuItem.id === menuItemId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    })
    setProgressKey(prev => prev + 1) // Force progress component re-render
  }

  const getItemQuantity = (menuItemId: string) => {
    const cartItem = cart.find((item) => item.menuItem.id === menuItemId)
    return cartItem?.quantity || 0
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.categoryId === categoryId)
  }

  const handleConfirmOrder = async () => {
    try {
      // Get current session
      const currentSession = getCurrentSession()
      if (!currentSession) {
        alert('No active session found. Please try again during buffet hours.')
        return
      }

      // Get table ID and number from localStorage - ensure we use real values
      const selectedTableId = localStorage.getItem('selectedTableId')
      if (!selectedTableId) {
        alert('No table selected. Please return to the tables page and select a table.')
        router.push('/menu/tables')
        return
      }
     const storedGuestCounts = JSON.parse(localStorage.getItem('guestCounts') || '{}')
       
      
      
      // if (!storedGuestCounts.adults .children .infants && !childCount && !infantCount) {
      if (!storedGuestCounts.adults &&storedGuestCounts.children &&storedGuestCounts.infants ) {
        alert('Guest information is missing. Please return to the tables page and enter guest information.')
        router.push('/menu/tables')
        return
      }
      
     
      
     

      // Prepare order data for new API
      const orderData = {
        tableId: selectedTableId,
        // tableNumber,
        session: currentSession.key as 'breakfast' | 'lunch' | 'dinner',
        items: cart.map(item => ({
          id: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price || 0,
          quantity: item.quantity,
          category: item.menuItem.categoryId
        })),
        storedGuestCounts
      }

      // Send order to new API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('Order created successfully:', result.orderId)
        setLastOrderId(result.orderId)
        
        // Print the order - IP-based printer (commented out for now)
        /*
        try {
          const orderItems = cart.map(item => ({
            id: item.menuItem.id,
            name: item.menuItem.name,
            quantity: item.quantity,
            price: item.menuItem.price || 0,
            categoryId: item.menuItem.categoryId,
            category: {
              id: item.menuItem.categoryId,
              name: categories.find(cat => cat.id === item.menuItem.categoryId)?.name || 'Unknown'
            }
          }))

          await printOrder({
            orderId: result.orderId,
            orderItems,
            tableNumber: selectedTableId,
            guestCount: (storedGuestCounts.adults || 0) + (storedGuestCounts.children || 0) + (storedGuestCounts.infants || 0),
            orderTime: new Date().toISOString()
          })
        } catch (printError) {
          console.error('Print error:', printError)
          // Don't block the order flow if printing fails
        }
        */

        // Print to local printer
        try {
          const orderItems = cart.map(item => ({
            id: item.menuItem.id,
            name: item.menuItem.name,
            quantity: item.quantity,
            price: item.menuItem.price || 0,
            categoryId: item.menuItem.categoryId,
            category: {
              id: item.menuItem.categoryId,
              name: categories.find(cat => cat.id === item.menuItem.categoryId)?.name || 'Unknown'
            }
          }))

          // Use browser's print functionality for local printer
          printToLocalPrinter({
            orderId: result.orderId,
            orderItems,
            tableNumber: selectedTableId,
            guestCount: (storedGuestCounts.adults || 0) + (storedGuestCounts.children || 0) + (storedGuestCounts.infants || 0),
            orderTime: new Date().toISOString()
          })
        } catch (printError) {
          console.error('Local print error:', printError)
          // Don't block the order flow if printing fails
        }
        
        setShowConfetti(true)
        setOrderPlaced(true)
        // Use current session timing or default to 1 minute
        const currentSessionData = getCurrentSession()
        const timingMinutes = currentSessionData?.data.nextOrderAvailableInMinutes || 1
        const timingInSeconds = Math.max(timingMinutes * 60, 60) // Ensure at least 60 seconds
        setTimeRemaining(timingInSeconds)
        
        // Save order interval state to localStorage when order is placed
        saveOrderIntervalToStorage(true, timingInSeconds)
        
        setCart([])
        setIsCartOpen(false)

        // Hide confetti after 3 seconds but stay on items page
        setTimeout(() => {
          setShowConfetti(false)
        }, 3000)
      } else {
        console.error('Failed to create order:', result.error)
        alert('Failed to place order. Please try again.')
      }
    } catch (error) {
      console.error('Error processing order:', error)
      alert('Error placing order. Please try again.')
    }
  }

  const formatTime = (seconds: number) => {
    // Handle invalid or NaN values
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return "0:00"
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Helper function to get current session from settings data (used during initial fetch)
  const getCurrentSessionFromSettings = (settingsData: any) => {
    if (!settingsData?.sessions) return null
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    
    const sessions = [
      { key: 'breakfast', data: settingsData.sessions.breakfast },
      { key: 'lunch', data: settingsData.sessions.lunch },
      { key: 'dinner', data: settingsData.sessions.dinner }
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

  // Get current session based on time
  const getCurrentSession = () => {
    if (!buffetSettings?.sessions) return null
    
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute // Convert to minutes since midnight
    
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

  const currentSession = getCurrentSession()

  const handleEndSession = () => {
    router.push("/menu/session/orders")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="bg-white">
              <img
                src="/images/logo.png"
                alt="KALA Systems Logo"
                className="h-12 w-auto ms-5"
              />
            </div>
            
            {/* Current Session Display / Countdown */}
            {currentSession ? (
              <SessionCountdown currentSession={currentSession} />
            ) : buffetSettings && (
              <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                <Clock className="h-5 w-5 text-gray-600" />
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">No Active Session</div>
                  <div className="text-xs">Please check session timings</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {currentSession && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                <Clock className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <div className="font-semibold text-blue-900">Order Intervel</div>
                  <div className="text-blue-700">{currentSession.data.nextOrderAvailableInMinutes} min</div>
                </div>
              </div>
            )}
            
            <Button variant="outline" onClick={handleEndSession}>
              End Session
            </Button>

            {orderPlaced ? (
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">Order Placed!</div>
                <div className="text-sm text-gray-600">Next order available in: {formatTime(timeRemaining)}</div>
              </div>
            ) : (
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button 
                    className="relative bg-orange-600 hover:bg-orange-700" 
                    size="lg"
                    disabled={sessionEnded}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                   Item in Cart
                    {getTotalItems() > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">{getTotalItems()}</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md bg-gradient-to-b from-white to-orange-50 flex flex-col h-full overflow-hidden">
                  <SheetHeader className="border-b border-orange-200 pb-4 flex-shrink-0">
                    <SheetTitle className="text-xl text-orange-900">Your Selection</SheetTitle>
                    <SheetDescription className="text-orange-700">
                      Review your items • Unlimited quantities available
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto py-4 min-h-0">
                    {cart.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingCart className="w-16 h-16 mx-auto text-orange-300 mb-4" />
                        <p className="text-orange-600 text-lg">Your cart is empty</p>
                        <p className="text-orange-500 text-sm">Add items from the menu</p>
                      </div>
                    ) : (
                      <div className="space-y-4 px-1">
                        {cart.map((item) => (
                          <div
                            key={item.menuItem.id}
                            className="bg-white rounded-lg p-4 shadow-sm border border-orange-100"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{item.menuItem.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{item.menuItem.description}</p>
                                {item.menuItem.price && item.menuItem.price > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <DollarSign className="w-3 h-3 text-green-600" />
                                    <span className="text-sm font-semibold text-green-600">
                                      ${item.menuItem.price.toFixed(2)} each
                                    </span>
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.menuItem.id)}
                                className="text-gray-400 hover:text-red-500 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFromCart(item.menuItem.id)}
                                  className="w-8 h-8 p-0 border-orange-200 hover:bg-orange-50"
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-12 text-center font-semibold text-lg">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addToCart(item.menuItem)}
                                  className="w-8 h-8 p-0 border-orange-200 hover:bg-orange-50"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                {item.quantity} {item.quantity === 1 ? "serving" : "servings"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="border-t border-orange-200 pt-4 space-y-4 bg-white/95 backdrop-blur-sm flex-shrink-0 px-1">
                      {/* Print Job Status */}
                      {lastOrderId && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">Print Status</h4>
                          <PrintJobStatus 
                            orderId={lastOrderId}
                            showHeader={false}
                            maxItems={3}
                            autoRefresh={true}
                          />
                        </div>
                      )}
                      
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <div className="flex justify-between items-center text-lg font-semibold text-gray-900">
                          <span>Total Items:</span>
                          <span className="text-orange-600">{getTotalItems()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Buffet style • Unlimited servings</p>
                      </div>
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                        size="lg"
                        onClick={handleConfirmOrder}
                        disabled={isPrinting}
                      >
                        {isPrinting ? 'Processing...' : 'Confirm Order'}
                      </Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>

      {/* Items Limit Progress */}
      {currentSession && buffetSettings && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <ItemsLimitProgress 
            key={progressKey}
            currentItems={getTotalItems()}
            buffetSettings={buffetSettings}
            currentSession={currentSession.key as 'breakfast' | 'lunch' | 'dinner'}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Categories */}
         <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
           <div className="p-4">
             <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
             <div className="space-y-2">
               {categories.map((category) => {
                 const isSelected = selectedCategory === category.id
                 const IconComponent = getCategoryIcon(category.id)
                 return (
                   <button
                     key={category.id}
                     onClick={() => setSelectedCategory(category.id)}
                     className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                       isSelected
                         ? 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-900 border border-orange-200 shadow-sm'
                         : 'hover:bg-gray-50 text-gray-700 hover:shadow-sm'
                     }`}
                   >
                     <IconComponent className={`w-5 h-5 ${
                       isSelected ? 'text-orange-600' : 'text-gray-500'
                     }`} />
                     <div className="font-medium">{category.name}</div>
                   </button>
                 )
               })}
             </div>
           </div>
         </div>

        {/* Right Content - Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Loading menu items...</div>
            </div>
          ) : (() => {
            const selectedCategoryData = categories.find(cat => cat.id === selectedCategory)
            const categoryItems = getProductsByCategory(selectedCategory)

            return (
              <div>
                {/* <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCategoryData?.name}</h2>
                  {selectedCategoryData?.description && (
                    <p className="text-gray-600 mt-1">{selectedCategoryData.description}</p>
                  )}
                </div> */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {categoryItems.map((item) => {
                    const quantity = getItemQuantity(item.id)
                    const isInCart = quantity > 0

                    return (
                      <Card
                         key={item.id}
                         className={`transition-all pt-0 duration-300 overflow-hidden group cursor-pointer transform hover:-translate-y-1 ${
                           isInCart
                             ? 'ring-2 ring-orange-500 shadow-xl bg-gradient-to-br from-orange-50 to-white scale-[1.02]'
                             : 'hover:shadow-xl border-gray-200 hover:border-orange-200'
                         }`}
                       >
                        <div className="h-52 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden rounded-t-lg">
                           <img
                             src={item.image}
                             alt={item.name}
                             className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ease-out"
                             onError={(e) => {
                               const target = e.target as HTMLImageElement
                               target.src = `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(item.name)}`
                             }}
                           />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent group-hover:from-black/20 transition-all duration-500" />
                          <div className="absolute top-3 right-3 flex flex-col gap-1">
                            {item.isVegetarian && (
                               <Badge className="bg-green-500/90 text-white shadow-lg backdrop-blur-sm">
                                 <Leaf className="w-3 h-3 mr-1" />
                                 Veg
                               </Badge>
                             )}
                             {item.isSpicy && (
                              <Badge className="bg-red-500/90 text-white shadow-lg backdrop-blur-sm">
                                <Flame className="w-3 h-3 mr-1" />
                                Spicy
                              </Badge>
                            )}
                          </div>
                          {isInCart && (
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-orange-500 text-white shadow-lg">
                                {quantity} in cart
                              </Badge>
                            </div>
                          )}
                        </div>

                        <CardHeader className=" relative">
                           <CardTitle className={`text-lg font-bold leading-tight ${
                             isInCart ? 'text-orange-900' : 'text-gray-900 group-hover:text-orange-700'
                           } transition-colors`}>
                             {item.name}
                           </CardTitle>
                           {item.description && (
                             <CardDescription className="text-gray-600 text-[12px]  line-clamp-2">
                               {item.description}
                             </CardDescription>
                           )}
                           {item.price && item.price > 0 && (
                             <div className="flex items-center gap-1 mt-2">
                               <DollarSign className="w-4 h-4 text-green-600" />
                               <span className="text-lg font-bold text-green-600">
                                 ${item.price.toFixed(2)}
                               </span>
                             </div>
                           )}
                         </CardHeader>

                        <CardContent className="pt-0">
                           <div className="flex items-center justify-between">
                             {/* 
                             
                             <div className="flex items-center gap-2">
                               {item.isVegetarian && (
                                 <Badge className="text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                                   <Leaf className="w-3 h-3 mr-1" />
                                   Veg
                                 </Badge>
                               )}
                               {item.isSpicy && (
                                 <Badge className="text-xs bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
                                   <Flame className="w-3 h-3 mr-1" />
                                   Spicy
                                 </Badge>
                               )}
                             </div> */}

                            {orderPlaced ? (
                              <div className="text-sm text-gray-500 bg-gray-100 px-3 rounded-md">
                                Orders disabled
                              </div>
                            ) : sessionEnded ? (
                              <div className="text-sm text-gray-500 bg-gray-100 px-3 rounded-md">
                                Session ended
                              </div>
                            ) : quantity > 0 ? (
                               <div className="flex items-center gap-2 bg-orange-100 rounded-full p-1">
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => removeFromCart(item.id)}
                                   className="w-8 h-8 p-0 rounded-full hover:bg-orange-200 text-orange-700"
                                   disabled={sessionEnded}
                                 >
                                   <Minus className="w-4 h-4" />
                                 </Button>
                                 <span className="w-8 text-center font-bold text-orange-900 text-lg">{quantity}</span>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => addToCart(item)}
                                   className="w-8 h-8 p-0 rounded-full hover:bg-orange-200 text-orange-700"
                                   disabled={sessionEnded}
                                 >
                                   <Plus className="w-4 h-4" />
                                 </Button>
                               </div>
                             ) : (
                               <Button
                                 onClick={() => addToCart(item)}
                                 size="sm"
                                 className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                               >
                                 <Plus className="w-4 h-4 mr-1" />
                                 Add to Cart
                               </Button>
                             )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
