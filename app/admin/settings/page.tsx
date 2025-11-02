"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Loader2, Save, DollarSign, Clock, Users, Plus, Trash2 } from "lucide-react"
import { getBuffetSettings, updateBuffetSettings, BuffetSettings, ExtraDrinksPricing, SessionSpecificExtraDrinksPricing, ItemsLimit, SessionSpecificItemsLimit, SpecialTableItemsLimit } from '@/lib/api/settings'
import { fetchTables, Table } from '@/lib/api/tables'

export default function SettingsPage() {
  const [settings, setSettings] = useState<BuffetSettings>({
    sessions: {
      breakfast: {
        name: 'Breakfast',
        startTime: '07:00',
        endTime: '11:00',
        adultPrice: 20,
        childPrice: 12,
        infantPrice: 0,
        isActive: true,
        nextOrderAvailableInMinutes: 30
      },
      lunch: {
        name: 'Lunch',
        startTime: '12:00',
        endTime: '16:00',
        adultPrice: 25,
        childPrice: 15,
        infantPrice: 0,
        isActive: true,
        nextOrderAvailableInMinutes: 30
      },
      dinner: {
        name: 'Dinner',
        startTime: '18:00',
        endTime: '22:00',
        adultPrice: 30,
        childPrice: 18,
        infantPrice: 0,
        isActive: true,
        nextOrderAvailableInMinutes: 30
      }
    },
    extraDrinksPrice: 5, // Keep for backward compatibility
    extraDrinksPricing: {
      adultPrice: 5,
      childPrice: 3,
      infantPrice: 0
    },
    sessionSpecificExtraDrinksPricing: {
      breakfast: {
        adultPrice: 5,
        childPrice: 3,
        infantPrice: 0
      },
      lunch: {
        adultPrice: 5,
        childPrice: 3,
        infantPrice: 0
      },
      dinner: {
        adultPrice: 5,
        childPrice: 3,
        infantPrice: 0
      }
    },
    itemsLimit: {
      adultLimit: 5,
      childLimit: 4,
      infantLimit: 3
    },
    sessionSpecificItemsLimit: {
      breakfast: {
        adultLimit: 5,
        childLimit: 4,
        infantLimit: 3
      },
      lunch: {
        adultLimit: 5,
        childLimit: 4,
        infantLimit: 3
      },
      dinner: {
        adultLimit: 5,
        childLimit: 4,
        infantLimit: 3
      }
    },
    specialTableItemsLimit: []
  })
  const [selectedSession, setSelectedSession] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast')
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const [response, tablesList] = await Promise.all([
        getBuffetSettings(),
        fetchTables()
      ])
      
      // Set tables
      setTables(tablesList)
      
      if (response.success && response.data) {
        // Ensure all sessions have complete data with defaults
        const completeSettings = {
          ...response.data,
          sessions: {
            breakfast: {
              name: 'Breakfast',
              startTime: '07:00',
              endTime: '11:00',
              adultPrice: 20,
              childPrice: 12,
              infantPrice: 0,
              isActive: true,
              nextOrderAvailableInMinutes: 30,
              ...response.data.sessions?.breakfast
            },
            lunch: {
              name: 'Lunch',
              startTime: '12:00',
              endTime: '16:00',
              adultPrice: 25,
              childPrice: 15,
              infantPrice: 0,
              isActive: true,
              nextOrderAvailableInMinutes: 30,
              ...response.data.sessions?.lunch
            },
            dinner: {
              name: 'Dinner',
              startTime: '18:00',
              endTime: '22:00',
              adultPrice: 30,
              childPrice: 18,
              infantPrice: 0,
              isActive: true,
              nextOrderAvailableInMinutes: 30,
              ...response.data.sessions?.dinner
            }
          },
          specialTableItemsLimit: response.data.specialTableItemsLimit || []
        }
        setSettings(completeSettings)
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load settings",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof BuffetSettings, value: string | number) => {
    if (field === 'extraDrinksPrice') {
      setSettings(prev => ({
        ...prev,
        [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
      }))
    }
  }

  const handleExtraDrinksPricingChange = (userType: keyof ExtraDrinksPricing, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      extraDrinksPricing: {
        ...prev.extraDrinksPricing,
        [userType]: typeof value === 'string' ? parseFloat(value) || 0 : value
      }
    }))
  }

  const handleSessionSpecificExtraDrinksPricingChange = (sessionType: 'breakfast' | 'lunch' | 'dinner', userType: keyof ExtraDrinksPricing, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      sessionSpecificExtraDrinksPricing: {
        ...prev.sessionSpecificExtraDrinksPricing,
        [sessionType]: {
          ...prev.sessionSpecificExtraDrinksPricing?.[sessionType],
          [userType]: typeof value === 'string' ? parseFloat(value) || 0 : value
        }
      }
    }))
  }

  const handleItemsLimitChange = (userType: keyof ItemsLimit, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      itemsLimit: {
        ...prev.itemsLimit,
        [userType]: typeof value === 'string' ? parseInt(value) || 0 : value
      }
    }))
  }

  const handleSessionSpecificItemsLimitChange = (sessionType: 'breakfast' | 'lunch' | 'dinner', userType: keyof ItemsLimit, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      sessionSpecificItemsLimit: {
        ...prev.sessionSpecificItemsLimit,
        [sessionType]: {
          ...prev.sessionSpecificItemsLimit?.[sessionType],
          [userType]: typeof value === 'string' ? parseInt(value) || 0 : value
        }
      }
    }))
  }
  
  const handleAddSpecialTableItemLimit = () => {
    if (!selectedTableId) return
    
    const selectedTable = tables.find(table => table.id === selectedTableId)
    if (!selectedTable) return
    
    // Check if this table already has a special limit
    const existingIndex = settings.specialTableItemsLimit?.findIndex(item => item.tableId === selectedTableId)
    
    if (existingIndex !== undefined && existingIndex >= 0) {
      toast({
        title: "Table already has special limits",
        description: "This table already has special item limits configured",
        variant: "destructive"
      })
      return
    }
    
    // Add new special table item limit
    setSettings(prev => ({
      ...prev,
      specialTableItemsLimit: [
        ...(prev.specialTableItemsLimit || []),
        {
          tableId: selectedTableId,
          tableName: `Table ${selectedTable.number}`,
          itemsLimit: {
            adultLimit: prev.itemsLimit?.adultLimit || 5,
            childLimit: prev.itemsLimit?.childLimit || 4,
            infantLimit: prev.itemsLimit?.infantLimit || 3
          }
        }
      ]
    }))
    
    // Reset selected table
    setSelectedTableId('')
  }
  
  const handleRemoveSpecialTableItemLimit = (tableId: string) => {
    setSettings(prev => ({
      ...prev,
      specialTableItemsLimit: prev.specialTableItemsLimit?.filter(item => item.tableId !== tableId) || []
    }))
  }
  
  const handleSpecialTableItemLimitChange = (tableId: string, userType: keyof ItemsLimit, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      specialTableItemsLimit: prev.specialTableItemsLimit?.map(item => 
        item.tableId === tableId 
          ? {
              ...item,
              itemsLimit: {
                ...item.itemsLimit,
                [userType]: typeof value === 'string' ? parseInt(value) || 0 : value
              }
            }
          : item
      ) || []
    }))
  }

  const handleSessionChange = (sessionType: 'breakfast' | 'lunch' | 'dinner', field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionType]: {
          ...prev.sessions[sessionType],
          [field]: field.includes('Price') || field === 'nextOrderAvailableInMinutes' 
            ? (typeof value === 'string' ? parseFloat(value) || 0 : value)
            : value
        }
      }
    }))
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      const response = await updateBuffetSettings(settings)
      if (response.success) {
        toast({
          title: "Success",
          description: "Buffet settings saved successfully"
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to save settings",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Restaurant Settings</h1>
          <p className="text-gray-600">Configure buffet session pricing and timing settings</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Session Settings */}
        <div className="grid gap-6">
          <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Clock className="h-5 w-5" />
               Session Configuration
             </CardTitle>
             <CardDescription>
               Configure session timing and pricing
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid gap-2">
               <Label htmlFor="session-select">Select Session</Label>
               <Select value={selectedSession} onValueChange={(value: 'breakfast' | 'lunch' | 'dinner') => setSelectedSession(value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select a session" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="breakfast">🌅 Breakfast </SelectItem>
                   <SelectItem value="lunch">☀️ Lunch </SelectItem>
                   <SelectItem value="dinner">🌙 Dinner </SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="flex items-center space-x-2">
               <input
                 id="session-active"
                 type="checkbox"
                 checked={settings.sessions[selectedSession]?.isActive}
                 onChange={(e) => handleSessionChange(selectedSession, 'isActive', e.target.checked)}
                 className="rounded"
               />
               <Label htmlFor="session-active">Session Active</Label>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="grid gap-2">
                 <Label htmlFor="startTime">Start Time</Label>
                 <Input
                   id="startTime"
                   type="time"
                   value={settings.sessions[selectedSession]?.startTime}
                   onChange={(e) => handleSessionChange(selectedSession, 'startTime', e.target.value)}
                 />
               </div>
               
               <div className="grid gap-2">
                 <Label htmlFor="endTime">End Time</Label>
                 <Input
                   id="endTime"
                   type="time"
                   value={settings.sessions[selectedSession]?.endTime}
                   onChange={(e) => handleSessionChange(selectedSession, 'endTime', e.target.value)}
                 />
               </div>
               
               <div className="grid gap-2">
                 <Label htmlFor="nextOrder">Next Order Available (minutes)</Label>
                 <Input
                   id="nextOrder"
                   type="number"
                   min="1"
                   value={settings.sessions[selectedSession]?.nextOrderAvailableInMinutes}
                   onChange={(e) => handleSessionChange(selectedSession, 'nextOrderAvailableInMinutes', e.target.value)}
                   placeholder="30"
                 />
               </div>
               
               <div className="grid gap-2">
                 <Label htmlFor="adultPrice">Adult Price ($)</Label>
                 <Input
                   id="adultPrice"
                   type="number"
                   min="0"
                   step="0.01"
                   value={settings.sessions[selectedSession]?.adultPrice}
                   onChange={(e) => handleSessionChange(selectedSession, 'adultPrice', e.target.value)}
                   placeholder="25.00"
                 />
               </div>
               
               <div className="grid gap-2">
                 <Label htmlFor="childPrice">Child Price ($)</Label>
                 <Input
                   id="childPrice"
                   type="number"
                   min="0"
                   step="0.01"
                   value={settings.sessions[selectedSession]?.childPrice}
                   onChange={(e) => handleSessionChange(selectedSession, 'childPrice', e.target.value)}
                   placeholder="15.00"
                 />
               </div>
               
               <div className="grid gap-2">
                 <Label htmlFor="infantPrice">Infant Price ($)</Label>
                 <Input
                   id="infantPrice"
                   type="number"
                   min="0"
                   step="0.01"
                   value={settings.sessions[selectedSession]?.infantPrice}
                   onChange={(e) => handleSessionChange(selectedSession, 'infantPrice', e.target.value)}
                   placeholder="0.00"
                 />
               </div>
             </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Extra Drinks Pricing for {settings.sessions[selectedSession]?.name}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sessionAdultDrinkPrice">Adult Price ($)</Label>
                    <Input
                      id="sessionAdultDrinkPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.sessionSpecificExtraDrinksPricing?.[selectedSession]?.adultPrice || 0}
                      onChange={(e) => handleSessionSpecificExtraDrinksPricingChange(selectedSession, 'adultPrice', e.target.value)}
                      placeholder="5.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sessionChildDrinkPrice">Child Price ($)</Label>
                    <Input
                      id="sessionChildDrinkPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.sessionSpecificExtraDrinksPricing?.[selectedSession]?.childPrice || 0}
                      onChange={(e) => handleSessionSpecificExtraDrinksPricingChange(selectedSession, 'childPrice', e.target.value)}
                      placeholder="3.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sessionInfantDrinkPrice">Infant Price ($)</Label>
                    <Input
                      id="sessionInfantDrinkPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.sessionSpecificExtraDrinksPricing?.[selectedSession]?.infantPrice || 0}
                      onChange={(e) => handleSessionSpecificExtraDrinksPricingChange(selectedSession, 'infantPrice', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Items Limit for {settings.sessions[selectedSession]?.name}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sessionAdultItemsLimit">Adult Limit</Label>
                    <Input
                      id="sessionAdultItemsLimit"
                      type="number"
                      min="0"
                      value={settings.sessionSpecificItemsLimit?.[selectedSession]?.adultLimit || 0}
                      onChange={(e) => handleSessionSpecificItemsLimitChange(selectedSession, 'adultLimit', e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sessionChildItemsLimit">Child Limit</Label>
                    <Input
                      id="sessionChildItemsLimit"
                      type="number"
                      min="0"
                      value={settings.sessionSpecificItemsLimit?.[selectedSession]?.childLimit || 0}
                      onChange={(e) => handleSessionSpecificItemsLimitChange(selectedSession, 'childLimit', e.target.value)}
                      placeholder="4"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sessionInfantItemsLimit">Infant Limit</Label>
                    <Input
                      id="sessionInfantItemsLimit"
                      type="number"
                      min="0"
                      value={settings.sessionSpecificItemsLimit?.[selectedSession]?.infantLimit || 0}
                      onChange={(e) => handleSessionSpecificItemsLimitChange(selectedSession, 'infantLimit', e.target.value)}
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Special Table Item Limits */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Special Table Item Limits</CardTitle>
          <CardDescription>Configure item limits for specific tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="table-select">Select Table</Label>
              <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                <SelectTrigger id="table-select">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(table => (
                    <SelectItem key={table.id} value={table.id}>{table.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddSpecialTableItemLimit} disabled={!selectedTableId}>
              <Plus className="mr-2 h-4 w-4" />
              Add Special Limit
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          {/* Show limits for selected table only */}
          {selectedTableId && settings.specialTableItemsLimit && settings.specialTableItemsLimit.length > 0 ? (
            (() => {
              const selectedTableLimit = settings.specialTableItemsLimit.find(item => item.tableId === selectedTableId)
              return selectedTableLimit ? (
                <div className="space-y-4">
                  <div className="border rounded-md p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">{selectedTableLimit.tableName}</h3>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveSpecialTableItemLimit(selectedTableLimit.tableId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`adult-limit-${selectedTableLimit.tableId}`}>Adult Item Limit</Label>
                        <Input
                          id={`adult-limit-${selectedTableLimit.tableId}`}
                          type="number"
                          value={selectedTableLimit.itemsLimit.adultLimit}
                          onChange={(e) => handleSpecialTableItemLimitChange(selectedTableLimit.tableId, 'adultLimit', e.target.value)}
                          min={0}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`child-limit-${selectedTableLimit.tableId}`}>Child Item Limit</Label>
                        <Input
                          id={`child-limit-${selectedTableLimit.tableId}`}
                          type="number"
                          value={selectedTableLimit.itemsLimit.childLimit}
                          onChange={(e) => handleSpecialTableItemLimitChange(selectedTableLimit.tableId, 'childLimit', e.target.value)}
                          min={0}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`infant-limit-${selectedTableLimit.tableId}`}>Infant Item Limit</Label>
                        <Input
                          id={`infant-limit-${selectedTableLimit.tableId}`}
                          type="number"
                          value={selectedTableLimit.itemsLimit.infantLimit}
                          onChange={(e) => handleSpecialTableItemLimitChange(selectedTableLimit.tableId, 'infantLimit', e.target.value)}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No special limits configured for the selected table.</p>
              )
            })()
          ) : selectedTableId ? (
            <p className="text-muted-foreground">No special limits configured for the selected table.</p>
          ) : (
            <p className="text-muted-foreground">Select a table to view or configure special limits.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Settings Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Preview</CardTitle>
          <CardDescription>
            Current {settings.sessions[selectedSession]?.name?.toLowerCase()} session configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-lg">{settings.sessions[selectedSession]?.name}</h4>
              <div className="text-sm text-gray-600">
                {settings.sessions[selectedSession]?.startTime} - {settings.sessions[selectedSession]?.endTime} {settings.sessions[selectedSession]?.isActive ? '(Active)' : '(Inactive)'}
              </div>
              <div className="flex justify-between">
                <span>Adult:</span>
                <span className="font-semibold">${settings.sessions[selectedSession]?.adultPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Child:</span>
                <span className="font-semibold">${settings.sessions[selectedSession]?.childPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Infant:</span>
                <span className="font-semibold">${settings.sessions[selectedSession]?.infantPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Next order available in:</span>
                <span>{settings.sessions[selectedSession]?.nextOrderAvailableInMinutes} minutes</span>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="font-medium text-sm text-gray-700 mb-2">Extra Drinks Pricing for {settings.sessions[selectedSession]?.name}:</div>
                <div className="flex justify-between text-sm">
                  <span>Adults:</span>
                  <span className="font-semibold">${settings.sessionSpecificExtraDrinksPricing?.[selectedSession]?.adultPrice?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Children:</span>
                  <span className="font-semibold">${settings.sessionSpecificExtraDrinksPricing?.[selectedSession]?.childPrice?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Infants:</span>
                  <span className="font-semibold">${settings.sessionSpecificExtraDrinksPricing?.[selectedSession]?.infantPrice?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}