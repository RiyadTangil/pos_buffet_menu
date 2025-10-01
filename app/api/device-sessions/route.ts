import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Interface for device session
interface DeviceSession {
  _id?: ObjectId
  sessionId: string
  tableId: string
  deviceId: string
  groupType: 'different' | 'same'
  groupId: string
  guestCounts: {
    adults: number
    children: number
    infants: number
    includeDrinks: boolean
  }
  cart: any[]
  orders: any[]
  sessionStartTime: Date
  lastActivity: Date
  isActive: boolean
  waiterVerified?: boolean
  createdAt: Date
  updatedAt: Date
}

// Interface for synchronized group
interface SynchronizedGroup {
  _id?: ObjectId
  groupId: string
  tableId: string
  masterDeviceId: string
  devices: string[]
  sharedCart: any[]
  sharedOrders: any[]
  sessionTimer: {
    startTime: Date
    endTime?: Date
    remainingTime: number
  }
  guestCounts: {
    adults: number
    children: number
    infants: number
    includeDrinks: boolean
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const deviceId = searchParams.get('deviceId')
    const tableId = searchParams.get('tableId')
    const groupId = searchParams.get('groupId')

    const db = await getDatabase()
    const sessionsCollection = db.collection<DeviceSession>(COLLECTIONS.DEVICE_SESSIONS)

    let query: any = { isActive: true }

    if (sessionId) {
      query.sessionId = sessionId
    }
    if (deviceId) {
      query.deviceId = deviceId
    }
    if (tableId) {
      query.tableId = tableId
    }
    if (groupId) {
      query.groupId = groupId
    }

    const sessions = await sessionsCollection.find(query).toArray()

    return NextResponse.json({
      success: true,
      data: sessions
    })
  } catch (error) {
    console.error('Failed to fetch device sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      tableId,
      deviceId,
      groupType,
      guestCounts,
      waiterVerified = false
    } = body

    if (!sessionId || !tableId || !deviceId || !groupType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const sessionsCollection = db.collection<DeviceSession>(COLLECTIONS.DEVICE_SESSIONS)
    const groupsCollection = db.collection<SynchronizedGroup>(COLLECTIONS.SYNCHRONIZED_GROUPS)

    const now = new Date()
    let groupId: string

    if (groupType === 'same') {
      // Find existing group for this table
      const existingGroup = await groupsCollection.findOne({
        tableId,
        isActive: true
      })

      if (existingGroup) {
        groupId = existingGroup.groupId
        
        // Combine guest counts from new device with existing group
        const combinedGuestCounts = {
          adults: (existingGroup.guestCounts?.adults || 0) + (guestCounts?.adults || 0),
          children: (existingGroup.guestCounts?.children || 0) + (guestCounts?.children || 0),
          infants: (existingGroup.guestCounts?.infants || 0) + (guestCounts?.infants || 0),
          includeDrinks: existingGroup.guestCounts?.includeDrinks || guestCounts?.includeDrinks || false
        }
        
        // Add device to existing group and update combined guest counts
        await groupsCollection.updateOne(
          { _id: existingGroup._id },
          {
            $addToSet: { devices: deviceId },
            $set: { 
              guestCounts: combinedGuestCounts,
              updatedAt: now 
            }
          }
        )
      } else {
        // Create new synchronized group
        groupId = `group-${tableId}-${Date.now()}`
        
        await groupsCollection.insertOne({
          groupId,
          tableId,
          masterDeviceId: deviceId,
          devices: [deviceId],
          sharedCart: [],
          sharedOrders: [],
          sessionTimer: {
            startTime: now,
            remainingTime: 0
          },
          guestCounts,
          isActive: true,
          createdAt: now,
          updatedAt: now
        })
      }
    } else {
      // Different group - create unique group ID
      groupId = `group-${deviceId}-${Date.now()}`
    }

    // Create device session
    const deviceSession: DeviceSession = {
      sessionId,
      tableId,
      deviceId,
      groupType,
      groupId,
      guestCounts,
      cart: [],
      orders: [],
      sessionStartTime: now,
      lastActivity: now,
      isActive: true,
      waiterVerified,
      createdAt: now,
      updatedAt: now
    }

    const result = await sessionsCollection.insertOne(deviceSession)

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.insertedId,
        groupId,
        groupType
      }
    })
  } catch (error) {
    console.error('Failed to create device session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create device session' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      deviceId,
      cart,
      orders,
      guestCounts,
      sessionTimer
    } = body

    if (!sessionId || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or deviceId' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const sessionsCollection = db.collection<DeviceSession>(COLLECTIONS.DEVICE_SESSIONS)
    const groupsCollection = db.collection<SynchronizedGroup>(COLLECTIONS.SYNCHRONIZED_GROUPS)

    const now = new Date()

    // Update device session
    const updateData: any = {
      lastActivity: now,
      updatedAt: now
    }

    if (cart !== undefined) updateData.cart = cart
    if (orders !== undefined) updateData.orders = orders
    if (guestCounts !== undefined) updateData.guestCounts = guestCounts

    await sessionsCollection.updateOne(
      { sessionId, deviceId },
      { $set: updateData }
    )

    // If this is a synchronized group, update the group data
    const session = await sessionsCollection.findOne({ sessionId, deviceId })
    
    if (session && session.groupType === 'same') {
      const groupUpdateData: any = {
        updatedAt: now
      }

      if (cart !== undefined) groupUpdateData.sharedCart = cart
      if (orders !== undefined) groupUpdateData.sharedOrders = orders
      if (sessionTimer !== undefined) groupUpdateData.sessionTimer = sessionTimer

      await groupsCollection.updateOne(
        { groupId: session.groupId },
        { $set: groupUpdateData }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully'
    })
  } catch (error) {
    console.error('Failed to update device session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update device session' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const deviceId = searchParams.get('deviceId')

    if (!sessionId || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or deviceId' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const sessionsCollection = db.collection<DeviceSession>(COLLECTIONS.DEVICE_SESSIONS)
    const groupsCollection = db.collection<SynchronizedGroup>(COLLECTIONS.SYNCHRONIZED_GROUPS)

    // Get session info before deletion
    const session = await sessionsCollection.findOne({ sessionId, deviceId })
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Mark session as inactive
    await sessionsCollection.updateOne(
      { sessionId, deviceId },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    )

    // If this was a synchronized group, handle group cleanup
    if (session.groupType === 'same') {
      const group = await groupsCollection.findOne({ groupId: session.groupId })
      
      if (group) {
        // Remove device from group
        await groupsCollection.updateOne(
          { groupId: session.groupId },
          {
            $pull: { devices: deviceId },
            $set: { updatedAt: new Date() }
          }
        )

        // Check if group is now empty
        const updatedGroup = await groupsCollection.findOne({ groupId: session.groupId })
        if (updatedGroup && updatedGroup.devices.length === 0) {
          // Mark group as inactive
          await groupsCollection.updateOne(
            { groupId: session.groupId },
            { 
              $set: { 
                isActive: false,
                updatedAt: new Date()
              }
            }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Session ended successfully'
    })
  } catch (error) {
    console.error('Failed to end device session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to end device session' },
      { status: 500 }
    )
  }
}