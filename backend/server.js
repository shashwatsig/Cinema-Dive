const dotenv = require('dotenv')
dotenv.config()

const express = require('express')
const cors = require('cors')
const compression = require('compression')
const helmet = require('helmet')
const path = require('path')
const connectDB = require('./config/database')

const app = express()

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173']

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:', 'https:', 'https://image.tmdb.org'],
      'connect-src': ["'self'", 'http://localhost:5000', ...corsOrigins]
    }
  },
  crossOriginEmbedderPolicy: false
}))

app.use(compression({ level: 6, threshold: 1024 }))

connectDB().catch((err) => console.warn('DB init failed:', err.message))

app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
  app.use(express.static(frontendDist))
}

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => { console.log(`${req.method} ${req.path}`); next() })
}

app.use((req, res, next) => {
  res.setTimeout(20000, () => {
    if (!res.headersSent) res.status(503).json({ message: 'Request timed out' })
  })
  next()
})

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/movies', require('./routes/movies'))
app.use('/api/tv', require('./routes/tv'))
app.use('/api/search', require('./routes/search'))
app.use('/api/watchlist', require('./routes/watchlist'))
app.use('/api/favorites', require('./routes/favorites'))

app.get('/api/health', (req, res) => {
  res.json({ message: 'Cinema Dive API is running', tmdbConfigured: require('./services/tmdbService').isConfigured() })
})

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

app.use((req, res) => res.status(404).json({ message: 'Route not found' }))
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

const PORT = Number(process.env.PORT || 5000)

const startServer = (port = PORT) => {
  const server = app.listen(port, () => console.log(`Cinema Dive API running on port ${port}`))
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} busy, trying ${port + 1}`)
      server.close(() => startServer(port + 1))
    } else {
      console.error('Server error:', err)
      process.exit(1)
    }
  })
}

startServer()
