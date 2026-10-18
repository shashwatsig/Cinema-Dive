const express = require('express')
const { body, query } = require('express-validator')
const rateLimit = require('express-rate-limit')
const auth = require('../middleware/auth')
const {
  chat,
  getChatHistory,
  getChatSessions,
  saveFeedback,
  getStats,
  initializeChatController
} = require('../ai/chatController')

const router = express.Router()

// Initialize chat controller
initializeChatController().catch(err => {
  console.error('Failed to initialize chat controller:', err.message)
})

// Rate limiters - applied after auth so we can use req.user
const authenticatedLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 20), // 20 requests per minute
  message: 'Too many chat requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Anonymous rate limiter
const anonymousLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_ANONYMOUS || 5),
  message: 'Too many requests. Please try again later.',
  skip: (req) => process.env.NODE_ENV !== 'production'
})

// Validation rules
const chatValidation = [
  body('question')
    .trim()
    .isLength({ min: 3, max: 2000 })
    .withMessage('Question must be between 3 and 2000 characters')
    .notEmpty()
    .withMessage('Question is required'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('Session ID must be a string')
]

const feedbackValidation = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('question')
    .trim()
    .notEmpty()
    .withMessage('Question is required'),
  body('helpful')
    .isBoolean()
    .withMessage('Helpful must be a boolean'),
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment must be less than 500 characters')
]

// ROUTES

/**
 * POST /api/chat
 * Main chat endpoint - ask questions about series
 * Authentication: Required
 * Rate Limit: 20 requests per minute
 */
router.post(
  '/',
  auth,
  authenticatedLimiter,
  chatValidation,
  chat
)

/**
 * GET /api/chat/history
 * Get chat history for authenticated user
 * Authentication: Required
 */
router.get(
  '/history',
  auth,
  [
    query('sessionId')
      .optional()
      .isString()
      .withMessage('Session ID must be a string'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('skip')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Skip must be a non-negative integer')
  ],
  getChatHistory
)

/**
 * GET /api/chat/sessions
 * Get user's chat sessions
 * Authentication: Required
 */
router.get(
  '/sessions',
  auth,
  getChatSessions
)

/**
 * GET /api/chat/stats
 * Get user's chat statistics
 * Authentication: Required
 */
router.get(
  '/stats',
  auth,
  getStats
)

/**
 * POST /api/chat/feedback
 * Save feedback on a chat response
 * Authentication: Required
 */
router.post(
  '/feedback',
  auth,
  feedbackValidation,
  saveFeedback
)

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'Chat service is running' })
})

module.exports = router
