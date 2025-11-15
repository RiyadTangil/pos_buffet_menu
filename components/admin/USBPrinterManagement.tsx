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
  Usb,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  StarOff
} from 'lucide-react'
import { toast } from 'sonner'
import { USBPrinterConfig } from '@/lib/models/printer'
import { 
  fetchUSBPrinters, 
  createUSBPrinter, 
  updateUSBPrinter, 
  deleteUSBPrinter,
  fetchLocalPrinters 
} from '@/lib/api/usb-printers'
import { fetchCategories } from '@/lib/api/categories'
import { MenuCategory } from '@/lib/mockData'

interface LocalPrinter {
  name: string
  displayName: string
  description?: string
  status: string
  isDefault: boolean
  attributes?: string[]
}

export default function USBPrinterManagement() {
  const [usbPrinters, setUSBPrinters] = useState<USBPrinterConfig[]>([])
  const [localPrinters, setLocalPrinters] = useState<LocalPrinter[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [detectingPrinters, setDetectingPrinters] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<USBPrinterConfig | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    localPrinterName: '',
    displayName: '',
    type: 'thermal' as 'thermal' | 'inkjet' | 'laser',
    categories: [] as string[],
    isActive: true,
    isDefault: false,
    description: ''
  })

  useEffect(() => {
    loadUSBPrinters()
    loadCategories()
    detectLocalPrinters()
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

  const loadUSBPrinters = async () => {
    try {
      setLoading(true)
      const printers = await fetchUSBPrinters()
      setUSBPrinters(printers)
    } catch (error) {
      console.error('Error loading USB printers:', error)
      toast.error('Error loading USB printers')
    } finally {
      setLoading(false)
    }
  }

  const detectLocalPrinters = async () => {
    try {
      setDetectingPrinters(true)
      const printers = await fetchLocalPrinters()
      setLocalPrinters(printers)
      toast.success(`Detected ${printers.length} local printer(s)`)
    } catch (error) {
      console.error('Error detecting local printers:', error)
      toast.error('Error detecting local printers')
    } finally {
      setDetectingPrinters(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingPrinter) {
        await updateUSBPrinter(editingPrinter.id, formData)
        toast.success('USB printer updated successfully')
      } else {
        await createUSBPrinter(formData)
        toast.success('USB printer created successfully')
      }
      
      loadUSBPrinters()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving USB printer:', error)
      toast.error('Error saving USB printer')
    }
  }

  const handleEdit = (printer: USBPrinterConfig) => {
    setEditingPrinter(printer)
    setFormData({
      name: printer.name,
      localPrinterName: printer.localPrinterName,
      displayName: printer.displayName,
      type: printer.type,
      categories: printer.categories || [],
      isActive: printer.isActive,
      isDefault: printer.isDefault,
      description: printer.description || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (printerId: string) => {
    if (!confirm('Are you sure you want to delete this USB printer?')) return
    
    try {
      await deleteUSBPrinter(printerId)
      toast.success('USB printer deleted successfully')
      loadUSBPrinters()
    } catch (error) {
      console.error('Error deleting USB printer:', error)
      toast.error('Error deleting USB printer')
    }
  }

  const handleSetDefault = async (printerId: string) => {
    try {
      const printer = usbPrinters.find(p => p.id === printerId)
      if (printer) {
        await updateUSBPrinter(printerId, { isDefault: true })
        toast.success('Default printer updated')
        loadUSBPrinters()
      }
    } catch (error) {
      console.error('Error setting default printer:', error)
      toast.error('Error setting default printer')
    }
  }

  const resetForm = () => {
    setEditingPrinter(null)
    setFormData({
      name: '',
      localPrinterName: '',
      displayName: '',
      type: 'thermal',
      categories: [],
      isActive: true,
      isDefault: false,
      description: ''
    })
  }

  const selectLocalPrinter = (localPrinter: LocalPrinter) => {
    setFormData({
      ...formData,
      localPrinterName: localPrinter.name,
      displayName: localPrinter.displayName,
      name: localPrinter.displayName,
      description: localPrinter.description || ''
    })
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getDefaultIcon = (isDefault: boolean) => {
    return isDefault ? (
      <Star className="h-4 w-4 text-yellow-500 fill-current" />
    ) : (
      <StarOff className="h-4 w-4 text-gray-400" />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold">USB Printers</h2>
          <p className="text-gray-600">Manage local USB printers and their category assignments</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={detectLocalPrinters}
            disabled={detectingPrinters}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${detectingPrinters ? 'animate-spin' : ''}`} />
            {detectingPrinters ? 'Detecting...' : 'Detect Printers'}
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add USB Printer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPrinter ? 'Edit USB Printer' : 'Add New USB Printer'}
                </DialogTitle>
                <DialogDescription>
                  Configure USB printer settings and category assignments
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingPrinter && localPrinters.length > 0 && (
                  <div>
                    <Label>Available Local Printers</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {localPrinters.map((printer, index) => (
                        <div 
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                          onClick={() => selectLocalPrinter(printer)}
                        >
                          <div>
                            <div className="font-medium">{printer.displayName}</div>
                            <div className="text-sm text-gray-500">{printer.description}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={printer.status === 'Ready' ? 'default' : 'secondary'}>
                              {printer.status}
                            </Badge>
                            {printer.isDefault && <Badge variant="outline">Default</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="name">Printer Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Kitchen USB Printer"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="localPrinterName">Local Printer Name</Label>
                  <Input
                    id="localPrinterName"
                    value={formData.localPrinterName}
                    onChange={(e) => setFormData({ ...formData, localPrinterName: e.target.value })}
                    placeholder="Exact printer name from system"
                    required
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    This must match the exact printer name from your system
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Friendly display name"
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
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
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
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    />
                    <Label htmlFor="isDefault">Set as Default</Label>
                  </div>
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
      </div>

      {loading ? (
        <div className="text-center py-8">Loading USB printers...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usbPrinters.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Usb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No USB Printers Found</h3>
              <p className="text-gray-500 mb-4">Add your first USB printer to get started</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add USB Printer
              </Button>
            </div>
          ) : (
            usbPrinters.map((printer) => (
              <Card key={printer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Usb className="h-5 w-5" />
                      {printer.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(printer.isActive)}
                      {getDefaultIcon(printer.isDefault)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-sm text-gray-600">Type:</span>
                      <Badge variant="secondary">{printer.type}</Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
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
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-sm text-gray-600">Local Name:</span>
                      <span className="text-sm font-mono break-words sm:break-normal max-w-full sm:max-w-none">{printer.localPrinterName}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={printer.isActive ? "default" : "secondary"}>
                          {printer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {printer.isDefault && (
                          <Badge variant="outline" className="text-yellow-600">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(printer)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {!printer.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(printer.id)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
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