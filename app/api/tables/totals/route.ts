import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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

// Resolve current session type by time window using buffet settings
function resolveCurrentSession(settings: any): { key: 'breakfast'|'lunch'|'dinner', data: any } | null {
  return resolveSessionByTime(settings, new Date())
}

// GET /api/tables/totals - compute current bill total for each table with active sessions
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()

    // Fetch buffet settings and resolve session-specific pricing
    const settingsDoc = await db.collection(COLLECTIONS.SETTINGS).findOne({ type: 'buffet' })
    const currentSession = resolveCurrentSession(settingsDoc)
    const sessionKey = (currentSession?.key || 'lunch') as 'breakfast'|'lunch'|'dinner'
    const basePricing = currentSession?.data || { adultPrice: 25, childPrice: 15, infantPrice: 0 }
    const extraDrinksPricing = (settingsDoc?.sessionSpecificExtraDrinksPricing?.[sessionKey]) || settingsDoc?.extraDrinksPricing || {
      adultPrice: settingsDoc?.extraDrinksPrice ?? 5,
      childPrice: Math.round(((settingsDoc?.extraDrinksPrice ?? 5) * 0.6)),
      infantPrice: 0,
    }

    // Find all active table sessions
    const sessionsCursor = db.collection('table_sessions').find({ status: 'active' })
    const sessions = await sessionsCursor.toArray()

    // Group sessions by tableId
    const sessionsByTable: Record<string, any[]> = {}
    for (const s of sessions) {
      const tid = s.tableId
      if (!tid) continue
      if (!sessionsByTable[tid]) sessionsByTable[tid] = []
      sessionsByTable[tid].push(s)
    }

    const results: any[] = []
    const tableIds = Object.keys(sessionsByTable)

    // Preload table numbers for involved tables
    const tableDocs = await db.collection(COLLECTIONS.TABLES).find({ _id: { $in: tableIds.map(id => new ObjectId(id)) } }).toArray()
    const tableNumberById: Record<string, number> = {}
    for (const tbl of tableDocs) {
      tableNumberById[tbl._id.toString()] = tbl.number
    }

    for (const tableId of tableIds) {
      const groupSessions = sessionsByTable[tableId]
      
      // Determine pricing based on earliest session start time for this table
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

      // Aggregate guest counts across sessions
      const aggregatedGuests = groupSessions.reduce((acc, s: any) => {
        const gc = s.guestCounts || { adults: 0, children: 0, infants: 0, includeDrinks: false }
        acc.adults += gc.adults || 0
        acc.children += gc.children || 0
        acc.infants += gc.infants || 0
        acc.includeDrinks = acc.includeDrinks || !!gc.includeDrinks
        return acc
      }, { adults: 0, children: 0, infants: 0, includeDrinks: false })

      // Fetch orders for all these sessions
      const sessionIds = groupSessions.map(s => s._id?.toString()).filter(Boolean)
      const orders = await db.collection(COLLECTIONS.ORDERS).find({ tableSessionId: { $in: sessionIds } }).toArray()

      // Compute total = buffet + optional drinks + orders items
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

      results.push({
        tableId,
        tableNumber: tableNumberById[tableId] ?? undefined,
        totalAmount: total,
        sessionType: pricingSessionKey,
      })
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Error computing table totals:', error)
    return NextResponse.json({ success: false, error: 'Failed to compute table totals' }, { status: 500 })
  }
}