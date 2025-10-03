import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { broadcastTableSessionUpdate } from '@/app/api/socket/route'

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  categoryId: string
}

export interface TableSession {
  id: string
  tableId: string
  deviceId: string
  guestCounts: {
    adults: number
    children: number
    infants: number
    includeDrinks: boolean
  }
  cartItems: CartItem[]
  // Absolute timestamp when next order becomes available (ISO string)
  nextOrderAvailableUntil?: string
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
  waiterPin?: string
  isSecondaryDevice?: boolean
}

// GET - Fetch table session by tableId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('tableId')
    
    if (!tableId) {
      return NextResponse.json(
        { success: false, error: 'Table ID is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const session = await db.collection('table_sessions')
      .findOne({ 
        tableId, 
        status: 'active' 
      })
    
    if (!session) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    const formattedSession = {
      id: session._id.toString(),
      tableId: session.tableId,
      deviceId: session.deviceId,
      guestCounts: session.guestCounts,
      cartItems: session.cartItems || [], // Include cartItems, default to empty array for backward compatibility
      nextOrderAvailableUntil: session.nextOrderAvailableUntil,
      sessionEnded: session.sessionEnded || false,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      isSecondaryDevice: session.isSecondaryDevice || false
    }

    return NextResponse.json({
      success: true,
      data: formattedSession
    })
  } catch (error) {
    console.error('Error fetching table session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table session' },
      { status: 500 }
    )
  }
}

// PATCH - Update table session fields (nextOrderAvailableUntil, sessionEnded)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableId, nextOrderAvailableUntil, sessionEnded } = body

    if (!tableId) {
      return NextResponse.json(
        { success: false, error: 'Table ID is required' },
        { status: 400 }
      )
    }

    // Build update object dynamically
    const updateFields: any = {
      updatedAt: new Date()
    }

    if (nextOrderAvailableUntil !== undefined) {
      updateFields.nextOrderAvailableUntil = nextOrderAvailableUntil
    }

    if (sessionEnded !== undefined) {
      updateFields.sessionEnded = sessionEnded
    }

    if (Object.keys(updateFields).length === 1) { // Only updatedAt
      return NextResponse.json(
        { success: false, error: 'At least one field to update is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const result = await db.collection('table_sessions').findOneAndUpdate(
      { tableId, status: 'active' },
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Active table session not found' },
        { status: 404 }
      )
    }

    const sessionData = {
      id: result._id.toString(),
      tableId: result.tableId,
      deviceId: result.deviceId,
      guestCounts: result.guestCounts,
      cartItems: result.cartItems || [],
      nextOrderAvailableUntil: result.nextOrderAvailableUntil,
      sessionEnded: result.sessionEnded || false,
      status: result.status,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      isSecondaryDevice: result.isSecondaryDevice || false
    }

    // Broadcast the update to all devices on this table
    broadcastTableSessionUpdate(tableId, sessionData)

    return NextResponse.json({ success: true, data: sessionData })
  } catch (error) {
    console.error('Error updating table session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update table session' },
      { status: 500 }
    )
  }
}

