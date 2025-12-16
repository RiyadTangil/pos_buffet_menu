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
        name: 'Breakfast', startTime: '08:00', endTime: '11:00', adultPrice: 20, childPrice: 12, infantPrice: 0, isActive: true, nextOrderAvailableInMinutes: 30
      },
      lunch: {
        name: 'Lunch', startTime: '12:00', endTime: '16:00', adultPrice: 25, childPrice: 15, infantPrice: 0, isActive: true, nextOrderAvailableInMinutes: 30
      },
      dinner: {
        name: 'Dinner', startTime: '18:00', endTime: '22:00', adultPrice: 30, childPrice: 18, infantPrice: 0, isActive: true, nextOrderAvailableInMinutes: 30
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
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('tableId')
    const groupType = searchParams.get('groupType') || undefined
    const onlyAvailable = (searchParams.get('onlyAvailable') || 'true') === 'true'

    if (!tableId || !ObjectId.isValid(tableId)) {
      return NextResponse.json({ success: false, error: 'Valid tableId is required' }, { status: 400 })
    }

    const db = await getDatabase()

    const [settingsDoc, tableDoc] = await Promise.all([
      db.collection(COLLECTIONS.SETTINGS).findOne({ type: 'buffet' }),
      db.collection(COLLECTIONS.TABLES).findOne({ _id: new ObjectId(tableId) })
    ])

    const settings = buildSettingsFallback(settingsDoc || {})
    const currentSession = resolveCurrentSession(settings)
    const sessionKey = (currentSession?.key || 'lunch') as 'breakfast'|'lunch'|'dinner'

    const sessionQuery: any = { tableId, status: 'active' }
    if (groupType) sessionQuery.groupType = groupType
    const session = await db.collection('table_sessions').findOne(sessionQuery)
    const formattedSession = session ? {
      id: session._id.toString(),
      tableId: session.tableId,
      deviceId: session.deviceId,
      secondaryDeviceId: session.secondaryDeviceId,
      guestCounts: session.guestCounts,
      cartItems: session.cartItems || [],
      nextOrderAvailableUntil: session.nextOrderAvailableUntil,
      sessionEnded: session.sessionEnded || false,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      isSecondaryDevice: session.isSecondaryDevice || false,
      groupType: session.groupType || 'same'
    } : null

    let categories: any[] = []
    try {
      categories = await db.collection(COLLECTIONS.CATEGORIES)
        .find({ sessions: { $in: [sessionKey] } })
        .sort({ orderIndex: 1, createdAt: 1 })
        .toArray()
      categories = categories.map(c => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description || '',
        sessions: c.sessions || [],
        orderIndex: typeof c.orderIndex === 'number' ? c.orderIndex : undefined,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    } catch {}

    let products: any[] = []
    try {
      const productQuery = onlyAvailable ? { $or: [{ isAvailable: { $exists: false } }, { isAvailable: true }] } : {}
      const prods = await db.collection(COLLECTIONS.PRODUCTS).find(productQuery).toArray()
      products = prods.map(p => ({
        id: p._id.toString(),
        categoryId: p.categoryId,
        name: p.name,
        limitPerOrder: p.limitPerOrder,
        price: p.price || 0,
        description: p.description || '',
        image: p.image || '',
        isVegetarian: p.isVegetarian || false,
        isSpicy: p.isSpicy || false,
        isAvailable: p.isAvailable !== false,
        isPremium: p.isPremium || false,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    } catch {}

    const formattedTable = tableDoc ? {
      id: tableDoc._id.toString(),
      number: tableDoc.number,
      status: tableDoc.status,
      capacity: tableDoc.capacity || 4,
      currentGuests: tableDoc.currentGuests || 0,
      createdAt: tableDoc.createdAt,
      updatedAt: tableDoc.updatedAt
    } : null

    return NextResponse.json({
      success: true,
      data: {
        settings,
        table: formattedTable,
        session: formattedSession,
        categories,
        products,
        sessionKey
      }
    })
  } catch (error) {
    console.error('Error aggregating items data:', error)
    return NextResponse.json({ success: false, error: 'Failed to aggregate items data' }, { status: 500 })
  }
}
