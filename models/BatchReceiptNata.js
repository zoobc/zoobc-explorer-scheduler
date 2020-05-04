const mongoose = require('mongoose');
const { upsertMany } = require('../utils');

const schema = new mongoose.Schema(
  {
    SenderPublicKey: { type: String },
    ReceiverPublicKey: { type: String } /** RecipientPublicKey */,
    DataType: { type: String } /** DatumType */,
    DataHash: { type: Buffer } /** DatumHash */,
    Height: { type: Number } /** ReferenceBlockHeight */,
    ReferenceBlockHash: { type: Buffer } /** additional */,
    ReceiptMerkleRoot: { type: Buffer } /** RMRLinked */,
    ReceiverSignature: { type: Buffer } /** RecipientSignature */,
  },
  {
    toJSON: { virtuals: true },
  }
);

schema.plugin(upsertMany);

module.exports = mongoose.model('Batch_Receipt', schema);
