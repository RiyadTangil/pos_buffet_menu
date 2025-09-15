"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ShoppingCart, Plus, Minus, Leaf, Flame, X, Clock, Users, Utensils, ChefHat, Coffee, Cake, DollarSign } from "lucide-react"
import { type MenuCategory } from "@/lib/mockData"
import { fetchCategories } from "@/lib/api/categories"
import { fetchProducts, type Product } from "@/lib/api/products"
import { getBuffetSettings, type BuffetSettings } from "@/lib/api/settings"
import { saveOrder, type SessionOrder } from "@/lib/api/orders-client"
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
  const [showConfetti, setShowConfetti] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [buffetSettings, setBuffetSettings] = useState<BuffetSettings | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Fetch categories, products, and buffet settings on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [categoriesData, productsData, settingsResponse] = await Promise.all([
          fetchCategories(),
          fetchProducts(),
          getBuffetSettings()
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
    }, 60000) // Update every minute

    return () => clearInterval(timeInterval)
  }, [])

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

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.menuItem.id === product.id)
      if (existingItem) {
        return prev.map((item) => (item.menuItem.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { menuItem: product, quantity: 1 }]
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

      // Get table ID and number from localStorage
      const selectedTableId = localStorage.getItem('selectedTableId') || 'table-1'
      const tableNumber = parseInt(selectedTableId.split('-')[1]) || 1
      
      // Get guest count from localStorage or use defaults
      const guestCount = {
        adults: parseInt(localStorage.getItem('adultCount') || '2'),
        children: parseInt(localStorage.getItem('childCount') || '0'),
        infants: parseInt(localStorage.getItem('infantCount') || '0')
      }

      // Prepare order data for new API
      const orderData = {
        tableId: selectedTableId,
        tableNumber,
        session: currentSession.key as 'breakfast' | 'lunch' | 'dinner',
        items: cart.map(item => ({
          id: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          category: item.menuItem.categoryId
        })),
        guestCount
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
        
        setShowConfetti(true)
        setOrderPlaced(true)
        // Use buffet settings timing or default to 60 seconds
        const timingMinutes = buffetSettings?.nextOrderTimingDuration || 1
        const timingInSeconds = Math.max(timingMinutes * 60, 60) // Ensure at least 60 seconds
        setTimeRemaining(timingInSeconds)
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
            
            {/* Current Session Display */}
            {currentSession && (
              <div className="flex items-center gap-4 bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
                <Clock className="h-5 w-5 text-blue-600" />
                <div className="text-sm">
                  <div className="font-semibold text-blue-900 capitalize">{currentSession.key}</div>
                  <div className="text-blue-700">{currentSession.data.startTime} - {currentSession.data.endTime}</div>
                </div>
              </div>
            )}
            
            {/* Fallback when no active session */}
            {!currentSession && buffetSettings && (
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
          
            {/* {buffetSettings && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                <Clock className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <div className="font-semibold text-blue-900">Next Order</div>
                  <div className="text-blue-700">{buffetSettings?.nextOrderAvailableInMinutes} min</div>
                </div>
              </div>
            )} */}
            
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
      </div>

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
