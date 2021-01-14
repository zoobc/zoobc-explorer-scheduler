const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    Admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admins' },
    Host: { type: String },
    UserAgent: { type: String },
    LoginAt: { type: Date },
    ExpiredToken: { type: Date },
    LogoutAt: { type: Date },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('AdminLogs', schema)
