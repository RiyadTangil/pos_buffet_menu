"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Users, DollarSign, Package, Eye, Edit, Trash2, RefreshCw } from "lucide-react"
import { getOrders, updateOrder, deleteOrder, type Order, type SessionOrder, type CheckoutOrder } from "@/lib/api/orders-client"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [updateData, setUpdateData] = useState({ status: '', waiterId: '', waiterName: '', notes: '' })

  const loadOrders = async (filters?: { status?: string; type?: 'session' | 'checkout' }) => {
    setLoading(true)
    try {
      const orders = await getOrders(filters)
      setOrders(orders)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "all") {
      loadOrders()
    } else if (value === "session") {
      loadOrders({ type: 'session' })
    } else if (value === "checkout") {
      loadOrders({ type: 'checkout' })
    } else {
      loadOrders({ status: value })
    }
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return
    
    try {
      const result = await updateOrder(selectedOrder.orderId, {
        status: updateData.status as any,
        waiterId: updateData.waiterId,
        waiterName: updateData.waiterName,
        notes: updateData.notes
      })
      
      if (result.success) {
        setIsUpdateDialogOpen(false)
        loadOrders() // Refresh orders
      }
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        const result = await deleteOrder(orderId)
        if (result.success) {
          loadOrders() // Refresh orders
        }
      } catch (error) {
        console.error('Error deleting order:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'preparing': return 'bg-blue-100 text-blue-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'served': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isSessionOrder = (order: Order): order is SessionOrder => {
    return 'items' in order && 'sessionInfo' in order && order.sessionInfo !== null
  }

  const isCheckoutOrder = (order: Order): order is CheckoutOrder => {
    return 'sessionData' in order && 'paymentStatus' in order && order.sessionData !== null
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-gray-600">View and manage all restaurant orders</p>
        </div>
        <Button onClick={() => loadOrders()} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="session">Session Orders</TabsTrigger>
          <TabsTrigger value="checkout">Checkout Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="preparing">Preparing</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">Loading orders...</div>
              </CardContent>
            </Card>
          ) : orders?.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">No orders found</div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders?.map((order) => (
                <Card key={order.orderId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">Order #{order?.orderId?.split('_')[1]}</h3>
                          <p className="text-sm text-gray-600">
                            Table {order.tableNumber} • {new Date(order.timestamp || (order as SessionOrder).createdAt).toLocaleString()}
                          </p>
                        </div>
                        {isSessionOrder(order) && (
                          <Badge className={getStatusColor(order.status)}>
                            {order?.status?.charAt(0)?.toUpperCase() + order?.status?.slice(1)}
                          </Badge>
                        )}
                        {isCheckoutOrder(order) && (
                          <Badge className="bg-green-100 text-green-800">
                            Payment {order.paymentStatus}
                          </Badge>
                        )}
                        {!isSessionOrder(order) && !isCheckoutOrder(order) && (
                          <Badge className="bg-gray-100 text-gray-800">
                            {(order as any).type || 'Unknown'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Order Details</DialogTitle>
                              <DialogDescription>
                                Order #{order?.orderId?.split('_')[1]} - Table {order.tableNumber}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {isSessionOrder(order) && (
                                <div>
                                  <h4 className="font-semibold mb-2">Order Items</h4>
                                  <div className="space-y-2">
                                    {order.items.map((item, index) => (
                                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>£{(item.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-2 border-t">
                                    <div className="flex justify-between font-semibold">
                                      <span>Total:</span>
                                      <span>£{order?.totalAmount?.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {isCheckoutOrder(order) && (
                                <div>
                                  <h4 className="font-semibold mb-2">Session Summary</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>Adults: {order.sessionData?.adults}</div>
                                    <div>Children: {order.sessionData.children}</div>
                                    <div>Infants: {order.sessionData.infants}</div>
                                    <div>Extra Drinks: {order.sessionData.extraDrinks ? 'Yes' : 'No'}</div>
                                  </div>
                                  <div className="mt-2 pt-2 border-t">
                                    <div className="flex justify-between font-semibold">
                                      <span>Total Payment:</span>
                                      <span>£{order?.totalAmount?.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {(order as any).waiterId && (
                                <div>
                                  <h4 className="font-semibold mb-2">Waiter Information</h4>
                                  <p>ID: {(order as any).waiterId}</p>
                                  <p>Name: {(order as any).waiterName}</p>
                                </div>
                              )}
                              {(order as any).notes && (
                                <div>
                                  <h4 className="font-semibold mb-2">Notes</h4>
                                  <p className="text-sm text-gray-600">{(order as any).notes}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {isSessionOrder(order) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order)
                              setUpdateData({
                                status: order.status,
                                waiterId: order.waiterId || '',
                                waiterName: order.waiterName || '',
                                notes: order.notes || ''
                              })
                              setIsUpdateDialogOpen(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteOrder(order.orderId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span>£{order?.totalAmount?.toFixed(2)}</span>
                      </div>
                      {isSessionOrder(order) && (
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span>{order.items.length} items</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span>{new Date(order.timestamp || (order as SessionOrder).createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Update Order Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order</DialogTitle>
            <DialogDescription>
              Update order status and details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={updateData.status} onValueChange={(value) => setUpdateData({...updateData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="waiterId">Waiter ID</Label>
              <Input 
                id="waiterId"
                value={updateData.waiterId}
                onChange={(e) => setUpdateData({...updateData, waiterId: e.target.value})}
                placeholder="Enter waiter ID"
              />
            </div>
            <div>
              <Label htmlFor="waiterName">Waiter Name</Label>
              <Input 
                id="waiterName"
                value={updateData.waiterName}
                onChange={(e) => setUpdateData({...updateData, waiterName: e.target.value})}
                placeholder="Enter waiter name"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes"
                value={updateData.notes}
                onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                placeholder="Add any notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateOrder}>Update Order</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}