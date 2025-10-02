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

export function joinTableRoom(tableId: string): Promise<void> {
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

    if (socket.connected) {
      socket.emit('join-table', tableId)
      console.log(`🏠 Client joined table room: table-${tableId}`)
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
        socket.emit('join-table', tableId)
        console.log(`🏠 Client joined table room: table-${tableId}`)
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

export function leaveTableRoom(tableId: string): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot leave table room - running on server-side')
    return
  }

  if (socket && socket.connected) {
    socket.emit('leave-table', tableId)
    console.log(`🚪 Client left table room: table-${tableId}`)
  } else {
    console.warn('⚠️ Cannot leave table room - socket not connected')
  }
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

export function emitCartUpdate(tableId: string, cartItems: any[]): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    console.log('🚫 Cannot emit cart update - running on server-side')
    return
  }

  if (socket && socket.connected) {
    socket.emit('cart-update', { tableId, cartItems })
    console.log(`🛒 Emitted cart update for table ${tableId}:`, cartItems)
  } else {
    console.warn('⚠️ Cannot emit cart update - socket not connected')
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