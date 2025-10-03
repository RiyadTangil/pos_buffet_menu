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
    console.log('📊 Total connected clients:', io.engine.clientsCount)

    // Join table room for real-time updates
    socket.on('join-table', (tableId) => {
      socket.join(`table-${tableId}`)
      console.log(`🏠 Socket ${socket.id} joined table-${tableId}`)
      console.log(`👥 Clients in table-${tableId}:`, io.sockets.adapter.rooms.get(`table-${tableId}`)?.size || 0)
    })

    // Join global tables room
    socket.on('join-tables', () => {
      socket.join('tables')
      console.log(`🏠 Socket ${socket.id} joined tables room`)
      console.log(`👥 Clients in tables room:`, io.sockets.adapter.rooms.get('tables')?.size || 0)
    })

    // Leave table room
    socket.on('leave-table', (tableId) => {
      socket.leave(`table-${tableId}`)
      console.log(`🚪 Socket ${socket.id} left table-${tableId}`)
      console.log(`👥 Remaining clients in table-${tableId}:`, io.sockets.adapter.rooms.get(`table-${tableId}`)?.size || 0)
    })

    // Leave global tables room
    socket.on('leave-tables', () => {
      socket.leave('tables')
      console.log(`🚪 Socket ${socket.id} left tables room`)
      console.log(`👥 Clients in tables room:`, io.sockets.adapter.rooms.get('tables')?.size || 0)
    })

    // Handle cart updates
    socket.on('cart-update', (data) => {
      const { tableId, cartItems } = data
      console.log(`🛒 Received cart update for table-${tableId}:`, cartItems)
      // Broadcast to all other clients in the same table room
      socket.to(`table-${tableId}`).emit('cartUpdate', { tableId, cartItems })
      console.log(`📡 Broadcasted cart update to table-${tableId}`)
    })

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
      console.log('📊 Remaining connected clients:', io.engine.clientsCount)
    })
  })

  // Add global broadcast function for debugging
  global.broadcastTableSessionUpdate = (tableId, sessionData) => {
    console.log(`📡 Broadcasting table session update for table-${tableId}`)
    console.log(`📋 Session data:`, JSON.stringify(sessionData, null, 2))
    console.log(`👥 Broadcasting to ${io.sockets.adapter.rooms.get(`table-${tableId}`)?.size || 0} clients`)
    io.to(`table-${tableId}`).emit('tableSessionUpdate', sessionData)
  }

  // Broadcast updates to all clients in the tables room
  global.broadcastTablesUpdate = (update) => {
    console.log(`📡 Broadcasting tables update`)
    console.log(`📋 Update data:`, JSON.stringify(update, null, 2))
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