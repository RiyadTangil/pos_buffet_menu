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
  Plus, 
  Edit, 
  Trash2, 
  Wifi, 
  Usb,
  Users,
  Sparkles,
  Receipt,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { WaiterRequestPrinterMapping, WaiterRequestType, PrinterConfig, USBPrinterConfig } from '@/lib/models/printer'
import { 
  fetchWaiterRequestMappings, 
  saveWaiterRequestMapping, 
  deleteWaiterRequestMapping 
} from '@/lib/api/waiter-requests'
import { fetchPrinters } from '@/lib/api/printers'
import { fetchUSBPrinters, fetchLocalPrinters } from '@/lib/api/usb-printers'

interface LocalPrinter {
  name: string
  displayName: string
  description?: string
  status: string
  isDefault: boolean
  attributes?: string[]
}

const REQUEST_TYPE_ICONS = {
  waiter: Users,
  cleaning: Sparkles,
  bill: Receipt
}

const REQUEST_TYPE_LABELS = {
  waiter: 'Request Waiter',
  cleaning: 'Request Cleaning',
  bill: 'Request Bill'
}

export default function WaiterRequestPrinterManagement() {
  const [mappings, setMappings] = useState<WaiterRequestPrinterMapping[]>([])
  const [ipPrinters, setIPPrinters] = useState<PrinterConfig[]>([])
  const [usbPrinters, setUSBPrinters] = useState<USBPrinterConfig[]>([])
  const [localPrinters, setLocalPrinters] = useState<LocalPrinter[]>([])
  const [loading, setLoading] = useState(true)
  const [detectingPrinters, setDetectingPrinters] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<WaiterRequestPrinterMapping | null>(null)
  const [formData, setFormData] = useState({
    requestType: 'waiter' as WaiterRequestType,
    printerId: '',
    printerName: '',
    connectionType: 'ip' as 'ip' | 'usb',
    isActive: true
  })

  useEffect(() => {
    loadData()
    detectLocalPrinters()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [mappingsResponse, ipPrintersResponse, usbPrintersResponse] = await Promise.all([
        fetchWaiterRequestMappings(),
        fetchPrinters(),
        fetchUSBPrinters()
      ])

      // fetchWaiterRequestMappings returns array directly, not wrapped in success/data
      setMappings(mappingsResponse)
      
      if (ipPrintersResponse.success) {
        setIPPrinters(ipPrintersResponse.data)
      }
      if (usbPrintersResponse.success) {
        setUSBPrinters(usbPrintersResponse.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load waiter request printer mappings')
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

  const selectLocalPrinter = (localPrinter: LocalPrinter) => {
    setFormData({
      ...formData,
      printerId: localPrinter.name,
      printerName: localPrinter.displayName,
      connectionType: 'usb'
    })
  }

  const resetForm = () => {
    setFormData({
      requestType: 'waiter',
      printerId: '',
      printerName: '',
      connectionType: 'ip',
      isActive: true
    })
    setEditingMapping(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const mappingData = {
        requestType: formData.requestType,
        printerId: formData.printerId,
        printerName: formData.printerName,
        connectionType: formData.connectionType,
        isActive: formData.isActive
      }

      let response
      // Use saveWaiterRequestMapping for both create and update operations
      response = await saveWaiterRequestMapping(mappingData)

      // saveWaiterRequestMapping returns the mapping directly, not wrapped in success/data
      toast.success(editingMapping ? 'Mapping updated successfully' : 'Mapping created successfully')
      setIsDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving mapping:', error)
      toast.error('Failed to save mapping')
    }
  }

  const handleEdit = (mapping: WaiterRequestPrinterMapping) => {
    setEditingMapping(mapping)
    setFormData({
      requestType: mapping.requestType,
      printerId: mapping.printerId,
      printerName: mapping.printerName,
      connectionType: mapping.connectionType,
      isActive: mapping.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (requestType: WaiterRequestType) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return

    try {
      const response = await deleteWaiterRequestMapping(requestType)
      if (response.success) {
        toast.success('Mapping deleted successfully')
        loadData()
      } else {
        toast.error(response.error || 'Failed to delete mapping')
      }
    } catch (error) {
      console.error('Error deleting mapping:', error)
      toast.error('Failed to delete mapping')
    }
  }

  const handlePrinterChange = (printerId: string) => {
    const printer = formData.connectionType === 'ip' 
      ? ipPrinters.find(p => p.id === printerId)
      : usbPrinters.find(p => p.id === printerId)
    
    if (printer) {
      setFormData({
        ...formData,
        printerId,
        printerName: printer.name
      })
    }
  }

  const getAvailablePrinters = () => {
    return formData.connectionType === 'ip' ? ipPrinters : usbPrinters
  }

  const getRequestTypeIcon = (requestType: WaiterRequestType) => {
    const Icon = REQUEST_TYPE_ICONS[requestType]
    return <Icon className="h-4 w-4" />
  }

  const getConnectionIcon = (connectionType: 'ip' | 'usb') => {
    return connectionType === 'ip' ? (
      <Wifi className="h-4 w-4 text-blue-500" />
    ) : (
      <Usb className="h-4 w-4 text-green-500" />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Waiter Request Printers</h2>
          <p className="text-gray-600">Configure which printers handle waiter service requests</p>
        </div>
        <div className="flex gap-2">
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
              Add Request Mapping
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMapping ? 'Edit Request Mapping' : 'Add Request Mapping'}
                </DialogTitle>
                <DialogDescription>
                  Configure which printer handles specific waiter requests
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingMapping && formData.connectionType === 'usb' && localPrinters.length > 0 && (
                  <div>
                    <Label>Available Local Printers</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {localPrinters.map((printer, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50"
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
                <Label htmlFor="requestType">Request Type</Label>
                <Select
                  value={formData.requestType}
                  onValueChange={(value: WaiterRequestType) => 
                    setFormData({ ...formData, requestType: value })
                  }
                  disabled={!!editingMapping}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {getRequestTypeIcon(key as WaiterRequestType)}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="connectionType">Connection Type</Label>
                <Select
                  value={formData.connectionType}
                  onValueChange={(value: 'ip' | 'usb') => 
                    setFormData({ ...formData, connectionType: value, printerId: '', printerName: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ip">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        IP Printer
                      </div>
                    </SelectItem>
                    <SelectItem value="usb">
                      <div className="flex items-center gap-2">
                        <Usb className="h-4 w-4" />
                        USB Printer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="printerId">Printer</Label>
                <Select
                  value={formData.printerId}
                  onValueChange={handlePrinterChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select printer" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePrinters().map((printer) => (
                      <SelectItem key={printer.id} value={printer.id}>
                        {printer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {editingMapping ? 'Update' : 'Create'} Mapping
                </Button>
              </div>
            </form>
          </DialogContent></Dialog>
            </div>
          </div>

      {loading ? (
        <div className="text-center py-8">Loading mappings...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mappings.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Request Mappings Found</h3>
              <p className="text-gray-500 mb-4">Configure printer assignments for waiter requests</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>
          ) : (
            mappings.map((mapping) => (
              <Card key={mapping.requestType} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getRequestTypeIcon(mapping.requestType)}
                      {REQUEST_TYPE_LABELS[mapping.requestType]}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={mapping.isActive ? 'default' : 'secondary'}>
                        {mapping.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {getConnectionIcon(mapping.connectionType)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Printer:</span>
                      <span className="text-sm font-medium">{mapping.printerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <Badge variant="outline">
                        {mapping.connectionType?.toUpperCase() ?? 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(mapping)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(mapping.requestType)}
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