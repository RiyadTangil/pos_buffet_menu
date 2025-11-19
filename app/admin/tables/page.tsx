"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  fetchTables,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  getTableStatistics,
  resetTable,
  type Table,
  type CreateTableData,
  type UpdateTableData
} from "@/lib/api/tables"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Users, Clock, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react"
import SplitBillModal from "@/components/SplitBillModal"
import { getBuffetSettings } from "@/lib/api/settings"
import { getTableSession } from "@/lib/api/table-sessions"
import { getOrdersByTableSession } from "@/lib/api/orders-client"

interface TableStats {
  total: number
  available: number
  occupied: number
  cleaning: number
  selected: number
}

export default function TablesPage() {
  const { data: session } = useSession()
  const isWaiter = session?.user?.role === 'waiter'
  const [tables, setTables] = useState<Table[]>([])
  const [stats, setStats] = useState<TableStats>({
    total: 0,
    available: 0,
    occupied: 0,
    cleaning: 0,
    selected: 0
  })
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [newTable, setNewTable] = useState<CreateTableData>({
    number: 1,
    capacity: 4,
    status: 'available'
  })
  const [editTable, setEditTable] = useState<UpdateTableData>({})
  // Waiter verification and payment selection for Reset
  const [waiterPin, setWaiterPin] = useState<string>('')
  const [validatedWaiter, setValidatedWaiter] = useState<{ id: string; name: string } | null>(null)
  const [pinError, setPinError] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [isSplit, setIsSplit] = useState<boolean>(false)
  // Split bill states
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false)
  const [splitOrders, setSplitOrders] = useState<any[]>([])
  const [splitSessionData, setSplitSessionData] = useState<any | null>(null)
  const [splitTotalAmount, setSplitTotalAmount] = useState<number>(0)
  const [splitBills, setSplitBills] = useState<any[] | null>(null)
  const [buffetSettings, setBuffetSettings] = useState<any | null>(null)

  // Load tables and statistics
  const loadTables = async () => {
    try {
      setLoading(true)
      const [tablesData, statsData] = await Promise.all([
        fetchTables(),
        getTableStatistics()
      ])
      setTables(tablesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading tables:', error)
      toast({
        title: "Error",
        description: "Failed to load tables. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTables()
  }, [])

  // Handle add table
  const handleAddTable = async () => {
    try {
      await createTable(newTable)
      toast({
        title: "Success",
        description: "Table created successfully.",
      })
      setIsAddModalOpen(false)
      setNewTable({ number: 1, capacity: 4, status: 'available' })
      loadTables()
    } catch (error: any) {
      console.error('Add table error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create table.",
        variant: "destructive",
      })
    }
  }

  // Handle edit table
  const handleEditTable = async () => {
    if (!selectedTable) return

    try {
      await updateTable(selectedTable.id, editTable)
      toast({
        title: "Success",
        description: "Table updated successfully.",
      })
      setIsEditModalOpen(false)
      setSelectedTable(null)
      setEditTable({})
      loadTables()
    } catch (error: any) {
      console.error('Edit table error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update table.",
        variant: "destructive",
      })
    }
  }

  // Handle delete table
  const handleDeleteTable = async () => {
    if (!selectedTable) return

    try {
      await deleteTable(selectedTable.id)
      toast({
        title: "Success",
        description: "Table deleted successfully.",
      })
      setIsDeleteModalOpen(false)
      setSelectedTable(null)
      loadTables()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete table.",
        variant: "destructive",
      })
    }
  }

  // Handle status change
  const handleStatusChange = async (tableId: string, newStatus: Table['status']) => {
    try {
      await updateTableStatus(tableId, newStatus)
      toast({
        title: "Success",
        description: "Table status updated successfully.",
      })
      loadTables()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update table status.",
        variant: "destructive",
      })
    }
  }

  // Get status badge variant
  const getStatusBadge = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Available</Badge>
      case 'occupied':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Occupied</Badge>
      case 'cleaning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Cleaning</Badge>
      case 'selected':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Selected</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Open edit modal
  const openEditModal = (table: Table) => {
    setSelectedTable(table)
    setEditTable({
      number: table.number,
      status: table.status,
      capacity: table.capacity,
      currentGuests: table.currentGuests
    })
    setIsEditModalOpen(true)
  }

  // Open delete modal
  const openDeleteModal = (table: Table) => {
    setSelectedTable(table)
    setIsDeleteModalOpen(true)
  }

  // Open reset modal
  const openResetModal = (table: Table) => {
    setSelectedTable(table)
    // Reset modal-specific state
    setWaiterPin('')
    setValidatedWaiter(null)
    setPinError('')
    setPaymentMethod('cash')
    setIsSplit(false)
    setSplitBills(null)
    setSplitOrders([])
    setSplitSessionData(null)
    setSplitTotalAmount(0)
    setIsSplitModalOpen(false)
    setIsResetModalOpen(true)
  }

  // Handle reset table
  const handleResetTable = async () => {
    if (!selectedTable) return
    // Ensure we carry forward any already validated waiter
    let waiterInfo: { id: string; name: string } | null = validatedWaiter || null
    try {
      setResetLoading(true)
      // Validate waiter PIN if not already validated
      if (!validatedWaiter) {
        if (!waiterPin || waiterPin.trim().length !== 4) {
          setPinError('Please enter a valid 4-digit PIN')
          setResetLoading(false)
          return
        }
        const pinResponse = await fetch('/api/users/validate-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: waiterPin })
        })
        const pinResult = await pinResponse.json()

        if (!pinResponse.ok || !pinResult.success) {
          setPinError(pinResult.error || 'Invalid PIN')
          setResetLoading(false)
          return
        }
        setValidatedWaiter({ id: pinResult.data.id, name: pinResult.data.name })
        waiterInfo = ({ id: pinResult.data.id, name: pinResult.data.name })
      }

      // Ensure waiter info is present before proceeding
      if (!waiterInfo) {
        setPinError('Please validate waiter PIN before resetting')
        setResetLoading(false)
        return
      }

      // If split bills are prepared, create payment via payments API
      if (isSplit && splitBills && splitSessionData && selectedTable) {
        try {
          const paymentPayload = {
            tableId: selectedTable.id,
            tableNumber: selectedTable.number,
            waiterId: waiterInfo?.id as string,
            waiterName: waiterInfo?.name as string,
            totalAmount: splitTotalAmount,
            tipAmount: 0,
            paymentMethod,
            sessionType: (splitSessionData?.sessionType || 'lunch'),
            groupType: splitSessionData?.groupType || 'same',
            isSplit: true,
            splitInfo: {
              totalSplits: splitBills.length,
              splitIndex: 0,
              originalTotalAmount: splitTotalAmount
            },
            splitPayments: splitBills,
            sessionData: {
              adults: splitSessionData?.adults || 0,
              children: splitSessionData?.children || 0,
              infants: splitSessionData?.infants || 0,
              extraDrinks: splitSessionData?.extraDrinks || false,
              adultPrice: splitSessionData?.adultPrice || 0,
              childPrice: splitSessionData?.childPrice || 0,
              infantPrice: splitSessionData?.infantPrice || 0,
              extraDrinksPricing: splitSessionData?.extraDrinksPricing,
              sessionSpecificExtraDrinksPricing: splitSessionData?.sessionSpecificExtraDrinksPricing
            }
          }

          const resp = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentPayload)
          })
          const data = await resp.json()
          if (!resp.ok || !data.success) {
            throw new Error(data.error || 'Failed to create split payment')
          }

          toast({
            title: 'Split payment recorded',
            description: `Payment created and table ${selectedTable.number} reset.`
          })
          setIsResetModalOpen(false)
          setSelectedTable(null)
          loadTables()
          return
        } catch (err: any) {
          toast({ title: 'Error', description: err.message || 'Failed to process split payment', variant: 'destructive' })
        } finally {
          setResetLoading(false)
        }
        return
      }
   

      const result = await resetTable(selectedTable.id, {
        paymentMethod,
        waiterId: waiterInfo?.id,
        waiterName: waiterInfo?.name,
        isSplit,
      })
      toast({
        title: "Table reset",
        description: `Table ${selectedTable.number} reset successfully${result?.payments?.length ? `, ${result.payments.length} payment(s) recorded` : ''}.`,
      })
      setIsResetModalOpen(false)
      setSelectedTable(null)
      loadTables()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset table.",
        variant: "destructive",
      })
    } finally {
      setResetLoading(false)
    }
  }

  // Helper to compute totals and sessionData for SplitBillModal
  const computeTotalsForSplit = (session: any, orders: any[], settings: any) => {
    // Determine current session dynamically from settings.sessions by time
    const getCurrentSession = () => {
      const sessions = settings?.sessions || {}
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      for (const key of Object.keys(sessions)) {
        const cfg = sessions[key]
        if (!cfg?.startTime || !cfg?.endTime) continue
        const [sH, sM] = cfg.startTime.split(':').map((n: string) => parseInt(n, 10))
        const [eH, eM] = cfg.endTime.split(':').map((n: string) => parseInt(n, 10))
        const start = (sH || 0) * 60 + (sM || 0)
        const end = (eH || 0) * 60 + (eM || 0)
        if (currentMinutes >= start && currentMinutes < end) {
          return { key, config: cfg }
        }
      }
      // Fallback
      return { key: 'lunch', config: sessions['lunch'] || {} }
    }

    const currentSession = getCurrentSession()
 
    const currentSessionKey = currentSession.key
    const sessionPricing = currentSession.config
    const adultPrice = sessionPricing?.adultPrice || 0
    const childPrice = sessionPricing?.childPrice || 0
    const infantPrice = sessionPricing?.infantPrice || 0
    const includeDrinks = !!session?.guestCounts?.includeDrinks

    // Extra drinks pricing
    const extraPricing = settings?.sessionSpecificExtraDrinksPricing?.[currentSessionKey] || settings?.extraDrinksPricing
    const extraAdult = extraPricing?.adultPrice || 0
    const extraChild = extraPricing?.childPrice || 0
    const extraInfant = extraPricing?.infantPrice || 0

    const adults = session?.guestCounts?.adults || 0
    const children = session?.guestCounts?.children || 0
    const infants = session?.guestCounts?.infants || 0

    const buffetSubtotal = (adults * adultPrice) + (children * childPrice) + (infants * infantPrice)
    const drinksSubtotal = includeDrinks ? (adults * extraAdult + children * extraChild + infants * extraInfant) : 0

    // Sum item totals per order (align with /menu/session/orders logic)
    const ordersTotal = orders.reduce((sum, order: any) => {
      if (order?.items && Array.isArray(order.items)) {
        const orderSum = order.items.reduce((s: number, item: any) => {
          const itemPrice = item?.price || 0
          const itemQuantity = item?.quantity || 1
          return s + itemPrice * itemQuantity
        }, 0)
        return sum + orderSum
      }
      return sum
    }, 0)

    const grand = buffetSubtotal + drinksSubtotal + ordersTotal

    const modalSessionData = {
      adults,
      children,
      infants,
      extraDrinks: includeDrinks,
      adultPrice,
      childPrice,
      infantPrice,
      extraDrinksPricing: {
        adultPrice: extraAdult,
        childPrice: extraChild,
        infantPrice: extraInfant,
      },
      sessionSpecificExtraDrinksPricing: settings?.sessionSpecificExtraDrinksPricing,
      groupType: session?.groupType || 'same',
      sessionType: currentSessionKey,
    }

    return { grandTotal: grand, modalSessionData }
  }

  // Load session & orders and open split modal
  const handleOpenSplitModal = async () => {
    try {
      if (!selectedTable) return
      // Validate PIN first for security
      if (!validatedWaiter) {
        if (!waiterPin || waiterPin.trim().length !== 4) {
          setPinError('Please enter a valid 4-digit PIN')
          return
        }
        const pinResponse = await fetch('/api/users/validate-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: waiterPin })
        })
        const pinResult = await pinResponse.json()
        if (!pinResponse.ok || !pinResult.success) {
          setPinError(pinResult.error || 'Invalid PIN')
          return
        }
        setValidatedWaiter({ id: pinResult.data.id, name: pinResult.data.name })
      }

      const settingsRes = await getBuffetSettings()
      if (!settingsRes.success || !settingsRes.data) {
        toast({ title: 'Error', description: 'Failed to load buffet settings', variant: 'destructive' })
        return
      }
      setBuffetSettings(settingsRes.data)

      const session = await getTableSession(selectedTable.id)
      if (!session) {
        toast({ title: 'No active session', description: 'No active session found for this table', variant: 'destructive' })
        return
      }

      const ordersRes = await getOrdersByTableSession(session.id)
      const orders = Array.isArray(ordersRes?.orders) ? ordersRes.orders : []

      const { grandTotal, modalSessionData } = computeTotalsForSplit(session, orders, settingsRes.data)
 

      setSplitOrders(orders)
      setSplitSessionData(modalSessionData)
      setSplitTotalAmount(grandTotal)
      setIsSplitModalOpen(true)
    } catch (err) {
      console.error('Open split modal error', err)
      toast({ title: 'Error', description: 'Failed to open split modal', variant: 'destructive' })
    }
  }

  const handleSplitConfirm = (result: any) => {
    // SplitBillModal returns an array of split results
    setSplitBills(Array.isArray(result) ? result : (result?.splits || []))
    setIsSplit(true)
    setIsSplitModalOpen(false)
    toast({ title: 'Split prepared', description: 'Proceed to Reset to record payment.' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading tables...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Table Management</h1>
          <p className="text-muted-foreground">
            Manage restaurant tables, capacity, and status
          </p>
        </div>
        {!isWaiter && (
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Table
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      {!isWaiter && (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleaning</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.cleaning}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.selected}</div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
          <CardDescription>
            Manage table information, status, and capacity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UITable>
            <TableHeader>
              <TableRow>
                <TableHead>Table #</TableHead>
                {!isWaiter && <TableHead>Status</TableHead>}
                <TableHead>Capacity</TableHead>
                <TableHead>Current Guests</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Items Served</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">Table {table.number}</TableCell>
                  {!isWaiter && (
                    <TableCell>
                      <Select
                        value={table.status}
                        onValueChange={(value: Table['status']) => handleStatusChange(table.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="selected">Selected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell>{table.capacity} people</TableCell>
                  <TableCell>{table.currentGuests} guests</TableCell>
                  <TableCell>{table.currentOrders || 0}</TableCell>
                  <TableCell>
                    {table.status === 'occupied' || table.status === 'selected'
                      ? `Served / ${table.totalItems || 0} Items`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!isWaiter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(table)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetModal(table)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {!isWaiter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteModal(table)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>

      {/* Add Table Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>
              Create a new table for the restaurant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tableNumber">Table Number</Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                value={newTable.number}
                onChange={(e) => setNewTable({ ...newTable, number: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="12"
                value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })}
              />
            </div>
            <div>
              <Label htmlFor="status">Initial Status</Label>
              <Select
                value={newTable.status}
                onValueChange={(value: Table['status']) => setNewTable({ ...newTable, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTable}>
              Add Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Bill Modal */}
      {isSplitModalOpen && (
        <SplitBillModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          onConfirm={handleSplitConfirm}
          orders={splitOrders}
          sessionData={{
            adults: splitSessionData?.adults || 0,
            children: splitSessionData?.children || 0,
            infants: splitSessionData?.infants || 0,
            extraDrinks: !!splitSessionData?.extraDrinks,
            adultPrice: splitSessionData?.adultPrice || 0,
            childPrice: splitSessionData?.childPrice || 0,
            infantPrice: splitSessionData?.infantPrice || 0,
            extraDrinksPricing: splitSessionData?.extraDrinksPricing,
          }}
          totalAmount={splitTotalAmount}
        />
      )}

      {/* Edit Table Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table {selectedTable?.number}</DialogTitle>
            <DialogDescription>
              Update table information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTableNumber">Table Number</Label>
              <Input
                id="editTableNumber"
                type="number"
                min="1"
                value={editTable.number || ''}
                onChange={(e) => setEditTable({ ...editTable, number: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="editCapacity">Capacity</Label>
              <Input
                id="editCapacity"
                type="number"
                min="1"
                max="12"
                value={editTable.capacity || ''}
                onChange={(e) => setEditTable({ ...editTable, capacity: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="editCurrentGuests">Current Guests</Label>
              <Input
                id="editCurrentGuests"
                type="number"
                min="0"
                value={editTable.currentGuests || ''}
                onChange={(e) => setEditTable({ ...editTable, currentGuests: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="editStatus">Status</Label>
              <Select
                value={editTable.status}
                onValueChange={(value: Table['status']) => setEditTable({ ...editTable, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTable}>
              Update Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Table Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table {selectedTable?.number}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this table? This action cannot be undone.
              Tables with active orders cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTable}>
              Delete Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Table Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Table {selectedTable?.number}</DialogTitle>
            <DialogDescription>
              This will end any active sessions, record payment(s) based on guests and orders, clear sessions, and mark the table as available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="waiterPin">Waiter PIN</Label>
              <Input
                id="waiterPin"
                type="password"
                maxLength={4}
                value={waiterPin}
                onChange={(e) => { setWaiterPin(e.target.value); setPinError('') }}
                placeholder="Enter 4-digit PIN"
              />
              {pinError && (
                <p className="text-red-600 text-sm mt-1">{pinError}</p>
              )}
            </div>
            <div>
              <Label>Payment Method</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                >
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                >
                  Card
                </Button>
              </div>
            </div>
            {/* Split Bill trigger */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleOpenSplitModal}>
                Split Bill
              </Button>
              {isSplit && splitBills ? (
                <Badge variant="outline" className="text-orange-700 border-orange-300">{splitBills.length} splits prepared</Badge>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetModalOpen(false)} disabled={resetLoading}>
              Cancel
            </Button>
            <Button onClick={handleResetTable} className="bg-orange-600 hover:bg-orange-700" disabled={resetLoading}>
              {resetLoading ? (
                <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</span>
              ) : (
                'Reset Table'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}