const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    AccountAddress: { type: String },
    BalanceChange: { type: Number },
    BlockHeight: { type: Number },
    TransactionID: { type: Number },
    Timestamp: { type: Date },
    EventType: { type: String },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('AccountLedgers', schema)
