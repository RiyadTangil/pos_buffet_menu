import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { broadcastTablesUpdate, broadcastTableSessionUpdate } from '@/app/api/socket/route'

// POST /api/table-sessions/switch
// Body: { fromTableId: string, toTableId: string }
// Moves all active sessions from one table to another, only if no orders exist.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { fromTableId, toTableId } = body || {}

    if (!fromTableId || !toTableId) {
      return NextResponse.json(
        { success: false, error: 'fromTableId and toTableId are required' },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(fromTableId) || !ObjectId.isValid(toTableId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table ID format' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const tablesCol = db.collection(COLLECTIONS.TABLES)
    const sessionsCol = db.collection('table_sessions')
    const ordersCol = db.collection(COLLECTIONS.ORDERS)

    // Load source and target tables
    const [fromTable, toTable] = await Promise.all([
      tablesCol.findOne({ _id: new ObjectId(fromTableId) }),
      tablesCol.findOne({ _id: new ObjectId(toTableId) })
    ])

    if (!fromTable || !toTable) {
      return NextResponse.json(
        { success: false, error: 'Source or target table not found' },
        { status: 404 }
      )
    }

    // Fetch active sessions on the source table
    const activeSessions = await sessionsCol.find({ tableId: fromTableId, status: 'active' }).toArray()

    if (activeSessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active sessions on source table' },
        { status: 400 }
      )
    }

    // Check for any orders for these sessions (blocking switch if present)
    const sessionIds = activeSessions.map(s => s._id?.toString()).filter(Boolean)
    const ordersCount = await ordersCol.countDocuments({ tableSessionId: { $in: sessionIds } })
    if (ordersCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot switch tables after placing orders' },
        { status: 400 }
      )
    }

    // Capacity check: consider only adult capacity (as /menu/tables does)
    const totalAdults = activeSessions.reduce((acc, s: any) => acc + (s?.guestCounts?.adults || 0), 0)
    if (typeof toTable.capacity === 'number' && totalAdults > toTable.capacity) {
      return NextResponse.json(
        { success: false, error: `Target table cannot accommodate ${totalAdults} adults (capacity ${toTable.capacity}).` },
        { status: 400 }
      )
    }

    // Compute total guests for target table currentGuests
    const totalGuests = activeSessions.reduce((acc, s: any) => {
      const gc = s?.guestCounts || { adults: 0, children: 0, infants: 0 }
      return acc + (gc.adults || 0) + (gc.children || 0) + (gc.infants || 0)
    }, 0)

    // Update sessions to point to the target table
    await sessionsCol.updateMany(
      { _id: { $in: activeSessions.map(s => s._id) } },
      { $set: { tableId: toTableId, updatedAt: new Date().toISOString() } }
    )

    // Update table documents
    await Promise.all([
      tablesCol.updateOne(
        { _id: new ObjectId(fromTableId) },
        { $set: { status: 'available', currentGuests: 0, updatedAt: new Date().toISOString() } }
      ),
      tablesCol.updateOne(
        { _id: new ObjectId(toTableId) },
        { $set: { status: 'selected', currentGuests: totalGuests, updatedAt: new Date().toISOString() } }
      )
    ])

    // Broadcast tables refresh to all watchers
    broadcastTablesUpdate({ type: 'refresh' })

    // Broadcast session updates to the target table rooms
    for (const s of activeSessions) {
      const sessionData = {
        id: s._id.toString(),
        tableId: toTableId,
        deviceId: s.deviceId,
        secondaryDeviceId: s.secondaryDeviceId,
        guestCounts: s.guestCounts,
        cartItems: s.cartItems || [],
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: new Date().toISOString(),
        isSecondaryDevice: !!s.isSecondaryDevice,
        groupType: s.groupType || 'same',
        message: 'Session moved to new table'
      }
      broadcastTableSessionUpdate(toTableId, sessionData, sessionData.groupType)
    }

    return NextResponse.json({ success: true, message: 'Table sessions switched successfully' })
  } catch (error) {
    console.error('Error switching table sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to switch table sessions' },
      { status: 500 }
    )
  }
}