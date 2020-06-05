const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema({
    SenderAccountAddress: { type: String },
    RecipientAccountAddress: { type: String },
    Fee: { type: Number },
    FeeConversion: { type: String },
    Amount: { type: Number },
    AmountConversion: { type: String },
    BlockHeight: { type: Number },
    Timestamp: { type: Date },
    TransactionID: { type: String },
    Transaction: { type: mongoose.Schema.Types.Object },
    Escrow: { type: mongoose.Schema.Types.Object },
}, {
    toJSON: { virtuals: true },
})

schema.plugin(upserts)

module.exports = mongoose.model('Account_Transactions', schema)