const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    Username: { type: String, index: true },
    Email: { type: String },
    Password: { type: String },
    Role: { type: String },
    Active: { type: Boolean },
    ResetToken: { type: String },
    ResetExpired: { type: Date },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Admins', schema)