// POST - Create or update table session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      tableId, 
      deviceId, 
      guestCounts, 
      waiterPin, 
      isSecondaryDevice = false 
    } = body

    // Validation
    if (!tableId || !deviceId || !guestCounts) {
      return NextResponse.json(
        { success: false, error: 'Table ID, device ID, and guest counts are required' },
        { status: 400 }
      )
    }

    if (guestCounts.adults < 1) {
      return NextResponse.json(
        { success: false, error: 'At least one adult is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Check if there's an existing active session for this table
    const existingSession = await db.collection('table_sessions')
      .findOne({ 
        tableId, 
        status: 'active' 
      })

    if (existingSession && !isSecondaryDevice) {
      // First device trying to create session when one already exists
      return NextResponse.json(
        { success: false, error: 'Table already has an active session' },
        { status: 409 }
      )
    }

    if (isSecondaryDevice) {
      if (!existingSession) {
        return NextResponse.json(
          { success: false, error: 'No active session found for this table' },
          { status: 404 }
        )
      }

      // Verify waiter PIN if provided
      if (waiterPin) {
        // For now, we'll use a simple PIN validation
        // In production, you'd validate against a waiter database
        const validPins = ['1234', '5678', '9999'] // Demo pins
        if (!validPins.includes(waiterPin)) {
          return NextResponse.json(
            { success: false, error: 'Invalid waiter PIN' },
            { status: 401 }
          )
        }
      }

      // Get table capacity to check if additional adults can be accommodated
      const table = await db.collection('tables').findOne({ _id: new ObjectId(tableId) })
      if (!table) {
        return NextResponse.json(
          { success: false, error: 'Table not found' },
          { status: 404 }
        )
      }

      const currentAdults = existingSession.guestCounts.adults
      const newAdults = guestCounts.adults
      const totalAdults = currentAdults + newAdults

      if (totalAdults > table.capacity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot accommodate ${newAdults} more adults. Table capacity: ${table.capacity}, Current adults: ${currentAdults}` 
          },
          { status: 400 }
        )
      }

      // Update existing session with additional guests
      const updatedGuestCounts = {
        adults: totalAdults,
        children: existingSession.guestCounts.children + guestCounts.children,
        infants: existingSession.guestCounts.infants + guestCounts.infants,
        includeDrinks: existingSession.guestCounts.includeDrinks || guestCounts.includeDrinks
      }

      const updateResult = await db.collection('table_sessions').updateOne(
        { _id: existingSession._id },
        {
          $set: {
            guestCounts: updatedGuestCounts,
            updatedAt: new Date(),
            secondaryDeviceId: deviceId
          }
        }
      )

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Failed to update session' },
          { status: 500 }
        )
      }

      // Update table guest count
      await db.collection('tables').updateOne(
        { _id: new ObjectId(tableId) },
        {
          $set: {
            currentGuests: updatedGuestCounts.adults + updatedGuestCounts.children + updatedGuestCounts.infants,
            updatedAt: new Date()
          }
        }
      )

      // Broadcast the session update to all devices on this table
      const sessionData = {
        id: existingSession._id.toString(),
        tableId,
        deviceId,
        guestCounts: updatedGuestCounts,
        status: 'active',
        isSecondaryDevice: true,
        message: 'Successfully joined table session'
      }
      
      broadcastTableSessionUpdate(tableId, sessionData)

      return NextResponse.json({
        success: true,
        data: sessionData
      })
    } else {
      // Create new session for first device
      const newSession = {
        tableId,
        deviceId,
        guestCounts,
        cartItems: [], // Initialize empty cart
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        isSecondaryDevice: false
      }

      const result = await db.collection('table_sessions').insertOne(newSession)
      
      // Update table status and guest count
      const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants
      await db.collection('tables').updateOne(
        { _id: new ObjectId(tableId) },
        {
          $set: {
            status: 'selected',
            currentGuests: totalGuests,
            updatedAt: new Date()
          }
        }
      )

      // Broadcast the new session to all devices on this table
      const sessionData = {
        id: result.insertedId.toString(),
        tableId,
        deviceId,
        guestCounts,
        status: 'active',
        isSecondaryDevice: false
      }
      
      broadcastTableSessionUpdate(tableId, sessionData)

      return NextResponse.json({
        success: true,
        data: sessionData
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating/updating table session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create/update table session' },
      { status: 500 }
    )
  }
}

// DELETE - End table session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('tableId')
    
    if (!tableId) {
      return NextResponse.json(
        { success: false, error: 'Table ID is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Update session status to completed
    await db.collection('table_sessions').updateMany(
      { tableId, status: 'active' },
      {
        $set: {
          status: 'completed',
          updatedAt: new Date()
        }
      }
    )

    // Reset table status
    await db.collection('tables').updateOne(
      { _id: new ObjectId(tableId) },
      {
        $set: {
          status: 'available',
          currentGuests: 0,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Table session ended successfully'
    })
  } catch (error) {
    console.error('Error ending table session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to end table session' },
      { status: 500 }
    )
  }
}