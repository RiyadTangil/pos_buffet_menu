import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

function resolveCurrentSession(settings: any): { key: 'breakfast'|'lunch'|'dinner', data: any } | null {
  if (!settings?.sessions) return null
  const now = new Date()
  const currentMinute = now.getHours() * 60 + now.getMinutes()
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

function buildSettingsFallback(settingsDoc: any) {
  const extraDrinksPrice = settingsDoc?.extraDrinksPrice ?? 5
  return {
    sessions: settingsDoc?.sessions ?? {
      breakfast: {
        name: 'Breakfast',
        startTime: '08:00',
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
    extraDrinksPrice,
    extraDrinksPricing: settingsDoc?.extraDrinksPricing ?? {
      adultPrice: extraDrinksPrice,
      childPrice: Math.round(extraDrinksPrice * 0.6),
      infantPrice: 0
    },
    sessionSpecificExtraDrinksPricing: settingsDoc?.sessionSpecificExtraDrinksPricing ?? {
      breakfast: { adultPrice: 5, childPrice: 3, infantPrice: 0 },
      lunch: { adultPrice: 5, childPrice: 3, infantPrice: 0 },
      dinner: { adultPrice: 5, childPrice: 3, infantPrice: 0 }
    },
    itemsLimit: settingsDoc?.itemsLimit ?? { adultLimit: 5, childLimit: 4, infantLimit: 3 },
    sessionSpecificItemsLimit: settingsDoc?.sessionSpecificItemsLimit ?? undefined,
    specialTableItemsLimit: settingsDoc?.specialTableItemsLimit ?? []
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()

    const [tablesDocs, settingsDoc] = await Promise.all([
      db.collection(COLLECTIONS.TABLES).find({}).toArray(),
      db.collection(COLLECTIONS.SETTINGS).findOne({ type: 'buffet' })
    ])

    const settings = buildSettingsFallback(settingsDoc || {})
    const currentSession = resolveCurrentSession(settings)
    const sessionKey = (currentSession?.key || 'lunch') as 'breakfast'|'lunch'|'dinner'
    const basePricing = currentSession?.data || { adultPrice: 25, childPrice: 15, infantPrice: 0 }
    const extraDrinksPricing = (settings.sessionSpecificExtraDrinksPricing?.[sessionKey]) || settings.extraDrinksPricing || {
      adultPrice: settings.extraDrinksPrice ?? 5,
      childPrice: Math.round(((settings.extraDrinksPrice ?? 5) * 0.6)),
      infantPrice: 0,
    }

    const activeSessions = await db.collection('table_sessions').find({ status: 'active' }).toArray()
    const sessionsByTable: Record<string, any[]> = {}
    for (const s of activeSessions) {
      const tid = s.tableId
      if (!tid) continue
      if (!sessionsByTable[tid]) sessionsByTable[tid] = []
      sessionsByTable[tid].push(s)
    }

    const ordersBySessionId: Record<string, any[]> = {}
    const allSessionIds = activeSessions.map(s => s._id?.toString()).filter(Boolean)
    if (allSessionIds.length > 0) {
      const orders = await db.collection(COLLECTIONS.ORDERS).find({ tableSessionId: { $in: allSessionIds } }).toArray()
      for (const ord of orders) {
        const sid = ord.tableSessionId
        if (!sid) continue
        if (!ordersBySessionId[sid]) ordersBySessionId[sid] = []
        ordersBySessionId[sid].push(ord)
      }
    }

    const formattedTables = tablesDocs.map(tbl => ({
      id: tbl._id.toString(),
      number: tbl.number,
      status: tbl.status,
      capacity: tbl.capacity || 4,
      currentGuests: tbl.currentGuests || 0,
      createdAt: tbl.createdAt,
      updatedAt: tbl.updatedAt
    }))

    const tablesWithSessions = formattedTables.map(table => {
      const tableSessions = sessionsByTable[table.id] || []
      const sorted = tableSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      const primarySession = sorted[0] || null

      const adultGuests = primarySession ? (primarySession.guestCounts?.adults || 0) : 0
      const availableAdultCapacity = Math.max(0, (table.capacity || 0) - adultGuests)

      const aggregatedGuests = tableSessions.reduce((acc, s: any) => {
        const gc = s.guestCounts || { adults: 0, children: 0, infants: 0, includeDrinks: false }
        acc.adults += gc.adults || 0
        acc.children += gc.children || 0
        acc.infants += gc.infants || 0
        acc.includeDrinks = acc.includeDrinks || !!gc.includeDrinks
        return acc
      }, { adults: 0, children: 0, infants: 0, includeDrinks: false })

      let total = 0
      total += (aggregatedGuests.adults * (basePricing.adultPrice || 0))
      total += (aggregatedGuests.children * (basePricing.childPrice || 0))
      total += (aggregatedGuests.infants * (basePricing.infantPrice || 0))
      if (aggregatedGuests.includeDrinks) {
        total += (aggregatedGuests.adults * (extraDrinksPricing.adultPrice || 0))
        total += (aggregatedGuests.children * (extraDrinksPricing.childPrice || 0))
        total += (aggregatedGuests.infants * (extraDrinksPricing.infantPrice || 0))
      }
      for (const s of tableSessions) {
        const sid = s._id?.toString()
        const ords = sid ? (ordersBySessionId[sid] || []) : []
        for (const order of ords) {
          const items = Array.isArray(order.items) ? order.items : []
          for (const item of items) {
            const price = item?.price || 0
            const qty = item?.quantity || 1
            total += price * qty
          }
        }
      }

      const formattedSession = primarySession ? {
        id: primarySession._id.toString(),
        tableId: primarySession.tableId,
        deviceId: primarySession.deviceId,
        secondaryDeviceId: primarySession.secondaryDeviceId,
        guestCounts: primarySession.guestCounts,
        cartItems: primarySession.cartItems || [],
        nextOrderAvailableUntil: primarySession.nextOrderAvailableUntil,
        sessionEnded: primarySession.sessionEnded || false,
        status: primarySession.status,
        createdAt: primarySession.createdAt,
        updatedAt: primarySession.updatedAt,
        isSecondaryDevice: primarySession.isSecondaryDevice || false,
        groupType: primarySession.groupType || 'same'
      } : undefined

      return {
        ...table,
        session: formattedSession,
        availableAdultCapacity,
        currentBillTotal: total
      }
    })

    return NextResponse.json({ success: true, data: { settings, tables: tablesWithSessions } })
  } catch (error) {
    console.error('Error aggregating tables data:', error)
    return NextResponse.json({ success: false, error: 'Failed to aggregate tables data' }, { status: 500 })
  }
}