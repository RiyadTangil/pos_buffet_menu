const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3002

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  // Store io instance globally for API routes to access
  global.io = io

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id)
    //console.log('📊 Total connected clients:', io.engine.clientsCount)

    // Join table room for real-time updates
    socket.on('join-table', (roomData) => {
      // Handle both old format (string) and new format (object with tableId and groupType)
      let tableId, groupType, roomName
      
      if (typeof roomData === 'string') {
        // Legacy support for old format
        tableId = roomData
        roomName = `table-${tableId}`
      } else {
        // New format with groupType
        tableId = roomData.tableId
        groupType = roomData.groupType
        roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
      }
      
      socket.join(roomName)
      console.log(`🏠 Socket ${socket.id} joined ${roomName}`)
      //console.log(`👥 Clients in ${roomName}:`, io.sockets.adapter.rooms.get(roomName)?.size || 0)
    })

    // Join global tables room
    socket.on('join-tables', () => {
      socket.join('tables')
      //console.log(`🏠 Socket ${socket.id} joined tables room`)
      ////console.log(`👥 Clients in tables room:`, io.sockets.adapter.rooms.get('tables')?.size || 0)
    })

    // Leave table room
    socket.on('leave-table', (roomData) => {
      // Handle both old format (string) and new format (object with tableId and groupType)
      let tableId, groupType, roomName
      
      if (typeof roomData === 'string') {
        // Legacy support for old format
        tableId = roomData
        roomName = `table-${tableId}`
      } else {
        // New format with groupType
        tableId = roomData.tableId
        groupType = roomData.groupType
        roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
      }
      
      socket.leave(roomName)
      //console.log(`🚪 Socket ${socket.id} left ${roomName}`)
      //console.log(`👥 Remaining clients in ${roomName}:`, io.sockets.adapter.rooms.get(roomName)?.size || 0)
    })

    // Leave global tables room
    socket.on('leave-tables', () => {
      socket.leave('tables')
      //console.log(`🚪 Socket ${socket.id} left tables room`)
      //console.log(`👥 Clients in tables room:`, io.sockets.adapter.rooms.get('tables')?.size || 0)
    })

    // Handle cart updates
    socket.on('cart-update', (data) => {
      const { tableId, cartItems, groupType } = data
      const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
      //console.log(`🛒 Received cart update for ${roomName}:`, cartItems)
      // Broadcast to all other clients in the same table-group room
      socket.to(roomName).emit('cartUpdate', { tableId, cartItems, groupType })
      //console.log(`📡 Broadcasted cart update to ${roomName}`)
    })

    // Handle order confirmation updates
    socket.on('order-confirmation', (data) => {
      const { tableId, orderData, groupType } = data
      const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
      //console.log(`📋 Received order confirmation for ${roomName}:`, orderData)
      // Broadcast to all other clients in the same table-group room
      socket.to(roomName).emit('orderConfirmation', { tableId, orderData, groupType })
      //console.log(`📡 Broadcasted order confirmation to ${roomName}`)
    })

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
      //console.log('📊 Remaining connected clients:', io.engine.clientsCount)
    })
  })

  // Add global broadcast function for debugging
  global.broadcastTableSessionUpdate = (tableId, sessionData, groupType) => {
    const roomName = groupType ? `table-${tableId}-${groupType}` : `table-${tableId}`
    //console.log(`📡 Broadcasting table session update for ${roomName}`)
    //console.log(`📋 Session data:`, JSON.stringify(sessionData, null, 2))
    //console.log(`👥 Broadcasting to ${io.sockets.adapter.rooms.get(roomName)?.size || 0} clients`)
    io.to(roomName).emit('tableSessionUpdate', sessionData)
  }

  // Broadcast updates to all clients in the tables room
  global.broadcastTablesUpdate = (update) => {
    //console.log(`📡 Broadcasting tables update`)
    //console.log(`📋 Update data:`, JSON.stringify(update, null, 2))
    console.log(`👥 Broadcasting to ${io.sockets.adapter.rooms.get('tables')?.size || 0} clients`)
    io.to('tables').emit('tablesUpdate', update)
  }

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})