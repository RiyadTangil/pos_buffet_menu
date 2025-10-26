// Shared Socket.IO broadcast helpers that can be safely imported by API routes

export function broadcastTableSessionUpdate(tableId: string, sessionData: any, groupType?: string): void {
  const io = (global as any).io
  if (io) {
    const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
    console.log(`📡 Broadcasting table session update for ${roomName}`)
    console.log(`📋 Session data:`, JSON.stringify(sessionData, null, 2))
    console.log(`👥 Broadcasting to ${io.sockets.adapter.rooms.get(roomName)?.size || 0} clients`)
    io.to(roomName).emit('tableSessionUpdate', sessionData)
  } else {
    console.warn('Socket.IO server not initialized')
  }
}

export function broadcastTablesUpdate(update: any): void {
  const io = (global as any).io
  if (io) {
    console.log('📡 Broadcasting tables update')
    console.log('📋 Update data:', JSON.stringify(update, null, 2))
    console.log(`👥 Broadcasting to ${io.sockets.adapter.rooms.get('tables')?.size || 0} clients`)
    io.to('tables').emit('tablesUpdate', update)
  } else {
    console.warn('Socket.IO server not initialized')
  }
}