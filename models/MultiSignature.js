const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema({
    MultiSignature: {
        MultiSignatureInfo: {
            MultisigAddress: { type: String },
            BlockHeight: { type: Number },
            Nonce: { type: String },
            MinimumSignatures: { type: Number },
            Addresses: { type: [String], default: undefined, },
            Latest: { type: Boolean },
        },
        UnsignedTransactionBytes: { type: Buffer },
        SignatureInfo: {
            TransactionHash: { type: Buffer },
            Signatures: {
                type: Map,
                of: String,
            },
        },
    }
}, {
    toJSON: { virtuals: true },
})

schema.plugin(upserts)

module.exports = mongoose.model('Multi_Signature', schema)