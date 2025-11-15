"use client"

import { useState, useEffect, useMemo } from "react"
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

interface SessionUnit {
  id: string
  type: 'adult' | 'child' | 'infant' | 'drink'
  label: string
  price: number
  assignedTo?: number
}

interface SplitBillModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (splits: SplitResult[]) => void
  onChange?: (data: { hasChanges: boolean; numberOfSplits: number; splitMethod: 'equal' | 'items' }) => void
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
  onChange,
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
  const [hasChanges, setHasChanges] = useState(false)
  const [sessionUnits, setSessionUnits] = useState<SessionUnit[]>([])

  // Track initial defaults to compare for changes
  useEffect(() => {
    // Reset change tracking when modal opens
    if (isOpen) {
      setHasChanges(false)
      if (onChange) {
        onChange({ hasChanges: false, numberOfSplits, splitMethod })
      }
    }
  }, [isOpen])

  const markChanged = () => {
    if (!hasChanges) {
      setHasChanges(true)
    }
    if (onChange) {
      onChange({ hasChanges: true, numberOfSplits, splitMethod })
    }
  }

  useEffect(() => { setNumberOfSplits(sessionData.adults) }, [sessionData.adults])
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

  // Live preview for item-based splits (industry-standard per-person summary)
  const itemPreviewSplits = useMemo(() => {
    // New behavior: session charges are assignable units; preview sums assigned units per customer
    const baseSplits = customerNames.map((name, index) => {
      const customerItems = items.filter(item => item.assignedTo === index)
      const itemsTotal = customerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const itemsSubtotal = Math.round(itemsTotal * 100) / 100

      const sessionAssigned = sessionUnits
        .filter(u => u.assignedTo === index)
        .reduce((sum, u) => sum + u.price, 0)
      const sessionSubtotal = Math.round(sessionAssigned * 100) / 100

      const total = Math.round((itemsSubtotal + sessionSubtotal) * 100) / 100
      return {
        customerIndex: index,
        customerName: name,
        paymentMethod: paymentMethods[index],
        items: customerItems,
        itemsSubtotal,
        sessionShare: sessionSubtotal,
        total,
      }
    })

    return baseSplits
  }, [customerNames, items, paymentMethods, sessionUnits])

  // Initialize items from orders
  useEffect(() => {
    if (orders && orders.length > 0) {
      const orderItems: SplitBillItem[] = []
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any, index: number) => {
            const price = item.price || 0
            const isFree = item.isFree === true || price <= 0
            if (isFree) {
              return // Skip free items; only show paid items
            }
            orderItems.push({
              id: `${order.id}-${index}`,
              name: item.name,
              price,
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

  // Build assignable session units from sessionData
  useEffect(() => {
    const units: SessionUnit[] = []
    // Buffet adults
    for (let i = 1; i <= (sessionData.adults || 0); i++) {
      units.push({
        id: `adult-${i}`,
        type: 'adult',
        label: `Buffet (Adult ${i})`,
        price: sessionData.adultPrice || 0,
      })
    }
    // Buffet children
    for (let i = 1; i <= (sessionData.children || 0); i++) {
      units.push({
        id: `child-${i}`,
        type: 'child',
        label: `Buffet (Child ${i})`,
        price: sessionData.childPrice || 0,
      })
    }
    // Buffet infants
    for (let i = 1; i <= (sessionData.infants || 0); i++) {
      units.push({
        id: `infant-${i}`,
        type: 'infant',
        label: `Buffet (Infant ${i})`,
        price: sessionData.infantPrice || 0,
      })
    }
    // Extra drinks
    if (sessionData.extraDrinks) {
      if (sessionData.extraDrinksPricing) {
        for (let i = 1; i <= (sessionData.adults || 0); i++) {
          units.push({
            id: `drink-adult-${i}`,
            type: 'drink',
            label: `Drink (Adult ${i})`,
            price: sessionData.extraDrinksPricing.adultPrice || 0,
          })
        }
        for (let i = 1; i <= (sessionData.children || 0); i++) {
          units.push({
            id: `drink-child-${i}`,
            type: 'drink',
            label: `Drink (Child ${i})`,
            price: sessionData.extraDrinksPricing.childPrice || 0,
          })
        }
        for (let i = 1; i <= (sessionData.infants || 0); i++) {
          units.push({
            id: `drink-infant-${i}`,
            type: 'drink',
            label: `Drink (Infant ${i})`,
            price: sessionData.extraDrinksPricing.infantPrice || 0,
          })
        }
      } else {
        const drinkUnitPrice = sessionData.drinkPrice || 5
        for (let i = 1; i <= (sessionData.adults || 0); i++) {
          units.push({
            id: `drink-adult-${i}`,
            type: 'drink',
            label: `Drink (Adult ${i})`,
            price: drinkUnitPrice,
          })
        }
        for (let i = 1; i <= (sessionData.children || 0); i++) {
          units.push({
            id: `drink-child-${i}`,
            type: 'drink',
            label: `Drink (Child ${i})`,
            price: drinkUnitPrice,
          })
        }
      }
    }

    setSessionUnits(units)
  }, [
    sessionData.adults,
    sessionData.children,
    sessionData.infants,
    sessionData.adultPrice,
    sessionData.childPrice,
    sessionData.infantPrice,
    sessionData.extraDrinks,
    sessionData.drinkPrice,
    sessionData.extraDrinksPricing?.adultPrice,
    sessionData.extraDrinksPricing?.childPrice,
    sessionData.extraDrinksPricing?.infantPrice,
  ])

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
    return newSplits
  }

  // Calculate item-based splits
  const calculateItemSplits = () => {
    // New: session charges assigned per adult via sessionUnits
    const newSplits: SplitResult[] = customerNames.map((name, index) => {
      const customerItems = items.filter(item => item.assignedTo === index)
      const itemsTotal = customerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      const sessionAssignedUnits = sessionUnits.filter(u => u.assignedTo === index)
      const sessionTotal = sessionAssignedUnits.reduce((sum, u) => sum + u.price, 0)

      const adultsCount = sessionAssignedUnits.filter(u => u.type === 'adult').length
      const childrenCount = sessionAssignedUnits.filter(u => u.type === 'child').length
      const infantsCount = sessionAssignedUnits.filter(u => u.type === 'infant').length

      return {
        customerIndex: index,
        customerName: name,
        paymentMethod: paymentMethods[index],
        items: customerItems,
        sessionCharges: {
          adults: adultsCount,
          children: childrenCount,
          infants: infantsCount,
        },
        total: Math.round((itemsTotal + sessionTotal) * 100) / 100
      }
    })

    setSplits(newSplits)
    return newSplits
  }

  // Handle item assignment
  const assignItemToCustomer = (itemId: string, customerIndex: number) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, assignedTo: item.assignedTo === customerIndex ? undefined : customerIndex }
        : item
    ))
    markChanged()
  }

  // Handle session unit assignment
  const assignSessionUnitToCustomer = (unitId: string, customerIndex: number) => {
    setSessionUnits(prev => prev.map(u =>
      u.id === unitId
        ? { ...u, assignedTo: u.assignedTo === customerIndex ? undefined : customerIndex }
        : u
    ))
    markChanged()
  }

  // Handle customer name change
  const updateCustomerName = (index: number, name: string) => {
    setCustomerNames(prev => prev.map((n, i) => i === index ? name : n))
    markChanged()
  }

  // Handle payment method change
  const updatePaymentMethod = (index: number, method: 'cash' | 'card') => {
    setPaymentMethods(prev => prev.map((m, i) => i === index ? method : m))
    markChanged()
  }

  // Handle confirm
  const handleConfirm = () => {
    if (splitMethod === 'items' && !isReadyToConfirm) {
      return
    }
    const computedSplits = splitMethod === 'equal' ? calculateEqualSplits() : calculateItemSplits()
    
    // Always include all adults, even if total is 0 or no items
    const normalizedSplits = computedSplits.map((split, idx) => ({
      ...split,
      paymentMethod: split.paymentMethod || 'cash',
      items: Array.isArray(split.items) ? split.items : []
    }))
    console.log("normalizedSplits => ",normalizedSplits)
    
    onConfirm(normalizedSplits)
  }

  // Calculate totals for validation
  const assignedItemsTotal = items
    .filter(item => item.assignedTo !== undefined)
    .reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const unassignedItemsTotal = items
    .filter(item => item.assignedTo === undefined)
    .reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const assignedSessionTotal = sessionUnits
    .filter(u => u.assignedTo !== undefined)
    .reduce((sum, u) => sum + u.price, 0)

  const unassignedSessionTotal = sessionUnits
    .filter(u => u.assignedTo === undefined)
    .reduce((sum, u) => sum + u.price, 0)

  // Confirm enabled only when all items and session charges are assigned (for items method)
  const isReadyToConfirm = splitMethod === 'items'
    ? (unassignedItemsTotal === 0 && unassignedSessionTotal === 0)
    : true

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
              onClick={() => { setSplitMethod('equal'); markChanged() }}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Equal Parts
            </Button>
            <Button
              variant={splitMethod === 'items' ? 'default' : 'outline'}
              onClick={() => { setSplitMethod('items'); markChanged() }}
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
                onChange={(e) => { setNumberOfSplits(Math.max(1, parseInt(e.target.value) || sessionData.adults)); markChanged() }}
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

              {/* Session Charge Assignment */}
              <div className="space-y-2">
                <div className="flex justify-between items-center sticky top-0 z-10 bg-white py-2 border-b">
                  <Label>Assign Session Charges (Buffet / Drinks)</Label>
                  <div className="text-sm text-gray-600">
                    Assigned: £{assignedSessionTotal.toFixed(2)} | 
                    Unassigned: £{unassignedSessionTotal.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sessionUnits.map((u) => (
                    <Card key={u.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium">{u.label}</div>
                          <div className="text-sm text-gray-600">£{u.price.toFixed(2)}</div>
                        </div>
                        <div className="flex gap-2">
                          {customerNames.map((name, customerIndex) => (
                            <Button
                              key={customerIndex}
                              type="button"
                              size="sm"
                              variant={u.assignedTo === customerIndex ? 'default' : 'outline'}
                              onClick={() => assignSessionUnitToCustomer(u.id, customerIndex)}
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
                {unassignedSessionTotal > 0 && (
                  <p className="text-xs text-amber-700 sticky bottom-0 z-10 bg-white py-2">
                    £{unassignedSessionTotal.toFixed(2)} of session charges are unassigned. Assign them to include in totals.
                  </p>
                )}
              </div>

              {/* Industry-standard per-person preview for item-based splits */}
              <div className="space-y-2">
                <Label>Split Preview</Label>
                {unassignedItemsTotal > 0 && (
                  <p className="text-xs text-amber-700">
                    £{unassignedItemsTotal.toFixed(2)} of items are unassigned. Assign them to include in totals.
                  </p>
                )}
                {unassignedSessionTotal > 0 && (
                  <p className="text-xs text-amber-700">
                    £{unassignedSessionTotal.toFixed(2)} of session charges are unassigned. Assign them to include in totals.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {itemPreviewSplits.map((split) => (
                    <Card key={split.customerIndex} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{split.customerName}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {split.paymentMethod === 'cash' ? (
                              <><DollarSign className="w-4 h-4" /> Cash</>
                            ) : (
                              <><CreditCard className="w-4 h-4" /> Card</>
                            )}
                            <span className="ml-2">• {split.items.length} item{split.items.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          £{split.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Items: £{split.itemsSubtotal.toFixed(2)}
                        <span className="ml-2">• Session: £{split.sessionShare.toFixed(2)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
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
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isReadyToConfirm} className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:hover:bg-green-600">
              <Check className="w-4 h-4 mr-2" />
              Confirm Split
            </Button>
            {/* {!isReadyToConfirm && splitMethod === 'items' && (
              <p className="text-xs text-amber-700">
                Assign all items and all session charges to enable confirmation.
              </p>
            )} */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}