const moment = require('moment')
const config = require('../config')
const BaseController = require('./BaseController')
const { Block, PublishedReceipt, SkippedBlockSmiths } = require('../protos')
const { util, msg, response } = require('../utils')
const { BlocksService, GeneralsService } = require('../services')

const formatDate = 'DD MMM YYYY hh:mm:ss'

module.exports = class Blocks extends BaseController {
  constructor() {
    super(new BlocksService())
    this.generalsService = new GeneralsService()
  }

  async mappingBlocks(blocks) {
    const getPublishedReceipts = async BlockHeight => {
      return new Promise(resolve => {
        PublishedReceipt.GetPublishedReceipts({ FromHeight: BlockHeight, ToHeight: BlockHeight }, (err, res) => {
          if (err) resolve(null)

          resolve(res)
        })
      })
    }

    const getSkippedBlockSmiths = async BlockHeight => {
      return new Promise(resolve => {
        SkippedBlockSmiths.GetSkippedBlockSmiths({ BlockHeightStart: BlockHeight, BlockHeightEnd: BlockHeight }, (err, res) => {
          if (err) resolve(null)

          resolve(res)
        })
      })
    }

    const promises = blocks.map(async item => {
      const TotalRewards = parseFloat(item.Block.TotalCoinBase) + parseFloat(item.Block.TotalFee)

      const receipts = await getPublishedReceipts(item.Block.Height)

      const skippeds = await getSkippedBlockSmiths(item.Block.Height)

      const receiptsMapped =
        receipts &&
        receipts.PublishedReceipts &&
        receipts.PublishedReceipts.length > 0 &&
        receipts.PublishedReceipts.map(i => {
          return {
            ...i,
            IntermediateHashes: util.bufferStr(i.IntermediateHashes),
            BatchReceipt: {
              ...i.BatchReceipt,
              SenderPublicKey: util.bufferStr(i.BatchReceipt.SenderPublicKey),
              RecipientPublicKey: util.bufferStr(i.BatchReceipt.RecipientPublicKey),
            },
          }
        })

      const skippedsMapped =
        skippeds &&
        skippeds.SkippedBlocksmiths &&
        skippeds.SkippedBlocksmiths.length > 0 &&
        skippeds.SkippedBlocksmiths.map(i => {
          return {
            ...i,
            BlocksmithPublicKey: util.bufferStr(i.BlocksmithPublicKey),
          }
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
        SkippedBlocksmiths: skippedsMapped,
        /** Aggregate */
        TotalRewards,
        TotalRewardsConversion: util.zoobitConversion(TotalRewards),
        /** Relations */
        PublishedReceipts: receiptsMapped,
      }
    })

    return await Promise.all(promises)
  }

  update(callback) {
    /** get last height block (local) */
    this.service.getLastHeight(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Blocks', `[Blocks] Blocks Service - Get Last Height ${err}`))

      /** set last block height */
      const blockHeight = res ? parseInt(res.Height + 1) : 0

      /** getting value last check timestamp transaction */
      const lastCheck = await this.generalsService.getSetLastCheck()

      /** log information */
      if (res && res.Timestamp)
        msg.blue(
          `[Info] Last timestamp block height ${blockHeight > 0 ? blockHeight - 1 : blockHeight} is ${moment(res.Timestamp).format(
            formatDate
          )}`
        )
      if (lastCheck && lastCheck.Height && lastCheck.Timestamp)
        msg.blue(
          `[Info] Last check timestamp transaction height ${lastCheck.Height} is ${moment.unix(lastCheck.Timestamp).format(formatDate)}`
        )

      const params = { Limit: config.app.limitData, Height: blockHeight }
      Block.GetBlocks(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage('Blocks', `[Blocks] Proto Get Blocks - ${err}`, `- Params : <pre>${JSON.stringify(params)}</pre>`)
          )

        if (res && res.Blocks && res.Blocks.length < 1) return callback(response.setResult(false, '[Blocks] No additional data'))

        /** mapping result */
        const payloads = await this.mappingBlocks(res.Blocks)

        /** update or insert data */
        this.service.upserts(payloads, ['BlockID', 'Height'], (err, res) => {
          /** send message telegram bot if avaiable */
          if (err) return callback(response.sendBotMessage('Blocks', `[Blocks] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError('[Blocks] Upsert data failed'))

          return callback(response.setResult(true, `[Blocks] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
