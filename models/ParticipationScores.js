const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    NodeID: { type: String },
    Score: { type: String },
    Latest: { type: Boolean },
    Height: { type: Number },
    DifferenceScores: { type: Number },
    DifferenceScorePercentage: { type: Number },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('ParticipationScores', schema)
