"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ShoppingCart, Plus, Minus, Leaf, Flame, X, Clock, Users, Utensils, ChefHat, Coffee, Cake } from "lucide-react"
import { menuCategories, getMenuItemsByCategory, type MenuItem } from "@/lib/mockData"
// Removed Confetti import - now using order confirmation page

interface CartItem {
  menuItem: MenuItem
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

const getItemImage = (itemName: string) => {
  const foodImages: Record<string, string> = {
    // Starters
    "Caesar Salad": "photo-1512621776951-a57141f2eefd",
    "Buffalo Wings": "photo-1567620905732-2d1ec7ab7445",
    "Bruschetta": "photo-1572441713132-51c75654db73",
    "Shrimp Cocktail": "photo-1565299624946-b28f40a0ca4b",

    // Main Course
    "Grilled Salmon": "photo-1467003909585-2f8a72700288",
    "Beef Tenderloin": "photo-1546833999-b9f581a1996d",
    "Chicken Tikka Masala": "photo-1565557623262-b51c2513a641",
    "Vegetable Stir Fry": "photo-1512058564366-18510be2db19",
    "Lobster Thermidor": "photo-1559847844-d9f0550a5d24",

    // Desserts
    "Chocolate Lava Cake": "photo-1578985545062-69928b1d9587",
    "Tiramisu": "photo-1571877227200-a0d98ea607e9",
    "Fresh Fruit Tart": "photo-1571091718767-18b5b1457add",
    "Ice Cream Sundae": "photo-1551024506-0bccd828d307",

    // Drinks
    "Fresh Orange Juice": "photo-1622597467836-f3285f2131b8",
    "Coffee": "photo-1495474472287-4d71bcdd2085",
    "Sparkling Water": "photo-1544145945-f90425340c7e",
    "House Wine": "photo-1506377247377-2a5b3b417ebb",
  }

  const imageId = foodImages[itemName]
  if (imageId) {
    return `https://images.unsplash.com/${imageId}?w=400&h=300&fit=crop&crop=food`
  }
  
  // Fallback images based on item type
  const fallbackImages = [
    "photo-1565299624946-b28f40a0ca4b", // food 1
    "photo-1567620905732-2d1ec7ab7445", // food 2
    "photo-1512621776951-a57141f2eefd", // food 3
    "photo-1546833999-b9f581a1996d", // food 4
    "photo-1571877227200-a0d98ea607e9", // food 5
  ]
  
  const hash = itemName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  
  const imageIndex = Math.abs(hash) % fallbackImages.length
  return `https://images.unsplash.com/${fallbackImages[imageIndex]}?w=400&h=300&fit=crop&crop=food`
}

export default function ItemsPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  // Removed showConfetti state - now using order confirmation page
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(menuCategories[0]?.id || '')

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
      const existingItem = prev.find((item) => item.menuItem?.id === menuItem.id)
      if (existingItem) {
        return prev.map((item) => (item.menuItem?.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { menuItem, quantity: 1 }]
    })
  }

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      return prev
        .map((item) => (item.menuItem?.id === menuItemId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    })
  }

  const getItemQuantity = (menuItemId: string) => {
    const cartItem = cart.find((item) => item.menuItem?.id === menuItemId)
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
         <div className=" bg-whit">
        <img
          src="/images/logo.png"
          alt="KALA Systems Logo"
          className="h-12 w-auto ms-5"
        />
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
                            key={item.menuItem?.id}
                            className="bg-white rounded-lg p-4 shadow-sm border border-orange-100"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{item.menuItem?.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{item.menuItem?.description}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.menuItem?.id)}
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
                                  onClick={() => removeFromCart(item.menuItem?.id)}
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
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Categories */}
         <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
           <div className="p-4">
             <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
             <div className="space-y-2">
               {menuCategories.map((category) => {
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
          {(() => {
            const selectedCategoryData = menuCategories.find(cat => cat.id === selectedCategory)
            const categoryItems = getMenuItemsByCategory(selectedCategory)

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
                             src={getItemImage(item.name)}
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
                         </CardHeader>

                        <CardContent className="pt-0">
                           <div className="flex items-center justify-between">
                             {/* <div className="flex items-center gap-2">
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
                            ) : quantity > 0 ? (
                               <div className="flex items-center gap-2 bg-orange-100 rounded-full p-1">
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => removeFromCart(item.id)}
                                   className="w-8 h-8 p-0 rounded-full hover:bg-orange-200 text-orange-700"
                                 >
                                   <Minus className="w-4 h-4" />
                                 </Button>
                                 <span className="w-8 text-center font-bold text-orange-900 text-lg">{quantity}</span>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => addToCart(item)}
                                   className="w-8 h-8 p-0 rounded-full hover:bg-orange-200 text-orange-700"
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

