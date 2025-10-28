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
import { Plus, Edit, Trash2, Users, Clock, CheckCircle, XCircle } from "lucide-react"

interface TableStats {
  total: number
  available: number
  occupied: number
  cleaning: number
  selected: number
}

export default function TablesPage() {
  const { data: session } = useSession()
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
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [newTable, setNewTable] = useState<CreateTableData>({
    number: 1,
    capacity: 4,
    status: 'available'
  })
  const [editTable, setEditTable] = useState<UpdateTableData>({})

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
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Table
        </Button>
      </div>

      {/* Statistics Cards */}
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
                <TableHead>Status</TableHead>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(table)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteModal(table)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
    </div>
  )
}