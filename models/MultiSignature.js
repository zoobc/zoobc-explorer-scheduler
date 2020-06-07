const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    MultisigAddress: { type: String },
    BlockHeight: { type: Number },
    Nonce: { type: Number },
    MinimumSignatures: { type: Number },
    Addresses: { type: String },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Multi_Signature', schema)
