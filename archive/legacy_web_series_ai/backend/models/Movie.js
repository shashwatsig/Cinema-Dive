const mongoose = require('mongoose')

const movieSchema = new mongoose.Schema({
  tmdbId: { type: Number, unique: true, required: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  overview: String,
  posterPath: String,
  backdropPath: String,
  releaseDate: String,
  genres: [{ id: Number, name: String }],
  runtime: Number,
  voteAverage: { type: Number, default: 0 },
  voteCount: { type: Number, default: 0 },
  popularity: { type: Number, default: 0 },
  trailerKey: String,
  cachedAt: { type: Date, default: Date.now }
}, { timestamps: true })

movieSchema.index({ popularity: -1 })
movieSchema.index({ voteAverage: -1 })

module.exports = mongoose.model('Movie', movieSchema)
