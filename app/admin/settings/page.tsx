"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { Loader2, Save, DollarSign, Clock, Users } from "lucide-react"
import { getBuffetSettings, updateBuffetSettings, BuffetSettings } from '@/lib/api/settings'

export default function SettingsPage() {
  const [settings, setSettings] = useState<BuffetSettings>({
    sessionPrice: 0,
    sessionAmount: 0,
    sessionAdultPrice: 25,
    sessionChildPrice: 15,
    extraDrinksPrice: 5,
    nextOrderAvailableInMinutes: 30
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await getBuffetSettings()
      if (response.success && response.data) {
        setSettings(response.data)
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

  const handleInputChange = (field: keyof BuffetSettings, value: string) => {
    const numericValue = parseFloat(value) || 0
    setSettings(prev => ({
      ...prev,
      [field]: numericValue
    }))
  }

  const handleSave = async () => {
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
        <Button onClick={handleSave} disabled={saving}>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Session Pricing
            </CardTitle>
            <CardDescription>
              Configure pricing for buffet sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sessionPrice">Base Session Price ($)</Label>
              <Input
                id="sessionPrice"
                type="number"
                min="0"
                step="0.01"
                value={settings.sessionPrice}
                onChange={(e) => handleInputChange('sessionPrice', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sessionAmount">Session Amount ($)</Label>
              <Input
                id="sessionAmount"
                type="number"
                min="0"
                step="0.01"
                value={settings.sessionAmount}
                onChange={(e) => handleInputChange('sessionAmount', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Separator />
            <div className="grid gap-2">
              <Label htmlFor="sessionAdultPrice">Adult Price ($)</Label>
              <Input
                id="sessionAdultPrice"
                type="number"
                min="0"
                step="0.01"
                value={settings.sessionAdultPrice}
                onChange={(e) => handleInputChange('sessionAdultPrice', e.target.value)}
                placeholder="25.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sessionChildPrice">Child Price ($)</Label>
              <Input
                id="sessionChildPrice"
                type="number"
                min="0"
                step="0.01"
                value={settings.sessionChildPrice}
                onChange={(e) => handleInputChange('sessionChildPrice', e.target.value)}
                placeholder="15.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Services & Timing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Additional Services & Timing
            </CardTitle>
            <CardDescription>
              Configure extra services and order timing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="extraDrinksPrice">Extra Drinks Price ($)</Label>
              <Input
                id="extraDrinksPrice"
                type="number"
                min="0"
                step="0.01"
                value={settings.extraDrinksPrice}
                onChange={(e) => handleInputChange('extraDrinksPrice', e.target.value)}
                placeholder="5.00"
              />
            </div>
            <Separator />
            <div className="grid gap-2">
              <Label htmlFor="nextOrderAvailableInMinutes" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Next Order Available (Minutes)
              </Label>
              <Input
                id="nextOrderAvailableInMinutes"
                type="number"
                min="1"
                value={settings.nextOrderAvailableInMinutes}
                onChange={(e) => handleInputChange('nextOrderAvailableInMinutes', e.target.value)}
                placeholder="30"
              />
              <p className="text-sm text-gray-500">
                Time customers must wait before placing their next order
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Preview</CardTitle>
          <CardDescription>
            Preview of how these settings will appear to customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Adult Buffet Session:</span>
              <span className="font-semibold">${settings.sessionAdultPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Child Buffet Session:</span>
              <span className="font-semibold">${settings.sessionChildPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Extra Drinks:</span>
              <span className="font-semibold">${settings.extraDrinksPrice.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Next order available in:</span>
              <span>{settings.nextOrderAvailableInMinutes} minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}