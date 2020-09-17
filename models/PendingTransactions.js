const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    SenderAddress: { type: String },
    TransactionHash: { type: Buffer },
    TransactionByte: { type: Buffer },
    Status: { type: String },
    BlockHeight: { type: Number },
    Latest: { type: Boolean },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('PendingTransaction', schema)
