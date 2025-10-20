import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function initializeSocketClient(): Socket | null {
  // Only initialize on client-side (browser)
  if (typeof window === 'undefined') {
    console.log('🚫 Socket.IO client not initialized - running on server-side')
    return null
  }

  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
    
    console.log('🔌 Initializing Socket.IO client with URL:', socketUrl)
    
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    })

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server:', socket?.id)
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server')
    })

    socket.on('connect_error', (error) => {
      console.error('🚨 Socket.IO connection error:', error)
    })
  }

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function joinTableRoom(tableId: string, groupType?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      console.log('🚫 Cannot join table room - running on server-side')
      resolve()
      return
    }

    if (!socket) {
      console.warn('⚠️ Socket not initialized')
      reject(new Error('Socket not initialized'))
      return
    }

    // Create room name based on tableId and groupType
    const roomData = { tableId, groupType }
    const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`

    if (socket.connected) {
      socket.emit('join-table', roomData)
      console.log(`🏠 Client joined table room: ${roomName}`)
      resolve()
    } else {
      console.log('⏳ Waiting for socket connection before joining table room...')
      
      // Wait for connection with timeout
      const timeout = setTimeout(() => {
        console.warn('⚠️ Timeout waiting for socket connection')
        reject(new Error('Socket connection timeout'))
      }, 5000)

      socket.once('connect', () => {
        clearTimeout(timeout)
        socket.emit('join-table', roomData)
        console.log(`🏠 Client joined table room: ${roomName}`)
        resolve()
      })

      socket.once('connect_error', (error) => {
        clearTimeout(timeout)
        console.error('🚨 Failed to connect socket:', error)
        reject(error)
      })
    }
  })
}

export function leaveTableRoom(tableId: string, groupType?: string): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot leave table room - running on server-side')
    return
  }

  if (socket && socket.connected) {
    const roomData = { tableId, groupType }
    const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
    socket.emit('leave-table', roomData)
    console.log(`🚪 Client left table room: ${roomName}`)
  } else {
    console.warn('⚠️ Cannot leave table room - socket not connected')
  }
}

// Join the global tables room to receive table list updates
export function joinTablesRoom(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      console.log('🚫 Cannot join tables room - running on server-side')
      resolve()
      return
    }

    const client = initializeSocketClient()
    if (!client) {
      console.warn('Socket client not initialized; cannot join tables room')
      resolve()
      return
    }

    client.emit('join-tables')
    console.log('🏠 Joined tables room')
    resolve()
  })
}

// Leave the global tables room
export function leaveTablesRoom(): void {
  if (typeof window === 'undefined') return
  const client = getSocket()
  if (!client) return
  client.emit('leave-tables')
  console.log('🚪 Left tables room')
}

export function onTableSessionUpdate(callback: (sessionData: any) => void): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot set up listener - running on server-side')
    return
  }

  if (socket) {
    console.log('👂 Setting up tableSessionUpdate listener')
    socket.on('tableSessionUpdate', (sessionData) => {
      console.log('📨 Received tableSessionUpdate:', sessionData)
      callback(sessionData)
    })
  } else {
    console.warn('⚠️ Cannot set up listener - socket not initialized')
  }
}

export function offTableSessionUpdate(): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot remove listener - running on server-side')
    return
  }

  if (socket) {
    console.log('🔇 Removing tableSessionUpdate listener')
    socket.off('tableSessionUpdate')
  } else {
    console.warn('⚠️ Cannot remove listener - socket not initialized')
  }
}

// Listen for tables list/status updates (global room)
export function onTablesUpdate(callback: (update: any) => void): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot set up tables listener - running on server-side')
    return
  }

  if (socket) {
    console.log('👂 Setting up tablesUpdate listener')
    socket.on('tablesUpdate', (update) => {
      console.log('📨 Received tablesUpdate:', update)
      callback(update)
    })
  } else {
    console.warn('⚠️ Cannot set up tables listener - socket not initialized')
  }
}

export function offTablesUpdate(): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot remove tables listener - running on server-side')
    return
  }

  if (socket) {
    console.log('🔇 Removing tablesUpdate listener')
    socket.off('tablesUpdate')
  } else {
    console.warn('⚠️ Cannot remove tables listener - socket not initialized')
  }
}

// Cart synchronization events
export function onCartUpdate(callback: (cartData: any) => void): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot set up cart listener - running on server-side')
    return
  }

  if (socket) {
    console.log('🛒 Setting up cartUpdate listener')
    socket.on('cartUpdate', (cartData) => {
      console.log('📦 Received cartUpdate:', cartData)
      callback(cartData)
    })
  } else {
    console.warn('⚠️ Cannot set up cart listener - socket not initialized')
  }
}

export function offCartUpdate(): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot remove cart listener - running on server-side')
    return
  }

  if (socket) {
    console.log('🔇 Removing cartUpdate listener')
    socket.off('cartUpdate')
  } else {
    console.warn('⚠️ Cannot remove cart listener - socket not initialized')
  }
}

export function emitCartUpdate(tableId: string, cartItems: any[], groupType?: string): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot emit cart update - running on server-side')
    return
  }

  if (socket && socket.connected) {
    socket.emit('cart-update', { tableId, cartItems, groupType })
    console.log(`🛒 Emitted cart update for table ${tableId} (${groupType || 'no group'}):`, cartItems)
  } else {
    console.warn('⚠️ Cannot emit cart update - socket not connected')
  }
}

// Order confirmation synchronization events
export function onOrderConfirmation(callback: (orderData: any) => void): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot set up order confirmation listener - running on server-side')
    return
  }

  if (socket) {
    console.log('📋 Setting up orderConfirmation listener')
    socket.on('orderConfirmation', (orderData) => {
      console.log('✅ Received orderConfirmation:', orderData)
      callback(orderData)
    })
  } else {
    console.warn('⚠️ Cannot set up order confirmation listener - socket not initialized')
  }
}

export function offOrderConfirmation(): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot remove order confirmation listener - running on server-side')
    return
  }

  if (socket) {
    console.log('🔇 Removing orderConfirmation listener')
    socket.off('orderConfirmation')
  } else {
    console.warn('⚠️ Cannot remove order confirmation listener - socket not initialized')
  }
}

export function emitOrderConfirmation(tableId: string, orderData: any, groupType?: string): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot emit order confirmation - running on server-side')
    return
  }

  if (socket && socket.connected) {
    socket.emit('order-confirmation', { tableId, orderData, groupType })
    console.log(`📋 Emitted order confirmation for table ${tableId} (${groupType || 'no group'}):`, orderData)
  } else {
    console.warn('⚠️ Cannot emit order confirmation - socket not connected')
  }
}

export function disconnectSocket(): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot disconnect - running on server-side')
    return
  }

  if (socket) {
    console.log('🔌 Disconnecting Socket.IO client')
    socket.disconnect()
    socket = null
  }
}