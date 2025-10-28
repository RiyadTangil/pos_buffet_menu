'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Printer, 
  Plus, 
  Edit, 
  Trash2, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { PrinterConfig } from '@/lib/models/printer'
import { fetchPrinters, createPrinter, updatePrinter, deletePrinter } from '@/lib/api/printers'
import { fetchCategories } from '@/lib/api/categories'
import { MenuCategory } from '@/lib/mockData'

export default function PrintersPage() {
  const [printers, setPrinters] = useState<PrinterConfig[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'thermal' as 'thermal' | 'inkjet' | 'laser',
    ipAddress: '',
    port: 9100,
    categories: [] as string[],
    isActive: true
  })

  useEffect(() => {
    loadPrinters()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const categoriesData = await fetchCategories()
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Error loading categories')
    }
  }

  const loadPrinters = async () => {
    try {
      setLoading(true)
      const printers = await fetchPrinters()
      setPrinters(printers)
    } catch (error) {
      console.error('Error loading printers:', error)
      toast.error('Error loading printers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingPrinter) {
        await updatePrinter(editingPrinter.id, formData)
        toast.success('Printer updated successfully')
        loadPrinters()
      } else {
        await createPrinter(formData)
        toast.success('Printer created successfully')
        loadPrinters()
      }
      
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving printer:', error)
      toast.error('Error saving printer')
    }
  }

  const handleEdit = (printer: PrinterConfig) => {
    setEditingPrinter(printer)
    setFormData({
      name: printer.name,
      type: printer.type,
      ipAddress: printer.ipAddress,
      port: printer.port,
      categories: printer.categories || [],
      isActive: printer.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (printerId: string) => {
    if (!confirm('Are you sure you want to delete this printer?')) return
    
    try {
      await deletePrinter(printerId)
      toast.success('Printer deleted successfully')
      loadPrinters()
    } catch (error) {
      console.error('Error deleting printer:', error)
      toast.error('Error deleting printer')
    }
  }

  const resetForm = () => {
    setEditingPrinter(null)
    setFormData({
      name: '',
      type: 'thermal',
      ipAddress: '',
      port: 9100,
      categories: [],
      isActive: true
    })
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getConnectionIcon = (isActive: boolean) => {
    return isActive ? (
      <Wifi className="h-4 w-4 text-green-500" />
    ) : (
      <WifiOff className="h-4 w-4 text-gray-400" />
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Printer Management</h1>
          <p className="text-gray-600">Configure and manage your restaurant printers</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Printer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPrinter ? 'Edit Printer' : 'Add New Printer'}
              </DialogTitle>
              <DialogDescription>
                Configure printer settings for your restaurant
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Printer Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Kitchen Printer 1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type">Printer Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'thermal' | 'inkjet' | 'laser') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal">Thermal</SelectItem>
                    <SelectItem value="inkjet">Inkjet</SelectItem>
                    <SelectItem value="laser">Laser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  placeholder="192.168.1.100"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  placeholder="9100"
                  min="1"
                  max="65535"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="categories">Categories</Label>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Select categories this printer will handle:</div>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`category-${category.id}`}
                          checked={formData.categories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                categories: [...formData.categories, category.id] 
                              })
                            } else {
                              setFormData({ 
                                ...formData, 
                                categories: formData.categories.filter(id => id !== category.id) 
                              })
                            }
                          }}
                        />
                        <Label htmlFor={`category-${category.id}`} className="text-sm">
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.categories.map((categoryId) => {
                        const category = categories.find(c => c.id === categoryId)
                        return category ? (
                          <Badge key={categoryId} variant="secondary" className="text-xs">
                            {category.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPrinter ? 'Update' : 'Create'} Printer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading printers...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {printers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Printer className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Printers Found</h3>
              <p className="text-gray-500 mb-4">Add your first printer to get started</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Printer
              </Button>
            </div>
          ) : (
            printers.map((printer) => (
              <Card key={printer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Printer className="h-5 w-5" />
                      {printer.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(printer.isActive)}
                      {getConnectionIcon(printer.isActive)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <Badge variant="secondary">{printer.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Categories:</span>
                      <div className="flex flex-wrap gap-1">
                        {printer.categories && printer.categories.length > 0 ? (
                          printer.categories.map((categoryId) => {
                            const category = categories.find(c => c.id === categoryId)
                            return category ? (
                              <Badge key={categoryId} variant="outline" className="text-xs">
                                {category.name}
                              </Badge>
                            ) : null
                          })
                        ) : (
                          <span className="text-xs text-gray-400">No categories assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">IP:</span>
                      <span className="text-sm font-mono">{printer.ipAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Port:</span>
                      <span className="text-sm font-mono">{printer.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={printer.isActive ? "default" : "secondary"}>
                        {printer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(printer)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(printer.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}