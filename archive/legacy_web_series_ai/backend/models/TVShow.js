const mongoose = require('mongoose')

const episodeSchema = new mongoose.Schema({
  episodeNumber: Number,
  name: String,
  overview: String,
  stillPath: String,
  airDate: String,
  runtime: Number,
  voteAverage: Number,
  voteCount: Number
}, { _id: false })

const seasonSchema = new mongoose.Schema({
  seasonNumber: Number,
  name: String,
  overview: String,
  posterPath: String,
  airDate: String,
  episodeCount: Number,
  episodes: [episodeSchema],
  episodesCachedAt: Date
}, { _id: false })

const tvShowSchema = new mongoose.Schema({
  tmdbId: { type: Number, unique: true, required: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  overview: String,
  posterPath: String,
  backdropPath: String,
  firstAirDate: String,
  genres: [{ id: Number, name: String }],
  status: String,
  numberOfSeasons: Number,
  numberOfEpisodes: Number,
  voteAverage: { type: Number, default: 0 },
  voteCount: { type: Number, default: 0 },
  popularity: { type: Number, default: 0 },
  networks: [{ id: Number, name: String }],
  seasons: [seasonSchema],
  cachedAt: { type: Date, default: Date.now }
}, { timestamps: true })

tvShowSchema.index({ popularity: -1 })
tvShowSchema.index({ voteAverage: -1 })

module.exports = mongoose.model('TVShow', tvShowSchema)
