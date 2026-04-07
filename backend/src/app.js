const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')

/* Routes */
const authRoutes = require('./routes/auth.routes')
const chatRoutes = require('./routes/chat.routes')

const app = express()

/* Using Middlewares */
app.use(cors({
  origin: 'http://localhost:5773', // Your frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie']
}))
app.use(express.json())
app.use(cookieParser())

// Health check endpoint (uncomment this)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

/* Using Routes */
app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)

module.exports = app