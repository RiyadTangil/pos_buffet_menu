import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Utility to resolve current session type from settings by time of day
function resolveSessionByTime(settings: any, time: Date): { key: 'breakfast'|'lunch'|'dinner', data: any } | null {
  if (!settings?.sessions) return null
  const currentMinute = time.getHours() * 60 + time.getMinutes()
  const sessions = [
    { key: 'breakfast' as const, data: settings.sessions.breakfast },
    { key: 'lunch' as const, data: settings.sessions.lunch },
    { key: 'dinner' as const, data: settings.sessions.dinner },
  ]
  for (const s of sessions) {
    if (!s.data?.isActive) continue
    const [sh, sm] = (s.data.startTime || '00:00').split(':').map(Number)
    const [eh, em] = (s.data.endTime || '23:59').split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (currentMinute >= start && currentMinute < end) return s
  }
  return null
}

function resolveCurrentSession(settings: any): { key: 'breakfast'|'lunch'|'dinner', data: any } | null {
  return resolveSessionByTime(settings, new Date())
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid table ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const groupType: 'same'|'different'|undefined = body?.groupType
    const paymentMethod: 'cash'|'card' = body?.paymentMethod === 'card' ? 'card' : 'cash'
    const waiterIdOverride: string | undefined = body?.waiterId
    const waiterNameOverride: string | undefined = body?.waiterName
    const isSplitFlag: boolean = !!body?.isSplit

    const db = await getDatabase()

    // Load table doc and number
    const tableDoc = await db.collection(COLLECTIONS.TABLES).findOne({ _id: new ObjectId(id) })
    if (!tableDoc) {
      return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 })
    }

    // Fetch active sessions for this table (optionally by groupType)
    const sessionQuery: any = { tableId: id, status: 'active' }
    if (groupType) sessionQuery.groupType = groupType
    const sessions = await db.collection('table_sessions').find(sessionQuery).toArray()

    // If no active sessions, still reset table info and return
    if (!sessions || sessions.length === 0) {
      await db.collection(COLLECTIONS.TABLES).updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'available', currentGuests: 0, updatedAt: new Date() } }
      )
      return NextResponse.json({ success: true, message: 'Table reset (no active sessions found).' })
    }

    // Group sessions by groupType when not provided, so we reset all groups
    const groups: Record<string, any[]> = {}
    for (const s of sessions) {
      const g = s.groupType || 'same'
      if (!groups[g]) groups[g] = []
      groups[g].push(s)
    }

    // Fetch buffet settings and resolve current session pricing
    const settingsDoc = await db.collection(COLLECTIONS.SETTINGS).findOne({ type: 'buffet' })
    const currentSession = resolveCurrentSession(settingsDoc)
    const sessionKey = (currentSession?.key || 'lunch') as 'breakfast'|'lunch'|'dinner'
    const basePricing = currentSession?.data || {
      adultPrice: 25,
      childPrice: 15,
      infantPrice: 0,
    }
    const extraDrinksPricing = (settingsDoc?.sessionSpecificExtraDrinksPricing?.[sessionKey]) || settingsDoc?.extraDrinksPricing || {
      adultPrice: settingsDoc?.extraDrinksPrice ?? 5,
      childPrice: Math.round(((settingsDoc?.extraDrinksPrice ?? 5) * 0.6)),
      infantPrice: 0,
    }

    const createdPayments: any[] = []

    // For each group, aggregate guests, sum orders, create payment, end+clear sessions
    for (const [gKey, groupSessions] of Object.entries(groups)) {
      
      // Determine pricing based on earliest session start time in the group
      let pricingSessionKey = sessionKey
      let pricingBase = basePricing
      let pricingExtraDrinks = extraDrinksPricing

      // Find earliest session in group
      if (groupSessions.length > 0) {
        const earliestSession = groupSessions.reduce((prev, curr) => 
            new Date(prev.createdAt).getTime() < new Date(curr.createdAt).getTime() ? prev : curr
        );
        
        if (earliestSession && earliestSession.createdAt) {
             const sessionTime = new Date(earliestSession.createdAt)
             const historicSession = resolveSessionByTime(settingsDoc, sessionTime)
             if (historicSession) {
                pricingSessionKey = historicSession.key as 'breakfast'|'lunch'|'dinner'
                pricingBase = historicSession.data
                pricingExtraDrinks = (settingsDoc?.sessionSpecificExtraDrinksPricing?.[pricingSessionKey]) || settingsDoc?.extraDrinksPricing || {
                  adultPrice: settingsDoc?.extraDrinksPrice ?? 5,
                  childPrice: Math.round(((settingsDoc?.extraDrinksPrice ?? 5) * 0.6)),
                  infantPrice: 0,
                }
             }
        }
      }

      const aggregatedGuests = groupSessions.reduce((acc, s: any) => {
        const gc = s.guestCounts || { adults: 0, children: 0, infants: 0, includeDrinks: false }
        acc.adults += gc.adults || 0
        acc.children += gc.children || 0
        acc.infants += gc.infants || 0
        acc.includeDrinks = acc.includeDrinks || !!gc.includeDrinks
        return acc
      }, { adults: 0, children: 0, infants: 0, includeDrinks: false })

      // Fetch orders linked to these sessions
      const sessionIds = groupSessions.map(s => s._id?.toString()).filter(Boolean)
      const ordersCursor = db.collection(COLLECTIONS.ORDERS).find({ tableSessionId: { $in: sessionIds } })
      const orders = await ordersCursor.toArray()

      // Calculate total as per /menu/session/orders
      let total = 0
      total += (aggregatedGuests.adults * (pricingBase.adultPrice || 0))
      total += (aggregatedGuests.children * (pricingBase.childPrice || 0))
      total += (aggregatedGuests.infants * (pricingBase.infantPrice || 0))
      if (aggregatedGuests.includeDrinks) {
        total += (aggregatedGuests.adults * (pricingExtraDrinks.adultPrice || 0))
        total += (aggregatedGuests.children * (pricingExtraDrinks.childPrice || 0))
        total += (aggregatedGuests.infants * (pricingExtraDrinks.infantPrice || 0))
      }
      for (const order of orders) {
        const items = Array.isArray(order.items) ? order.items : []
        for (const item of items) {
          const price = item?.price || 0
          const qty = item?.quantity || 1
          total += price * qty
        }
      }

      const now = new Date()
      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const mongoPayment = {
        paymentId,
        tableId: id,
        tableNumber: tableDoc.number,
        waiterId: waiterIdOverride || 'admin-reset',
        waiterName: waiterNameOverride || 'Admin Reset',
        totalAmount: total,
        tipAmount: 0,
        sessionType: pricingSessionKey,
        groupType: gKey,
        sessionData: {
          adults: aggregatedGuests.adults,
          children: aggregatedGuests.children,
          infants: aggregatedGuests.infants,
          extraDrinks: aggregatedGuests.includeDrinks,
          adultPrice: pricingBase.adultPrice || 25,
          childPrice: pricingBase.childPrice || 15,
          infantPrice: pricingBase.infantPrice || 0,
          drinkPrice: settingsDoc?.extraDrinksPrice ?? 5,
          extraDrinksPricing: pricingExtraDrinks,
        },
        paymentDate: now.toISOString().split('T')[0],
        paymentTime: now.toTimeString().split(' ')[0],
        status: 'completed',
        paymentMethod: paymentMethod,
        isSplit: isSplitFlag,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      // Mark sessions as ended
      await db.collection('table_sessions').updateMany({ _id: { $in: groupSessions.map(s => s._id) } }, { $set: { sessionEnded: true, updatedAt: now.toISOString() } })

      // Insert payment
      const insertRes = await db.collection(COLLECTIONS.PAYMENTS).insertOne(mongoPayment)
      createdPayments.push({ id: insertRes.insertedId.toString(), ...mongoPayment })

      // Delete sessions and broadcast null event for table room
      await db.collection('table_sessions').deleteMany({ _id: { $in: groupSessions.map(s => s._id) } })

      try {
        const roomName = gKey ? `table-${id}-${gKey}` : `table-${id}`
        await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002/api'}/socket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'broadcast', room: roomName, event: 'tableSessionUpdate', data: null })
        })
      } catch (broadcastErr) {
        console.error('Reset broadcast error:', broadcastErr)
      }
    }

    // Reset table document
    await db.collection(COLLECTIONS.TABLES).updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'available', currentGuests: 0, updatedAt: new Date().toISOString() } }
    )

    // Notify tables list watchers
    try {
      await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002/api'}/socket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcastTablesUpdate', payload: { type: 'refresh' } })
      })
    } catch (broadcastTablesErr) {
      // Non-fatal
      console.error('Global tables broadcast error:', broadcastTablesErr)
    }

    return NextResponse.json({ success: true, message: 'Table reset completed', data: { payments: createdPayments } })
  } catch (error) {
    console.error('Error resetting table:', error)
    return NextResponse.json({ success: false, error: 'Failed to reset table' }, { status: 500 })
  }
}