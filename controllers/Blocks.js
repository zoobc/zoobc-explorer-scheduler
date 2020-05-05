const moment = require('moment')

const BaseController = require('./BaseController')
const config = require('../config')
const { Block } = require('../protos')
const { store, util } = require('../utils')
const { BlocksService } = require('../services')

module.exports = class Blocks extends BaseController {
  constructor() {
    super(new BlocksService())
  }

  update(callback) {
    store.blocksAddition = false
    store.publishedReceipts = []

    this.service.getLastHeight((err, result) => {
      if (err) return callback(`[Blocks] Blocks Service - Get Last Height ${err}`, null)

      const params = { Limit: config.app.limitData, Height: result ? parseInt(result.Height + 1) : 0 }
      Block.GetBlocks(params, (err, result) => {
        if (err) return callback(`[Blocks] Block - Get Blocks ${err}`, null)
        if (result && result.Blocks && result.Blocks.length < 1) return callback(null, null)

        const matchs = ['BlockID', 'Height']
        const items = result.Blocks.map(item => {
          const TotalRewards = parseFloat(item.Block.TotalCoinBase) + parseFloat(item.Block.TotalFee)
          const SkippedBlockSmithMapped =
            item.SkippedBlocksmiths.length > 0 &&
            item.SkippedBlocksmiths.map(skipped => {
              let val = skipped
              val.BlocksmithPublicKey = util.bufferStr(skipped.BlocksmithPublicKey)
              return val
            })

          return {
            BlockID: item.Block.ID,
            BlockHash: item.Block.BlockHash,
            PreviousBlockID: item.Block.PreviousBlockHash,
            Height: item.Block.Height,
            Timestamp: new Date(moment.unix(item.Block.Timestamp).valueOf()),
            BlockSeed: item.Block.BlockSeed,
            BlockSignature: item.Block.BlockSignature,
            CumulativeDifficulty: item.Block.CumulativeDifficulty,
            SmithScale: item.Block.SmithScale,
            BlocksmithID: util.bufferStr(item.Block.BlocksmithPublicKey),
            TotalAmount: item.Block.TotalAmount,
            TotalAmountConversion: util.zoobitConversion(item.Block.TotalAmount),
            TotalFee: item.Block.TotalFee,
            TotalFeeConversion: util.zoobitConversion(item.Block.TotalFee),
            TotalCoinBase: item.Block.TotalCoinBase,
            TotalCoinBaseConversion: util.zoobitConversion(item.Block.TotalCoinBase),
            Version: item.Block.Version,
            PayloadLength: item.Block.PayloadLength,
            PayloadHash: item.Block.PayloadHash,

            /** BlockExtendedInfo */
            TotalReceipts: item.TotalReceipts,
            PopChange: item.PopChange,
            ReceiptValue: item.ReceiptValue,
            BlocksmithAddress: item.BlocksmithAccountAddress,
            SkippedBlocksmiths: SkippedBlockSmithMapped,

            /** Aggregate */
            TotalRewards,
            TotalRewardsConversion: util.zoobitConversion(TotalRewards),

            /** Relations */
            Transactions: item.Block.Transactions,
            PublishedReceipts: item.Block.PublishedReceipts,
          }
        })

        this.service.upserts(items, matchs, (err, result) => {
          if (err) return callback(`[Blocks] Upsert ${err}`, null)
          if (result && result.result.ok !== 1) return callback('[Blocks] Upsert data failed', null)

          store.blocksAddition = true

          const publishBlocks = items
            .slice(0, 5)
            .sort((a, b) => (a.Height > b.Height ? -1 : 1))
            .map(m => {
              return {
                BlockID: m.BlockID,
                Height: m.Height,
                BlocksmithAddress: m.BlocksmithAddress,
                Timestamp: m.Timestamp,
              }
            })

          return callback(null, { data: publishBlocks, message: `[Blocks] Upsert ${items.length} data successfully` })
        })
      })
    })
  }
}
