const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    /** Block */
    BlockID: { type: String } /** ID */,
    BlockHash: { type: Buffer },
    PreviousBlockID: { type: Buffer } /** PreviousBlockHash */,
    Height: { type: Number },
    Timestamp: { type: Date },
    BlockSeed: { type: Buffer },
    BlockSignature: { type: Buffer },
    CumulativeDifficulty: { type: String },
    SmithScale: { type: Number },
    BlocksmithID: { type: String } /** BlocksmithPublicKey */,
    TotalAmount: { type: Number },
    TotalAmountConversion: { type: String },
    TotalFee: { type: Number },
    TotalFeeConversion: { type: String },
    TotalCoinBase: { type: Number },
    TotalCoinBaseConversion: { type: String },
    Version: { type: Number },
    PayloadLength: { type: Number },
    PayloadHash: { type: Buffer },

    /** BlockExtendedInfo */
    TotalReceipts: { type: Number },
    ReceiptValue: { type: Number },
    PopChange: { type: String },
    BlocksmithAddress: { type: String } /** BlocksmithAccountAddress */,
    SkippedBlocksmiths: [
      {
        BlocksmithPublicKey: { type: String },
        POPChange: { type: String },
        BlockHeight: { type: Number },
        BlocksmithIndex: { type: Number },
      },
    ],

    /** Aggregate */
    TotalRewards: { type: Number },
    TotalRewardsConversion: { type: String },

    /** Relations */
    Transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transactions' }],
    PublishedReceipts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Published_Receipts' }],
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Blocks', schema)
