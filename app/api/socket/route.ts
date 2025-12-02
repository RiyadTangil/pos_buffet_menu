import { NextRequest, NextResponse } from 'next/server'

declare global {
  var io: any
  var pendingSocketBroadcasts: Array<{ room: string; event: string; data: any }>
}

function queueBroadcast(room: string, event: string, data: any) {
  if (!global.pendingSocketBroadcasts) global.pendingSocketBroadcasts = []
  global.pendingSocketBroadcasts.push({ room, event, data })
}

// Broadcast table session updates to all devices on the same table
export function broadcastTableSessionUpdate(tableId: string, sessionData: any, groupType?: string) {
  if (global.io) {
    const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
    console.log(`📡 API Broadcasting table session update for ${roomName}`)
    console.log(`📋 API Session data:`, JSON.stringify(sessionData, null, 2))
    console.log(`👥 API Broadcasting to ${global.io.sockets.adapter.rooms.get(roomName)?.size || 0} clients`)
    global.io.to(roomName).emit('tableSessionUpdate', sessionData)
  } else {
    const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
    queueBroadcast(roomName, 'tableSessionUpdate', sessionData)
  }
}

// Broadcast global tables updates (create/update/delete/status changes)
export function broadcastTablesUpdate(update: any) {
  if (global.io) {

    global.io.to('tables').emit('tablesUpdate', update)
  } else {
    queueBroadcast('tables', 'tablesUpdate', update)
  }
}

// GET endpoint to get Socket.IO status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Socket.IO server is ready',
    connected: global.io ? true : false,
    pendingCount: global.pendingSocketBroadcasts ? global.pendingSocketBroadcasts.length : 0
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
        queueBroadcast(room, event, data)
        return NextResponse.json({
          success: true,
          message: 'Broadcast queued until Socket.IO initializes'
        })
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
