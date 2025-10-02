import { NextRequest, NextResponse } from 'next/server'

// Broadcast table session updates to all devices on the same table
export function broadcastTableSessionUpdate(tableId: string, sessionData: any) {
  if (global.io) {
    console.log(`📡 API Broadcasting table session update for table-${tableId}`)
    console.log(`📋 API Session data:`, JSON.stringify(sessionData, null, 2))
    console.log(`👥 API Broadcasting to ${global.io.sockets.adapter.rooms.get(`table-${tableId}`)?.size || 0} clients`)
    global.io.to(`table-${tableId}`).emit('tableSessionUpdate', sessionData)
  } else {
    console.warn('Socket.IO server not initialized')
  }
}

// GET endpoint to get Socket.IO status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Socket.IO server is ready',
    connected: global.io ? true : false
  })
}

// POST endpoint to manually trigger broadcasts (for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableId, sessionData } = body

    if (!tableId || !sessionData) {
      return NextResponse.json(
        { success: false, error: 'tableId and sessionData are required' },
        { status: 400 }
      )
    }

    broadcastTableSessionUpdate(tableId, sessionData)

    return NextResponse.json({
      success: true,
      message: 'Broadcast sent successfully'
    })
  } catch (error) {
    console.error('Error broadcasting update:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to broadcast update' },
      { status: 500 }
    )
  }
}