export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'

function startEndOfToday() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export async function GET(_request: NextRequest) {
  try {
    const db = await getDatabase()
    const { startISO, endISO } = startEndOfToday()

    // Aggregate metrics in parallel and be resilient to missing collections/fields
    const [
      totalUsers,
      menuItems,
      todaysOrders,
      bookings,
      revenueToday
    ] = await Promise.all([
      db.collection(COLLECTIONS.USERS).countDocuments({}).catch(() => 0),
      db.collection(COLLECTIONS.PRODUCTS).countDocuments({}).catch(() => 0),
      db.collection(COLLECTIONS.ORDERS).countDocuments({ createdAt: { $gte: startISO, $lte: endISO } }).catch(async () => {
        // Fallback to timestamp field
        try { return await db.collection(COLLECTIONS.ORDERS).countDocuments({ timestamp: { $gte: startISO, $lte: endISO } }) } catch { return 0 }
      }),
      db.collection(COLLECTIONS.BOOKINGS).countDocuments({ createdAt: { $gte: startISO, $lte: endISO } }).catch(async () => {
        // Fallback to paymentDate/date
        try { return await db.collection(COLLECTIONS.BOOKINGS).countDocuments({ date: { $gte: startISO, $lte: endISO } }) } catch { return 0 }
      }),
      (async () => {
        try {
          const payments = await db.collection(COLLECTIONS.PAYMENTS)
            .find({ createdAt: { $gte: startISO, $lte: endISO } }, { projection: { totalAmount: 1 } })
            .toArray()
          return payments.reduce((sum, p: any) => sum + (Number(p.totalAmount) || 0), 0)
        } catch {
          try {
            const payments = await db.collection(COLLECTIONS.PAYMENTS)
              .find({ paymentDate: { $gte: startISO, $lte: endISO } }, { projection: { totalAmount: 1 } })
              .toArray()
            return payments.reduce((sum, p: any) => sum + (Number(p.totalAmount) || 0), 0)
          } catch {
            return 0
          }
        }
      })()
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        menuItems,
        todaysOrders,
        bookings,
        revenueToday
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard metrics' }, { status: 500 })
  }
}