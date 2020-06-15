const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    AccountAddress: { type: String },
    MultiSignature: {
      MultiSignatureInfo: {
        MultisigAddress: { type: String },
        BlockHeight: { type: Number },
        Nonce: { type: String },
        MinimumSignatures: { type: Number },
        Latest: { type: Boolean },
        Addresses: {
          type: [String],
          default: undefined,
        },
      },
      UnsignedTransactionBytes: { type: Buffer },
      SignatureInfo: {
        TransactionHash: { type: Buffer },
        Signatures: {
          type: Map,
          of: Buffer,
        },
      },
    },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Multi_Signature', schema)
