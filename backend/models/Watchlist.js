const mongoose = require('mongoose')

const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tmdbId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv'], required: true },
  title: String,
  posterPath: String,
  voteAverage: Number,
  releaseDate: String,
  status: { type: String, enum: ['Planned', 'Watching', 'Completed', 'Dropped'], default: 'Planned' }
}, { timestamps: true })

watchlistSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true })

module.exports = mongoose.model('Watchlist', watchlistSchema)
