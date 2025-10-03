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

// POST endpoint to handle broadcast requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, room, event, data } = body

    if (action === 'broadcast' && room && event) {
      if (global.io) {
        console.log(`📡 Broadcasting ${event} to room ${room}`)
        console.log(`📋 Data:`, JSON.stringify(data, null, 2))
        console.log(`👥 Broadcasting to ${global.io.sockets.adapter.rooms.get(room)?.size || 0} clients`)
        global.io.to(room).emit(event, data)
        
        return NextResponse.json({
          success: true,
          message: 'Broadcast sent successfully'
        })
      } else {
        console.warn('Socket.IO server not initialized')
        return NextResponse.json(
          { success: false, error: 'Socket.IO server not initialized' },
          { status: 500 }
        )
      }
    }

    // Legacy support for old format
    const { tableId, sessionData } = body
    if (tableId !== undefined && sessionData !== undefined) {
      broadcastTableSessionUpdate(tableId, sessionData)
      return NextResponse.json({
        success: true,
        message: 'Broadcast sent successfully'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error broadcasting update:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to broadcast update' },
      { status: 500 }
    )
  }
}