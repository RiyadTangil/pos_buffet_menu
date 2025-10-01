import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const tableId = searchParams.get('tableId')

    if (!groupId && !tableId) {
      return NextResponse.json(
        { success: false, error: 'Either groupId or tableId is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const groupsCollection = db.collection(COLLECTIONS.SYNCHRONIZED_GROUPS)

    let query: any = { isActive: true }
    
    if (groupId) {
      query.groupId = groupId
    } else if (tableId) {
      query.tableId = tableId
    }

    const group = await groupsCollection.findOne(query)

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Synchronized group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: group
    })
  } catch (error) {
    console.error('Failed to fetch synchronized group:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch synchronized group' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      groupId,
      sharedCart,
      sharedOrders,
      sessionTimer,
      guestCounts,
      deviceId
    } = body

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'groupId is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const groupsCollection = db.collection(COLLECTIONS.SYNCHRONIZED_GROUPS)

    const now = new Date()
    const updateData: any = {
      updatedAt: now
    }

    if (sharedCart !== undefined) updateData.sharedCart = sharedCart
    if (sharedOrders !== undefined) updateData.sharedOrders = sharedOrders
    if (sessionTimer !== undefined) updateData.sessionTimer = sessionTimer
    if (guestCounts !== undefined) updateData.guestCounts = guestCounts

    const result = await groupsCollection.updateOne(
      { groupId, isActive: true },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Synchronized group not found' },
        { status: 404 }
      )
    }

    // Get updated group data
    const updatedGroup = await groupsCollection.findOne({ groupId, isActive: true })

    return NextResponse.json({
      success: true,
      data: updatedGroup,
      message: 'Synchronized group updated successfully'
    })
  } catch (error) {
    console.error('Failed to update synchronized group:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update synchronized group' },
      { status: 500 }
    )
  }
}