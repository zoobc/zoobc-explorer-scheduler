const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    /** Block */
    BlockID: { type: String } /** ID */,
    BlockHash: { type: Buffer },
    BlockHashFormatted: { type: String } /** update */,
    PreviousBlockID: { type: Buffer } /** PreviousBlockHash */,
    PreviousBlockIDFormatted: { type: String } /** update */,
    Height: { type: Number },
    Timestamp: { type: Date },
    BlockSeed: { type: Buffer },
    BlockSignature: { type: Buffer },
    CumulativeDifficulty: { type: String },
    SmithScale: { type: Number },
    BlocksmithID: { type: Buffer } /** BlocksmithPublicKey */,
    BlocksmithIDFormatted: { type: String } /** update */,
    TotalAmount: { type: Number },
    TotalAmountConversion: { type: String },
    TotalFee: { type: Number },
    TotalFeeConversion: { type: String },
    TotalCoinBase: { type: Number },
    TotalCoinBaseConversion: { type: String },
    Version: { type: Number },
    PayloadLength: { type: Number },
    PayloadHash: { type: Buffer },
    MerkleRoot: { type: Buffer },
    MerkleTree: { type: Buffer },
    ReferenceBlockHeight: { type: Number },

    /** BlockExtendedInfo */
    TotalReceipts: { type: Number },
    ReceiptValue: { type: Number },
    PopChange: { type: String },
    BlocksmithAddress: { type: Buffer } /** BlocksmithAccountAddress */,
    BlocksmithAddressFormatted: { type: String } /** update */,
    SkippedBlocksmiths: [
      {
        BlocksmithPublicKey: { type: Buffer },
        BlocksmithPublicKeyFormatted: { type: String } /** update */,
        POPChange: { type: String },
        BlockHeight: { type: Number },
        BlocksmithIndex: { type: Number },
      },
    ],

    PublishedReceipts: [
      {
        IntermediateHashes: { type: Buffer },
        IntermediateHashesFormatted: { type: String } /** update */,
        BlockHeight: { type: Number },
        ReceiptIndex: { type: Number },
        PublishedIndex: { type: Number },
        Receipt: {
          SenderPublicKey: { type: Buffer },
          SenderPublicKeyFormatted: { type: String } /** update */,
          RecipientPublicKey: { type: Buffer },
          RecipientPublicKeyFormatted: { type: String } /** update */,
          DatumType: { type: Number },
          DatumHash: { type: Buffer },
          ReferenceBlockHeight: { type: Number },
          ReferenceBlockHash: { type: Buffer },
          RMRLinked: { type: Buffer },
          RecipientSignature: { type: Buffer },
        },
      },
    ],

    /** Aggregate */
    TotalRewards: { type: Number },
    TotalRewardsConversion: { type: String },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Blocks', schema)
