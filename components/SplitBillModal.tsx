"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Calculator, ShoppingCart, Check, X } from "lucide-react"

interface SplitBillItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  selected: boolean
  assignedTo?: number // Customer index
}

interface SplitBillModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (splits: SplitResult[]) => void
  orders: any[]
  sessionData: {
    adults: number
    children: number
    infants: number
    adultPrice: number
    childPrice: number
    infantPrice: number
    extraDrinks: boolean
    drinkPrice?: number
    extraDrinksPricing?: {
      adultPrice: number
      childPrice: number
      infantPrice: number
    }
  }
  totalAmount: number
}

interface SplitResult {
  customerIndex: number
  customerName: string
  items: SplitBillItem[]
  sessionCharges: {
    adults: number
    children: number
    infants: number
  }
  total: number
}

export default function SplitBillModal({
  isOpen,
  onClose,
  onConfirm,
  orders,
  sessionData,
  totalAmount
}: SplitBillModalProps) {
  const [splitMethod, setSplitMethod] = useState<'equal' | 'items'>('equal')
  const [numberOfSplits, setNumberOfSplits] = useState(2)
  const [items, setItems] = useState<SplitBillItem[]>([])
  const [customerNames, setCustomerNames] = useState<string[]>([])
  const [splits, setSplits] = useState<SplitResult[]>([])

  // Calculate session charges (buffet prices)
  const sessionCharges = {
    adult: sessionData.adults * sessionData.adultPrice,
    child: sessionData.children * sessionData.childPrice,
    infant: sessionData.infants * sessionData.infantPrice,
    drinks: sessionData.extraDrinks ? 
      (sessionData.extraDrinksPricing ? 
        (sessionData.adults * sessionData.extraDrinksPricing.adultPrice + 
         sessionData.children * sessionData.extraDrinksPricing.childPrice + 
         sessionData.infants * sessionData.extraDrinksPricing.infantPrice) :
        (sessionData.adults + sessionData.children) * (sessionData.drinkPrice || 5)) : 0
  }

  const totalSessionCharges = sessionCharges.adult + sessionCharges.child + sessionCharges.infant + sessionCharges.drinks

  // Initialize items from orders
  useEffect(() => {
    if (orders && orders.length > 0) {
      const orderItems: SplitBillItem[] = []
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any, index: number) => {
            orderItems.push({
              id: `${order.id}-${index}`,
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              category: item.category || 'Other',
              selected: false
            })
          })
        }
      })
      setItems(orderItems)
    }
  }, [orders])

  // Initialize customer names
  useEffect(() => {
    const names = Array.from({ length: numberOfSplits }, (_, i) => `Customer ${i + 1}`)
    setCustomerNames(names)
  }, [numberOfSplits])

  // Calculate equal splits
  const calculateEqualSplits = () => {
    const splitAmount = totalAmount / numberOfSplits
    const sessionSplitAmount = totalSessionCharges / numberOfSplits
    
    const newSplits: SplitResult[] = customerNames.map((name, index) => ({
      customerIndex: index,
      customerName: name,
      items: [],
      sessionCharges: {
        adults: Math.round((sessionData.adults / numberOfSplits) * 100) / 100,
        children: Math.round((sessionData.children / numberOfSplits) * 100) / 100,
        infants: Math.round((sessionData.infants / numberOfSplits) * 100) / 100
      },
      total: Math.round(splitAmount * 100) / 100
    }))
    
    setSplits(newSplits)
  }

  // Calculate item-based splits
  const calculateItemSplits = () => {
    const newSplits: SplitResult[] = customerNames.map((name, index) => {
      const customerItems = items.filter(item => item.assignedTo === index)
      const itemsTotal = customerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      return {
        customerIndex: index,
        customerName: name,
        items: customerItems,
        sessionCharges: {
          adults: 0,
          children: 0,
          infants: 0
        },
        total: itemsTotal
      }
    })
    
    // Distribute session charges equally among customers who have items
    const customersWithItems = newSplits.filter(split => split.items.length > 0)
    if (customersWithItems.length > 0) {
      const sessionPerCustomer = totalSessionCharges / customersWithItems.length
      customersWithItems.forEach(split => {
        split.sessionCharges = {
          adults: sessionData.adults / customersWithItems.length,
          children: sessionData.children / customersWithItems.length,
          infants: sessionData.infants / customersWithItems.length
        }
        split.total += sessionPerCustomer
        split.total = Math.round(split.total * 100) / 100
      })
    }
    
    setSplits(newSplits)
  }

  // Handle item assignment
  const assignItemToCustomer = (itemId: string, customerIndex: number) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, assignedTo: item.assignedTo === customerIndex ? undefined : customerIndex }
        : item
    ))
  }

  // Handle customer name change
  const updateCustomerName = (index: number, name: string) => {
    setCustomerNames(prev => prev.map((n, i) => i === index ? name : n))
  }

  // Handle confirm
  const handleConfirm = () => {
    if (splitMethod === 'equal') {
      calculateEqualSplits()
    } else {
      calculateItemSplits()
    }
    
    // Validate splits
    const validSplits = splits.filter(split => split.total > 0)
    if (validSplits.length === 0) {
      alert('Please assign items to customers or use equal split method')
      return
    }
    
    onConfirm(validSplits)
  }

  // Calculate totals for validation
  const assignedItemsTotal = items
    .filter(item => item.assignedTo !== undefined)
    .reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const unassignedItemsTotal = items
    .filter(item => item.assignedTo === undefined)
    .reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Split Bill - £{totalAmount}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Split Method Selection */}
          <div className="flex gap-4">
            <Button
              variant={splitMethod === 'equal' ? 'default' : 'outline'}
              onClick={() => setSplitMethod('equal')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Equal Parts
            </Button>
            {/* <Button
              variant={splitMethod === 'items' ? 'default' : 'outline'}
              onClick={() => setSplitMethod('items')}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              By Items
            </Button> */}
          </div>

          {/* Number of Splits (for equal method) */}
          {splitMethod === 'equal' && (
            <div className="space-y-2">
              <Label>Number of People</Label>
              <Input
                type="number"
                min="2"
                max="10"
                value={numberOfSplits}
                onChange={(e) => setNumberOfSplits(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-32"
              />
            </div>
          )}

          {/* Customer Names */}
          <div className="space-y-2">
            <Label>Customer Names</Label>
            <div className="grid grid-cols-2 gap-2">
              {customerNames.map((name, index) => (
                <Input
                  key={index}
                  value={name}
                  onChange={(e) => updateCustomerName(index, e.target.value)}
                  placeholder={`Customer ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Item Assignment (for items method) */}
          {splitMethod === 'items' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Assign Items to Customers</Label>
                <div className="text-sm text-gray-600">
                  Assigned: £{assignedItemsTotal.toFixed(2)} | 
                  Unassigned: £{unassignedItemsTotal.toFixed(2)}
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity}x £{item.price} = £{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {customerNames.map((name, customerIndex) => (
                          <Button
                            key={customerIndex}
                            size="sm"
                            variant={item.assignedTo === customerIndex ? 'default' : 'outline'}
                            onClick={() => assignItemToCustomer(item.id, customerIndex)}
                            className="text-xs"
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Session Charges Breakdown */}
          <Card className="p-4 bg-amber-50">
            <div className="space-y-2">
              <h4 className="font-medium text-amber-800">Session Charges (Buffet)</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Adults: {sessionData.adults} × £{sessionData.adultPrice} = £{sessionCharges.adult}</div>
                <div>Children: {sessionData.children} × £{sessionData.childPrice} = £{sessionCharges.child}</div>
                <div>Infants: {sessionData.infants} × £{sessionData.infantPrice} = £{sessionCharges.infant}</div>
                {sessionData.extraDrinks && (
                  <div>Extra Drinks: £{sessionCharges.drinks}</div>
                )}
              </div>
              <div className="font-medium text-amber-800 pt-2 border-t">
                Total Session: £{totalSessionCharges.toFixed(2)}
              </div>
            </div>
          </Card>

          {/* Preview Splits */}
          {splitMethod === 'equal' && (
            <div className="space-y-2">
              <Label>Split Preview</Label>
              <div className="grid grid-cols-2 gap-2">
                {customerNames.map((name, index) => (
                  <Card key={index} className="p-3">
                    <div className="font-medium">{name}</div>
                    <div className="text-lg font-bold text-green-600">
                      £{(totalAmount / numberOfSplits).toFixed(2)}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Confirm Split
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}