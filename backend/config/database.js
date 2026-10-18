const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 3000,  // fail fast if MongoDB not running
      connectTimeoutMS: 3000
    })
    console.log(`MongoDB Connected: ${conn.connection.host}`)
    return true
  } catch (error) {
    console.warn('Database connection failed:', error.message)
    return false
  }
}

module.exports = connectDB