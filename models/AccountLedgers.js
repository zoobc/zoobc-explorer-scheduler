const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    AccountAddress: { type: Buffer },
    AccountAddressFormatted: { type: String } /** update */,
    BalanceChange: { type: Number },
    BalanceChangeConversion: { type: String },
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
