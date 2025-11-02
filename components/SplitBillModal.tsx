"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Calculator, ShoppingCart, Check, X, CreditCard, DollarSign } from "lucide-react"

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
  paymentMethod: 'cash' | 'card' // Add payment method to split result
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
  const [numberOfSplits, setNumberOfSplits] = useState(sessionData.adults > 1 ? sessionData.adults : 2)
  const [items, setItems] = useState<SplitBillItem[]>([])
  const [customerNames, setCustomerNames] = useState<string[]>([])
  const [paymentMethods, setPaymentMethods] = useState<('cash' | 'card')[]>([]) // Add payment methods state
  const [splits, setSplits] = useState<SplitResult[]>([])

  useEffect(()=>{setNumberOfSplits(sessionData.adults )},[sessionData])
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

  // Initialize customer names and payment methods
  useEffect(() => {
    const names = Array.from({ length: numberOfSplits }, (_, i) => `Adult ${i + 1}`)
    const methods = Array.from({ length: numberOfSplits }, () => 'cash' as 'cash' | 'card')
    setCustomerNames(names)
    setPaymentMethods(methods)
  }, [numberOfSplits])

  // Calculate equal splits
  const calculateEqualSplits = () => {
    const splitAmount = totalAmount / numberOfSplits
    const sessionSplitAmount = totalSessionCharges / numberOfSplits
    
    const newSplits: SplitResult[] = customerNames.map((name, index) => ({
      customerIndex: index,
      customerName: name,
      paymentMethod: paymentMethods[index], // Include payment method
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
        paymentMethod: paymentMethods[index], // Include payment method
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

  // Handle payment method change
  const updatePaymentMethod = (index: number, method: 'cash' | 'card') => {
    setPaymentMethods(prev => prev.map((m, i) => i === index ? method : m))
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
            <Button
              variant={splitMethod === 'items' ? 'default' : 'outline'}
              onClick={() => setSplitMethod('items')}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              By Items
            </Button>
          </div>

          {/* Number of Splits (for equal method) */}
          {splitMethod === 'equal' && (
            <div className="space-y-2">
              <Label>Number of Adults</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={numberOfSplits}
                onChange={(e) => setNumberOfSplits(Math.max(1, parseInt(e.target.value) || sessionData.adults))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Based on {sessionData.adults} adult{sessionData.adults !== 1 ? 's' : ''} in this session
              </p>
            </div>
          )}

          {/* Customer Names and Payment Methods */}
          <div className="space-y-4">
            <Label>Adult Customer Details</Label>
            <div className="space-y-3">
              {customerNames.map((name, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Adult Customer Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => updateCustomerName(index, e.target.value)}
                        placeholder={`Adult ${index + 1}`}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Payment Method</Label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={paymentMethods[index] === 'cash' ? 'default' : 'outline'}
                          onClick={() => updatePaymentMethod(index, 'cash')}
                          className={paymentMethods[index] === 'cash' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Cash
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={paymentMethods[index] === 'card' ? 'default' : 'outline'}
                          onClick={() => updatePaymentMethod(index, 'card')}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Card
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
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
              <div className="grid grid-cols-1 gap-3">
                {customerNames.map((name, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {paymentMethods[index] === 'cash' ? (
                            <><DollarSign className="w-4 h-4" /> Cash</>
                          ) : (
                            <><CreditCard className="w-4 h-4" /> Card</>
                          )}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        £{(totalAmount / numberOfSplits).toFixed(2)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}  className="bg-green-600 hover:bg-green-700 text-white">
              <X className="w-4 h-4 mr-2" />
              ok
            </Button>
            {/* <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Confirm Split
            </Button> */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}