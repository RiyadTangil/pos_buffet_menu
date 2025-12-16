"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ItemsLimitProgress } from '@/components/ui/items-limit-progress'
import { SessionCountdown } from '@/components/ui/session-countdown'
import { ShoppingCart, Plus, Minus, Leaf, Flame, X, Clock, Users, Utensils, ChefHat, Coffee, Cake, DollarSign, Euro, Loader2, Star, AlertTriangle } from "lucide-react"
import { type Product } from "@/lib/api/products"
import { setNextOrderAvailable, type TableSession } from "@/lib/api/table-sessions"

import { type Table } from "@/lib/api/tables"
import { usePrinting } from '@/hooks/usePrinting'
import { initializeSocketClient, joinTableRoom, leaveTableRoom, joinTablesRoom, leaveTablesRoom, onTablesUpdate, offTablesUpdate, onTableSessionUpdate, offTableSessionUpdate, onCartUpdate, offCartUpdate, emitCartUpdate, onOrderConfirmation, offOrderConfirmation, emitOrderConfirmation } from '@/lib/socket-client'
import { addToCartApi, updateCartApi, removeFromCartApi, updateCartItemQuantityApi } from '@/lib/api/cart'
import { toast } from "sonner"

import Confetti from "react-confetti"
import SessionEndedModal from "@/components/SessionEndedModal"
import OrderPrinter from "@/components/printing/OrderPrinter"
import WaiterRequest from "@/components/WaiterRequest"
import I18nProvider from "@/components/providers/i18n-provider"
import LanguageSwitcher from "@/components/ui/language-switcher"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
  const { printOrder, isPrinting } = usePrinting()
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [updatingAction, setUpdatingAction] = useState<'add' | 'remove' | null>(null)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [shouldPrintOrder, setShouldPrintOrder] = useState(false)
  const [printerConfigs, setPrinterConfigs] = useState<{
    ipPrinters: any[]
    usbPrinters: any[]
  } | null>(null)



  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [tableSession, setTableSession] = useState<TableSession | null>(null)
  const [tableData, setTableData] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [buffetSettings, setBuffetSettings] = useState<any>(null)
  const [progressKey, setProgressKey] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Fetch categories, products, and buffet settings on component mount
  const hasLoaded = useRef(false)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Only run on client side
        if (typeof window === 'undefined') return

        // Load table session and group type from localStorage
        const storedTableId = localStorage.getItem('selectedTableId')
        const storedGroupType = localStorage.getItem('groupType')
        const storedSession = localStorage.getItem('tableSession')

        if (!storedTableId || !storedGroupType) {
          alert('No table session found. Please return to the tables page.')
          router.push('/menu/tables')
          return
        }

        // Initialize Socket.IO client and join table room
        const socket = initializeSocketClient()

        try {
          await joinTableRoom(storedTableId, storedGroupType)
      
        } catch (error) {
          console.error('❌ Failed to join table room:', error)
          // Continue with the rest of the initialization even if socket fails
        }

        // Set up real-time table session updates
        onTableSessionUpdate((updatedSessionData) => {
         
          // Check if session has ended (either sessionEnded flag or null session)
          if (updatedSessionData?.sessionEnded || updatedSessionData === null) {
            setShowSessionEndedModal(true)
            return
          }

          setTableSession((prev) => {
            const merged = { ...(prev || {}), ...(updatedSessionData || {}) }
            // Preserve createdAt if missing from update payload
            if (!merged.createdAt && prev?.createdAt) merged.createdAt = prev.createdAt
            return merged as TableSession
          })
          // Update localStorage with fresh data
          localStorage.setItem('tableSession', JSON.stringify(updatedSessionData))
          // Update order countdown from session field for multi-device sync
          // Only adjust countdown when the field is present to avoid clearing
          // on partial updates that don't include nextOrderAvailableUntil
          if (updatedSessionData?.nextOrderAvailableUntil) {
            const untilMs = new Date(updatedSessionData.nextOrderAvailableUntil).getTime()
            const remaining = Math.max(0, Math.floor((untilMs - Date.now()) / 1000))
            setOrderPlaced(remaining > 0)
            setTimeRemaining(remaining)
          }
        })

        // Set up real-time cart synchronization
        onCartUpdate((cartData) => {
       
          if (cartData.tableId === storedTableId) {
            // Convert database cart items to UI cart items
            if (cartData.cartItems && productsData.length > 0) {
              const convertedCartItems = cartData.cartItems.map((dbCartItem: any) => {
                const product = productsData.find(p => p.id === dbCartItem.menuItemId)
                if (product) {
                  return {
                    menuItem: product,
                    quantity: dbCartItem.quantity
                  }
                }
                return null
              }).filter(Boolean) as CartItem[]

              setCart(convertedCartItems)
            } else {
              setCart([])
            }
          }
        })

        // Set up real-time order confirmation synchronization
        onOrderConfirmation((orderData) => {
      
          if (orderData.tableId === storedTableId) {
            // Sync order confirmation state with other devices in same group
            setShowConfetti(true)
            setOrderPlaced(true)

            // Use timing from the order data or default
            const timingInSeconds = orderData.orderData?.timingInSeconds || 60
            setTimeRemaining(timingInSeconds)

            // Clear cart when order is confirmed by another device
            setCart([])
            setIsCartOpen(false)

            // Hide confetti after 3 seconds
            setTimeout(() => {
              setShowConfetti(false)
            }, 3000)
          }
        })

        // Join global tables room and listen for refresh updates
        try {
          await joinTablesRoom()
          onTablesUpdate(async (update) => {
            if (update?.type === 'refresh') {
              try {
                const url = new URL('/api/menu/items-data', window.location.origin)
                url.searchParams.set('tableId', storedTableId)
                if (storedGroupType) url.searchParams.set('groupType', storedGroupType)
                url.searchParams.set('onlyAvailable', 'true')
                const resp = await fetch(url.toString())
                const json = await resp.json()
                if (resp.ok && json.success && json.data) {
                  const { settings, table, categories, products } = json.data
                  setBuffetSettings(settings)
                  setTableData(table)
                  setCategories(categories)
                  setProducts(products)
                  setSelectedCategory((prev) =>
                    categories.some((c: any) => c.id === prev) ? prev : (categories[0]?.id || prev)
                  )
                }
              } catch (err) {
                console.error('Error refreshing menu on update:', err)
              }
            }
          })
        } catch (err) {
          console.warn('Failed to join tables room:', err)
        }

        // Single aggregated fetch for initial data
        let sessionData: TableSession | null = null
        let productsData: any[] = []
        let categoriesData: any[] = []
        try {
          const url = new URL('/api/menu/items-data', window.location.origin)
          url.searchParams.set('tableId', storedTableId)
          if (storedGroupType) url.searchParams.set('groupType', storedGroupType)
          url.searchParams.set('onlyAvailable', 'true')
          const resp = await fetch(url.toString())
          const json = await resp.json()
          if (!resp.ok || !json.success || !json.data) throw new Error(json.error || 'Failed to load')
          const { settings, table, session, categories, products } = json.data
          setBuffetSettings(settings)
          setTableData(table)
          setCategories(categories)
          setProducts(products)
          categoriesData = categories
          productsData = products
          sessionData = session
        } catch (e) {
          console.error('Error fetching aggregated items data:', e)
        }

        // Session setup from aggregated data or fallback
        if (sessionData?.sessionEnded || sessionData === null) {
          setShowSessionEndedModal(true)
          return
        }
        if (sessionData) {
          setTableSession(sessionData)
          localStorage.setItem('tableSession', JSON.stringify(sessionData))
          if (sessionData.nextOrderAvailableUntil) {
            const untilMs = new Date(sessionData.nextOrderAvailableUntil).getTime()
            const remaining = Math.max(0, Math.floor((untilMs - Date.now()) / 1000))
            setOrderPlaced(remaining > 0)
            setTimeRemaining(remaining)
          } else {
            setOrderPlaced(false)
            setTimeRemaining(0)
          }
        } else if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession)
            setTableSession(parsed)
          } catch {}
        }

        // Convert database cart items to UI cart items after products are loaded
        if (sessionData && sessionData.cartItems && productsData.length > 0) {
          const convertedCartItems = sessionData.cartItems.map((dbCartItem: any) => {
            const product = productsData.find(p => p.id === dbCartItem.menuItemId)
            if (product) {
              return {
                menuItem: product,
                quantity: dbCartItem.quantity
              }
            }
            return null
          }).filter(Boolean) as CartItem[]

          setCart(convertedCartItems)
        }
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].id)
        }
        // Countdown now derives from table session updates; no localStorage restore
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (hasLoaded.current) return
    hasLoaded.current = true
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

      // Clean up Socket.IO connections
      if (typeof window !== 'undefined') {
        const storedTableId = localStorage.getItem('selectedTableId')
        const storedGroupType = localStorage.getItem('groupType')
        if (storedTableId) {
          leaveTableRoom(storedTableId, storedGroupType || undefined)
        }

        // Leave global tables room and remove refresh listener
        leaveTablesRoom()
        offTablesUpdate()
      }
      offTableSessionUpdate()
      offCartUpdate()
      offOrderConfirmation()
    }
  }, [router])

  // Update current time every minute to refresh session display
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())

      const extISO = getExtendedUntilISO()
      const now = new Date()
      if (extISO) {
        setSessionEnded(now >= new Date(extISO))
      } else {
        const cs = getCurrentSession()
        if (!cs) {
          setSessionEnded(true)
        } else {
          const [endHour, endMin] = cs.data.endTime.split(':').map(Number)
          const endTime = new Date()
          endTime.setHours(endHour, endMin, 0, 0)
          if (endTime < now) endTime.setDate(endTime.getDate() + 1)
          setSessionEnded(now >= endTime)
        }
      }
    }, 1000) // Update every second for accurate enforcement

    return () => clearInterval(timeInterval)
  }, [buffetSettings])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const newValue = prev <= 1 ? 0 : prev - 1
          const newOrderPlaced = newValue > 0
          if (newValue <= 0) {
            setOrderPlaced(false)
          }

          return newValue
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeRemaining])

  const addToCart = async (product: Product) => {
    // Enforce session end immediately
    const extISO = getExtendedUntilISO()
    const now = new Date()
    if (extISO ? now >= new Date(extISO) : (() => {
      const cs = getCurrentSession()
      if (!cs) return true
      const [eh, em] = cs.data.endTime.split(':').map(Number)
      const end = new Date(); end.setHours(eh, em, 0, 0); if (end < now) end.setDate(end.getDate() + 1)
      return now >= end
    })()) {
      setSessionEnded(true)
      alert('Your session has ended. Please proceed to checkout.')
      return
    }

    // Check items limit before adding to cart
    const currentSession = getCurrentSession()
    if (!currentSession || !buffetSettings) {
      alert('No active session found. Please try again during buffet hours.')
      return
    }

    // Get guest counts from table session instead of localStorage
    if (!tableSession) {
      alert('No table session found. Please return to the tables page.')
      router.push('/menu/tables')
      return
    }

    const adultCount = tableSession.guestCounts.adults || 0
    const childCount = tableSession.guestCounts.children || 0
    const infantCount = tableSession.guestCounts.infants || 0

    if (adultCount === 0 && childCount === 0 && infantCount === 0) {
      alert('Guest information is missing. Please return to the tables page and enter guest information.')
      return
    }

    // Get items limit for current session with proper priority
    const sessionKey = currentSession.key as 'breakfast' | 'lunch' | 'dinner'
    const tableId = tableSession?.tableId

    // Start with general limits as base
    let itemsLimit = buffetSettings.itemsLimit

    // Override with session-specific limits if available (medium priority)
    if (buffetSettings.sessionSpecificItemsLimit && buffetSettings.sessionSpecificItemsLimit[sessionKey]) {
      itemsLimit = buffetSettings.sessionSpecificItemsLimit[sessionKey]
      //console.log('Using session-specific item limits for session:', sessionKey)
    }

    // Finally, override with special table limits if available (highest priority)
    if (tableId && buffetSettings.specialTableItemsLimit && buffetSettings.specialTableItemsLimit.length > 0) {
      const specialTableLimit = buffetSettings.specialTableItemsLimit.find(item => item.tableId === tableId)
      if (specialTableLimit) {
        itemsLimit = specialTableLimit.itemsLimit
        //console.log('Using special table item limits for table:', tableId)
      }
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
      const currentTotalItems = getTotalOfItems()

      // Check if adding this item would exceed the limit
      // Premium items are exempt from the buffet round limit
      if (!product.isPremium && currentTotalItems >= maxAllowedItems) {
        // alert(`You have reached the maximum limit of ${maxAllowedItems} items per round. Please complete your current order before adding more items.`)
        return
      }
    }

    // Enforce per-product limitPerOrder before adding to cart
    const perItemLimit = typeof product.limitPerOrder === 'number' ? product.limitPerOrder : 0
    if (perItemLimit > 0) {
      const existingItemInCart = cart.find((item) => item.menuItem?.id === product.id)
      const currentQty = existingItemInCart?.quantity ?? 0
      if (currentQty >= perItemLimit) {
        toast.error(`Order limit reached: Max ${perItemLimit} for "${product.name}"`)
        return
      }
    }

    // Update local state first for immediate UI feedback
    setUpdatingItemId(product.id)
    setUpdatingAction('add')
    setIsUpdating(true)
    let updatedCart: CartItem[] = []
    setCart((prev) => {
      const existingItem = prev.find((item) => item.menuItem?.id === product.id)
      if (existingItem) {
        updatedCart = prev.map((item) => (item.menuItem?.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        updatedCart = [...prev, { menuItem: product, quantity: 1 }]
      }
      return updatedCart
    })

    // Sync with database and emit real-time update
    try {
      const cartItem = {
        menuItemId: product.id,
        name: product.name,
        price: product.price || 0,
        quantity: 1,
        categoryId: product.categoryId
      }
      const groupTypeLocal = typeof window !== 'undefined' ? localStorage.getItem('groupType') : null
      const result = await addToCartApi(tableSession.tableId, cartItem, groupTypeLocal)

      if (result.success) {
        // Convert UI cart format to database format for real-time updates
        const dbCartItems = updatedCart.map(item => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price || 0,
          quantity: item.quantity,
          categoryId: item.menuItem.categoryId
        }))
        // Emit real-time update to other devices
        emitCartUpdate(tableSession.tableId, dbCartItems, tableSession.groupType)
        setIsUpdating(false)
        setUpdatingItemId(null)
        setUpdatingAction(null)
      } else {
        console.error('Failed to sync cart with database:', result.error)
        // Revert local state on failure
        setCart((prev) => {
          const existingItem = prev.find((item) => item.menuItem?.id === product.id)
          if (existingItem && existingItem.quantity > 1) {
            return prev.map((item) => (item.menuItem?.id === product.id ? { ...item, quantity: item.quantity - 1 } : item))
          } else {
            return prev.filter((item) => item.menuItem?.id !== product.id)
          }
        })
        // Keep loader active until a success response (as requested)
      }
    } catch (error) {
      console.error('Error syncing cart:', error)
      // Keep loader active until a success response (as requested)
    }

    setProgressKey(prev => prev + 1) // Force progress component re-render
  }

  const removeFromCart = async (menuItemId: string) => {
    if (!tableSession) return

    // Update local state first for immediate UI feedback
    setUpdatingItemId(menuItemId)
    setUpdatingAction('remove')
    setIsUpdating(true)
    let updatedCart: CartItem[] = []
    setCart((prev) => {
      updatedCart = prev
        .map((item) => (item.menuItem?.id === menuItemId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
      return updatedCart
    })

    // Sync with database and emit real-time update
    try {
      const result = await removeFromCartApi(tableSession.tableId, menuItemId, tableSession.groupType)

      if (result.success) {
        // Convert UI cart format to database format for real-time updates
        const dbCartItems = updatedCart.map(item => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price || 0,
          quantity: item.quantity,
          categoryId: item.menuItem.categoryId
        }))
        // Emit real-time update to other devices
        emitCartUpdate(tableSession.tableId, dbCartItems, tableSession.groupType)
        setIsUpdating(false)
        setUpdatingItemId(null)
        setUpdatingAction(null)
      } else {
        console.error('Failed to sync cart removal with database:', result.error)
        // Revert local state on failure
        setCart((prev) => {
          const existingItem = prev.find((item) => item.menuItem?.id === menuItemId)
          if (existingItem) {
            return prev.map((item) => (item.menuItem?.id === menuItemId ? { ...item, quantity: item.quantity + 1 } : item))
          } else {
            return [...prev, { menuItem: products.find(p => p.id === menuItemId)!, quantity: 1 }]
          }
        })
        // Keep loader active until a success response (as requested)
      }
    } catch (error) {
      console.error('Error syncing cart removal:', error)
      // Keep loader active until a success response (as requested)
    }

    setProgressKey(prev => prev + 1) // Force progress component re-render
  }

  const getItemQuantity = (menuItemId: string) => {
    const cartItem = cart.find((item) => item.menuItem?.id === menuItemId)
    return cartItem?.quantity || 0
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }
  const getTotalOfItems = () => {
    return cart.reduce((total, item) => {
      // const isFree = (item.menuItem.price || 0) === 0
      const isPremium = !!(item.menuItem as any).isPremium
      if (!isPremium) {
        return total + item.quantity
      }
      return total
    }, 0)
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

      // Get table ID from table session instead of localStorage
      if (!tableSession) {
        alert('No table session found. Please return to the tables page.')
        router.push('/menu/tables')
        return
      }

      const selectedTableId = tableSession.tableId
      const guestCounts = tableSession.guestCounts

      if (!guestCounts.adults && !guestCounts.children && !guestCounts.infants) {
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
          id: item.menuItem?.id,
          name: item.menuItem.name,
          price: item.menuItem.price || 0,
          quantity: item.quantity,
          category: item.menuItem.categoryId
        })),
        storedGuestCounts: guestCounts,
        groupType: tableSession.groupType,
        tableSessionId: tableSession.id
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
        //console.log('Order created successfully:', result.orderId)
        setLastOrderId(result.orderId)

        // Store printer configurations from order response
        if (result.printerConfigs) {
          setPrinterConfigs(result.printerConfigs)
        }

        // Trigger automatic printing with OrderPrinter component
        setShouldPrintOrder(true)



        setShowConfetti(true)
        setOrderPlaced(true)
        // Use current session timing or default to 1 minute
        const currentSessionData = getCurrentSession()
        const timingMinutes = currentSessionData?.data.nextOrderAvailableInMinutes || 1
        const timingInSeconds = Math.max(timingMinutes * 60, 60) // Ensure at least 60 seconds
        setTimeRemaining(timingInSeconds)
        // Persist next-order availability to table session for multi-device sync
        try {
          const untilISO = new Date(Date.now() + timingInSeconds * 1000).toISOString()
          await setNextOrderAvailable(tableSession.tableId, untilISO)
        } catch (err) {
          console.error('Failed to persist next order availability:', err)
        }

        // Cart is already cleared by the orders API, just emit update and reset local state
        try {
          emitCartUpdate(tableSession.tableId, [], tableSession.groupType)
        } catch (error) {
          console.error('Error emitting cart update:', error)
        }

        // Emit order confirmation to sync with other devices in same group
        emitOrderConfirmation(tableSession.tableId, {
          orderId: result.orderId,
          timingInSeconds,
          orderData: orderData
        }, tableSession.groupType)

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
  const getSpecialTableTimeLimitMinutes = () => {
    if (!buffetSettings || !tableSession) return 0
    const special = buffetSettings.specialTableItemsLimit?.find((s: any) => s.tableId === tableSession.tableId)
    return special?.timeLimit || 0
  }

  const getSessionSpecificTimeLimitMinutes = () => {
    if (!buffetSettings || !currentSession) return 0
    const key = currentSession.key as 'breakfast' | 'lunch' | 'dinner'
    const sessionCfg = buffetSettings.sessions[key]
    return (sessionCfg as any)?.sessionTimeLimitMinutes || 0
  }

  const getExtendedUntilISO = () => {
    const tableMin = getSpecialTableTimeLimitMinutes()
    const sessionMin = getSessionSpecificTimeLimitMinutes()
    const effectiveMin = (sessionMin > 0 ? sessionMin : 0) + (tableMin > 0 ? tableMin : 0)
    if (!tableSession?.createdAt || !currentSession) return undefined
    if (effectiveMin > 0) {
      const startMs = new Date(tableSession.createdAt).getTime()
      const final = new Date(startMs + effectiveMin * 60 * 1000)
      return final.toISOString()
    }
    // Fallback: no session/table specific limits, use official session end
    const [endHour, endMin] = currentSession.data.endTime.split(':').map(Number)
    const endTime = new Date()
    endTime.setHours(endHour, endMin, 0, 0)
    const now = new Date()
    if (endTime < now) endTime.setDate(endTime.getDate() + 1)
    return endTime.toISOString()
  }

  const handleEndSession = () => {
    router.push("/menu/session/orders")
  }

  return (
    <I18nProvider>
      <div className="min-h-screen bg-gray-50">
        {showConfetti && (
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} />
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between ">
            <div className="flex items-center gap-6 whitespace-nowrap overflow-x-auto">
              <div className="bg-white">
                <img
                  src="/images/logo.png"
                  alt={t("items.kala_logo_alt")}
                  className="h-12 w-auto ms-5"
                />
              </div>

              {/* Table and Session Display */}
              {(tableData) && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-2 border border-blue-200">

                  <div className="text-sm">
                    <div className="font-semibold text-blue-900">
                      {tableData ? (
                        `Table-${tableData.number}`
                      ) : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Current Session Display / Countdown */}
              {currentSession ? (
                <SessionCountdown currentSession={currentSession} extendedUntil={getExtendedUntilISO()} />
              ) : buffetSettings && (
                <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold">{t("items.no_active_session")}</div>
                    <div className="text-xs">{t("items.check_session_timings")}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 relative z-50">
              {currentSession && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div className="text-sm font-semibold text-blue-900">
                    {t("items.order_interval")} <span className="text-blue-700 font-normal">{currentSession.data.nextOrderAvailableInMinutes} min</span>
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleEndSession}>
                {t("items.end_session")}
              </Button>

              {/* Waiter Request Button */}
              <WaiterRequest
                tableNumber={tableData?.number || 0}
                disabled={sessionEnded || !tableData}
              />

              {orderPlaced ? (
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{t("items.order_placed")}</div>
                  <div className="text-sm text-gray-600">{t("items.next_order_available")} {formatTime(timeRemaining)}</div>
                </div>
              ) : (
                <Sheet open={isCartOpen} onOpenChange={setIsCartOpen} >
                  <SheetTrigger asChild>
                    <Button
                      className="relative bg-orange-600 hover:bg-orange-700"
                      size="lg"
                      disabled={sessionEnded}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2 " />
                      {t("items.item_in_cart")}
                      {getTotalItems() > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">{getTotalItems()}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md bg-gradient-to-b from-white to-orange-50 flex flex-col h-full overflow-hidden">
                    <SheetHeader className="border-b border-orange-200 pb-4 flex-shrink-0">
                      <SheetTitle className="text-xl text-orange-900">{t("items.your_selection")}</SheetTitle>
                      <SheetDescription className="text-orange-700">
                        Review your items • Unlimited quantities available
                      </SheetDescription>
                    </SheetHeader>



                    <div className="flex-1 overflow-y-auto py-4 min-h-0">
                      {cart.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingCart className="w-16 h-16 mx-auto text-orange-300 mb-4" />
                          <p className="text-orange-600 text-lg">{t("items.cart_empty")}</p>
                          <p className="text-orange-500 text-sm">{t("items.add_items")}</p>
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
                                  {item.menuItem?.price && item.menuItem.price > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <DollarSign className="w-3 h-3 text-green-600" />
                                      <span className="text-sm font-semibold text-green-600">
                                        ${item.menuItem?.price.toFixed(2)} each
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCart(item.menuItem?.id)}
                                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                  disabled={sessionEnded || isUpdating}
                                >
                                  {updatingItemId === item.menuItem?.id && updatingAction === 'remove' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeFromCart(item.menuItem?.id)}
                                    className="w-8 h-8 p-0 border-orange-200 hover:bg-orange-50"
                                    disabled={sessionEnded || isUpdating}
                                  >
                                    {updatingItemId === item.menuItem?.id && updatingAction === 'remove' ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Minus className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <span className="w-12 text-center font-semibold text-lg">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addToCart(item.menuItem)}
                                    className="w-8 h-8 p-0 border-orange-200 hover:bg-orange-50"
                                    disabled={sessionEnded || isUpdating}
                                  >
                                    {updatingItemId === item.menuItem?.id && updatingAction === 'add' ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Plus className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  {item.quantity} {item.quantity === 1 ? t("items.serving") : t("items.servings")}
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
                        {/* {lastOrderId && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">{t("items.print_status")}</h4>
                          <PrintJobStatus 
                            orderId={lastOrderId}
                            showHeader={false}
                            maxItems={3}
                            autoRefresh={true}
                          />
                        </div>
                      )} */}

                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <div className="flex justify-between items-center text-lg font-semibold text-gray-900">
                            <span>{t("items.total_items")}</span>
                            <span className="text-orange-600">{getTotalItems()}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{t("items.buffet_style")}</p>
                        </div>
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                          size="lg"
                          onClick={handleConfirmOrder}
                          disabled={isPrinting}
                        >
                          {isPrinting ? t("items.processing") : t("items.confirm_order")}
                        </Button>
                      </div>
                    )}
                  </SheetContent>
                </Sheet>
              )}
              <div className="ml-auto">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* Items Limit Progress */}
        {currentSession && buffetSettings && tableSession && (
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <ItemsLimitProgress
              key={progressKey}
              currentItems={getTotalOfItems()}
              buffetSettings={buffetSettings}
              currentSession={currentSession.key as 'breakfast' | 'lunch' | 'dinner'}
              tableId={tableSession.tableId}
              guestCounts={{
                adults: tableSession.guestCounts.adults,
                children: tableSession.guestCounts.children,
                infants: tableSession.guestCounts.infants
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Sidebar - Categories */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("items.categories")}</h2>
              <div className="space-y-2">
                {categories.map((category) => {
                  const isSelected = selectedCategory === category.id
                  const IconComponent = getCategoryIcon(category.id)
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${isSelected
                        ? 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-900 border border-orange-200 shadow-sm'
                        : 'hover:bg-gray-50 text-gray-700 hover:shadow-sm'
                        }`}
                    >
                      <IconComponent className={`w-5 h-5 ${isSelected ? 'text-orange-600' : 'text-gray-500'
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
                <div className="text-lg text-gray-600">{t("items.loading_menu")}</div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {categoryItems.map((item) => {
                      const quantity = getItemQuantity(item.id)
                      const isInCart = quantity > 0

                      return (
                        <Card
                          key={item.id}
                          className={`transition-all pt-0 duration-300 overflow-hidden group cursor-pointer transform hover:-translate-y-1 ${isInCart
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
                              {item.isPremium && (
                                <Badge className="bg-purple-600/90 text-white shadow-lg backdrop-blur-sm">
                                  <Star className="w-3 h-3 mr-1" />
                                  Premium
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
                            <CardTitle className={`text-lg font-bold leading-tight ${isInCart ? 'text-orange-900' : 'text-gray-900 group-hover:text-orange-700'
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
                                <Euro className="w-4 h-4 text-green-600" />
                                <span className="text-lg font-bold text-green-600">
                                  {item.price.toFixed(2)}
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
                          {t("items.vegetarian")}
                        </Badge>
                               )}
                               {item.isSpicy && (
                                 <Badge className="text-xs bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
                          <Flame className="w-3 h-3 mr-1" />
                          {t("items.spicy")}
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
                                <>
                                  <div className="flex items-center gap-2 bg-orange-100 rounded-full p-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-8 h-8 p-0 rounded-full hover:bg-orange-200 text-orange-700"
                                    disabled={sessionEnded || isUpdating}
                                  >
                                    {updatingItemId === item.id && updatingAction === 'remove' ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Minus className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <span className="w-8 text-center font-bold text-orange-900 text-lg">{quantity}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addToCart(item)}
                                    className="w-8 h-8 p-0 rounded-full hover:bg-orange-200 text-orange-700"
                                    disabled={sessionEnded || isUpdating || (typeof item.limitPerOrder === 'number' && item.limitPerOrder > 0 && quantity >= item.limitPerOrder)}
                                  >
                                    {updatingItemId === item.id && updatingAction === 'add' ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Plus className="w-4 h-4" />
                                    )}
                                  </Button>
                                  </div>
                                  {typeof item.limitPerOrder === 'number' && item.limitPerOrder > 0 && quantity >= item.limitPerOrder && (
                                    <div className="mt-2 text-xs text-orange-700 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4" />
                                      <span>Item order limit reached for this item</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <Button
                                  onClick={() => addToCart(item)}
                                  size="sm"
                                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                                  disabled={sessionEnded || isUpdating}
                                >
                                  {updatingItemId === item.id && updatingAction === 'add' ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Plus className="w-4 h-4 mr-1" />
                                  )}
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

        {/* Session Ended Modal */}
        <SessionEndedModal
          isOpen={showSessionEndedModal}
          tableNumber={tableSession?.tableId || (typeof window !== 'undefined' ? localStorage.getItem('selectedTableId') : null) || 'Unknown'}
        />

        {/* Order Printer Component - Handles automatic printing */}
        {shouldPrintOrder && lastOrderId && (
          <OrderPrinter
            orderId={lastOrderId}
            orderItems={cart.map(item => ({
              id: item.menuItem?.id,
              name: item.menuItem.name,
              quantity: item.quantity,
              price: item.menuItem.price || 0,
              categoryId: item.menuItem.categoryId,
              category: {
                id: item.menuItem.categoryId,
                name: categories.find(cat => cat.id === item.menuItem.categoryId)?.name || 'Unknown'
              }
            }))}
            tableNumber={tableData?.number ?? tableSession?.tableId}
            guestCount={(tableSession?.guestCounts.adults || 0) + (tableSession?.guestCounts.children || 0) + (tableSession?.guestCounts.infants || 0)}
            orderTime={new Date().toISOString()}
            onPrintComplete={(success, errors) => {
              //console.log('Print completed:', success, errors)
              setShouldPrintOrder(false) // Reset print trigger
            }}
            autoPrint={true}
            printerConfigs={printerConfigs}
          />
        )}
      </div>
    </I18nProvider>
  )
}
