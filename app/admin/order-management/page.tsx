'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Calendar, Clock, Users, Utensils, Filter, Search } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
}

interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  session: 'breakfast' | 'lunch' | 'dinner';
  date: string;
  time: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served';
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
}

// Fetch orders from API
const fetchOrders = async (filters: {
  date?: string;
  session?: string;
  table?: string;
}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.session && filters.session !== 'all') {
      params.append('session', filters.session);
    }
    if (filters.table && filters.table !== 'all') {
      params.append('table', filters.table);
    }
    
    const response = await fetch(`/api/orders?${params.toString()}`);
    const data = await response.json();
    
    if (data.orders) {
      // Filter by date on client side since API doesn't support date filtering yet
      let orders = data.orders;
      if (filters.date) {
        orders = orders.filter((order: Order) => order.date === filters.date);
      }
      return orders;
    } else {
      console.error('Failed to fetch orders:', data.message || 'Unknown error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};



export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    orderId: string;
    newStatus: Order['status'];
    orderTableNumber: number;
  } | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Fetch orders on component mount and when filters change
  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      const fetchedOrders = await fetchOrders({
        date: selectedDate,
        session: selectedSession,
        table: selectedTable
      });
      setOrders(fetchedOrders);
      setLoading(false);
    };
    
    loadOrders();
  }, [selectedDate, selectedSession, selectedTable]);

  // Filter orders based on selected criteria
  useEffect(() => {
    let filtered = orders;

    if (selectedDate) {
      filtered = filtered.filter(order => order.date === selectedDate);
    }

    if (selectedSession !== 'all') {
      filtered = filtered.filter(order => order.session === selectedSession);
    }

    if (selectedTable !== 'all') {
      filtered = filtered.filter(order => order.tableNumber.toString() === selectedTable);
    }

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.items.some(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredOrders(filtered);
  }, [orders, selectedDate, selectedSession, selectedTable, searchTerm]);

  const getSessionBadgeColor = (session: string) => {
    switch (session) {
      case 'breakfast': return 'bg-orange-100 text-orange-800';
      case 'lunch': return 'bg-blue-100 text-blue-800';
      case 'dinner': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'served': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdateClick = (orderId: string, newStatus: Order['status']) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setPendingStatusUpdate({
        orderId,
        newStatus,
        orderTableNumber: order.tableNumber
      });
      setConfirmModalOpen(true);
    }
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatusUpdate) return;
    
    setStatusUpdateLoading(true);
    try {
      const response = await fetch(`/api/orders/${pendingStatusUpdate.orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: pendingStatusUpdate.newStatus })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === pendingStatusUpdate.orderId ? { ...order, status: pendingStatusUpdate.newStatus } : order
        ));
        setConfirmModalOpen(false);
        setPendingStatusUpdate(null);
      } else {
        console.error('Failed to update order status:', data.error);
        alert('Failed to update order status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status. Please try again.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const uniqueTables = Array.from(new Set(orders.map(order => order.tableNumber))).sort((a, b) => a - b);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">Manage and track orders by table, session, and date</p>
        </div>
      </div>

      {/* Filters Section - Sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <Card className="border-0 shadow-none">
          <CardContent className="py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="date" className="text-xs text-muted-foreground">Date:</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="session" className="text-xs text-muted-foreground">Session:</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="table" className="text-xs text-muted-foreground">Table:</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger className="h-8 w-24 text-xs">
                    <SelectValue placeholder="Table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {uniqueTables.map(table => (
                      <SelectItem key={table} value={table.toString()}>
                        Table {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="search" className="text-xs text-muted-foreground">Search:</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 w-32 pl-7 text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Orders ({filteredOrders.length})</h2>
          <div className="text-sm text-muted-foreground">
            Showing orders for {selectedDate}
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-medium mb-2">Loading orders...</h3>
                <p className="text-muted-foreground">Please wait while we fetch the latest orders.</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground">No orders match your current filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-2 ">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        Table {order.tableNumber}
                      </Badge>
                      <Badge className={`text-xs px-2 py-0.5 ${getSessionBadgeColor(order.session)}`}>
                        {order.session.charAt(0).toUpperCase() + order.session.slice(1)}
                      </Badge>
                      <Badge className={`text-xs px-2 py-0.5 ${getStatusBadgeColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {order.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {order.guestCount.adults}A {order.guestCount.children}C {order.guestCount.infants}I
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <h4 className="font-medium text-xs text-muted-foreground mb-1">Items:</h4>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="secondary" className="text-xs px-1 py-0">{item.category}</Badge>
                          </div>
                          <span className="text-muted-foreground">Qty: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-1 pt-1">
                      <Button 
                         size="sm" 
                         variant={order.status === 'preparing' ? 'default' : 'outline'}
                         onClick={() => handleStatusUpdateClick(order.id, 'preparing')}
                         disabled={order.status === 'served'}
                         className="h-7 px-2 text-xs"
                       >
                         Preparing
                       </Button>
                       <Button 
                         size="sm" 
                         variant={order.status === 'ready' ? 'default' : 'outline'}
                         onClick={() => handleStatusUpdateClick(order.id, 'ready')}
                         disabled={order.status === 'served'}
                         className="h-7 px-2 text-xs"
                       >
                         Ready
                       </Button>
                       <Button 
                         size="sm" 
                         variant={order.status === 'served' ? 'default' : 'outline'}
                         onClick={() => handleStatusUpdateClick(order.id, 'served')}
                         className="h-7 px-2 text-xs"
                       >
                         Served
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Status Update Confirmation Modal */}
      <ConfirmationModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title="Update Order Status"
        description={
          pendingStatusUpdate ? (
            <div>
              <p>Are you sure you want to change the status of <strong>Table {pendingStatusUpdate.orderTableNumber}</strong> order to <strong>{pendingStatusUpdate.newStatus.charAt(0).toUpperCase() + pendingStatusUpdate.newStatus.slice(1)}</strong>?</p>
              <p className="text-sm text-muted-foreground mt-2">
                This will update the order status and notify the kitchen/service staff.
              </p>
            </div>
          ) : ''
        }
        confirmText="Update Status"
        onConfirm={confirmStatusUpdate}
        loading={statusUpdateLoading}
      />
    </div>
  );
}