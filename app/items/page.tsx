"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ShoppingCart, Plus, Minus, Leaf, Flame, X, Clock, Users } from "lucide-react"
import { menuCategories, getMenuItemsByCategory, type MenuItem } from "@/lib/mockData"
import Confetti from "react-confetti"

interface CartItem {
  menuItem: MenuItem
  quantity: number
}

const getCategoryImage = (categoryId: string, itemName: string) => {
  const foodImages: Record<string, string> = {
    // Starters
    "Caesar Salad": "photo-1512621776951-a57141f2eefd",
    "Chicken Wings": "photo-1567620905732-2d1ec7ab7445",
    "Garlic Bread": "photo-1549931319-a545dcf3bc73",
    "Soup of the Day": "photo-1547592180-85f173990554",

    // Main Course
    "Grilled Chicken": "photo-1598103442097-8b74394b95c6",
    "Beef Steak": "photo-1546833999-b9f581a1996d",
    "Fish & Chips": "photo-1544982503-9f984c14501a",
    "Pasta Carbonara": "photo-1621996346565-e3dbc353d2e5",
    "Vegetable Curry": "photo-1571877227200-a0d98ea607e9",

    // Desserts
    "Chocolate Cake": "photo-1578985545062-69928b1d9587",
    "Ice Cream": "photo-1551024506-0bccd828d307",
    "Fruit Salad": "photo-1571091718767-18b5b1457add",
    Tiramisu: "photo-1571877227200-a0d98ea607e9",

    // Drinks
    Coffee: "photo-1495474472287-4d71bcdd2085",
    Tea: "photo-1544787219-7f47ccb76574",
    "Fresh Juice": "photo-1622597467836-f3285f2131b8",
    "Soft Drinks": "photo-1544145945-f90425340c7e",
  }

  const imageId = foodImages[itemName] || foodImages[Object.keys(foodImages)[0]]
  return `https://images.unsplash.com/${imageId}?w=400&h=300&fit=crop&crop=food`
}

export default function ItemsPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      if (confirm("Are you sure you want to end your session?")) {
        router.push("/session/orders")
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

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setOrderPlaced(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeRemaining])

  const addToCart = (menuItem: MenuItem) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.menuItem.id === menuItem.id)
      if (existingItem) {
        return prev.map((item) => (item.menuItem.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { menuItem, quantity: 1 }]
    })
  }

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      return prev
        .map((item) => (item.menuItem.id === menuItemId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    })
  }

  const getItemQuantity = (menuItemId: string) => {
    const cartItem = cart.find((item) => item.menuItem.id === menuItemId)
    return cartItem?.quantity || 0
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handleConfirmOrder = () => {
    setShowConfetti(true)
    setOrderPlaced(true)
    setTimeRemaining(60) // 1 minute in seconds
    setCart([])
    setIsCartOpen(false)

    // Hide confetti after 3 seconds but stay on items page
    setTimeout(() => {
      setShowConfetti(false)
    }, 3000)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleEndSession = () => {
    router.push("/session/orders")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Buffet Menu</h1>
            <p className="text-gray-600">Unlimited servings • Take as much as you want</p>
          </div>

          <div className="flex items-center gap-4">
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
                  <Button className="relative bg-orange-600 hover:bg-orange-700" size="lg">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Cart
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
                        <p className="text-orange-500 text-sm">Add items from the buffet menu</p>
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
                      >
                        Confirm Order
                      </Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Menu Categories */}
        <div className="space-y-8">
          {menuCategories.map((category) => {
            const categoryItems = getMenuItemsByCategory(category.id)

            return (
              <div key={category.id}>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">{category.name}</h2>
                  {category.description && <p className="text-gray-600 mt-1">{category.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryItems.map((item) => {
                    const quantity = getItemQuantity(item.id)

                    return (
                      <Card
                        key={item.id}
                        className="hover:shadow-xl transition-all duration-300 border-orange-100 overflow-hidden group"
                      >
                        <div className="h-48 bg-gradient-to-br from-orange-200 to-amber-200 relative overflow-hidden">
                          <img
                            src={getCategoryImage(category.id, item.name) || "/placeholder.svg"}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(item.name)}`
                            }}
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
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
                          <div className="absolute bottom-3 left-3">
                            <Badge className="bg-white/90 text-gray-700 shadow-md backdrop-blur-sm">
                              <Clock className="w-3 h-3 mr-1" />
                              Fresh & Hot
                            </Badge>
                          </div>
                        </div>

                        <CardHeader className="pb-3">
                          <CardTitle className="text-xl text-gray-900 group-hover:text-orange-700 transition-colors leading-tight">
                            {item.name}
                          </CardTitle>
                          {item.description && (
                            <CardDescription className="text-gray-600 leading-relaxed text-sm mt-2">
                              {item.description}
                            </CardDescription>
                          )}
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-2">
                              <Badge variant="outline" className="border-orange-200 text-orange-700 w-fit text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                Unlimited servings
                              </Badge>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="bg-gray-100 px-2 py-1 rounded-full">Buffet style</span>
                                <span className="bg-gray-100 px-2 py-1 rounded-full">Self service</span>
                              </div>
                            </div>

                            {orderPlaced ? (
                              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-md">
                                Orders disabled
                              </div>
                            ) : quantity > 0 ? (
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFromCart(item.id)}
                                  className="border-orange-200 hover:bg-orange-50"
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center font-semibold text-lg">{quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addToCart(item)}
                                  className="border-orange-200 hover:bg-orange-50"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => addToCart(item)}
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
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
          })}
        </div>
      </div>
    </div>
  )
}
