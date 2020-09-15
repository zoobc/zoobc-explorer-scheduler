const moment = require('moment')
const config = require('../config')
const BaseController = require('./BaseController')
const { store, util, msg, response } = require('../utils')
const { BlocksService, GeneralsService } = require('../services')
const { Block, PublishedReceipt, SkippedBlockSmiths } = require('../protos')

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
          if (err) return resolve(null)
          return resolve(res)
        })
      })
    }

    const getSkippedBlockSmiths = async BlockHeight => {
      return new Promise(resolve => {
        SkippedBlockSmiths.GetSkippedBlockSmiths({ BlockHeightStart: BlockHeight, BlockHeightEnd: BlockHeight }, (err, res) => {
          if (err) return resolve(null)
          return resolve(res)
        })
      })
    }

    const promises = blocks.map(async item => {
      const TotalRewards = parseFloat(item.TotalCoinBase) + parseFloat(item.TotalFee)

      let skippedsMapped = []
      let receiptsMapped = []

      const skippeds = await getSkippedBlockSmiths(item.Height)
      const receipts = await getPublishedReceipts(item.Height)

      if (receipts && receipts.PublishedReceipts && receipts.PublishedReceipts.length > 0) {
        receiptsMapped = receipts.PublishedReceipts.map(i => {
          return {
            ...i,
            IntermediateHashes: util.bufferStr(i.IntermediateHashes),
            BatchReceipt: {
              ...i.BatchReceipt,
              SenderPublicKey: util.getZBCAdress(i.BatchReceipt.SenderPublicKey, 'ZNK'),
              RecipientPublicKey: util.getZBCAdress(i.BatchReceipt.RecipientPublicKey, 'ZNK'),
            },
          }
        })
      }

      if (skippeds && skippeds.SkippedBlocksmiths && skippeds.SkippedBlocksmiths.length > 0) {
        skippedsMapped = skippeds.SkippedBlocksmiths.map(i => {
          return {
            ...i,
            BlocksmithPublicKey: util.getZBCAdress(i.BlocksmithPublicKey, 'ZNK'),
          }
        })
      }

      return {
        BlockID: item.ID,
        BlockHash: util.getZBCAdress(item.BlockHash, 'ZBL'),
        PreviousBlockID: util.getZBCAdress(item.PreviousBlockHash, 'ZBL'),
        Height: item.Height,
        Timestamp: new Date(moment.unix(item.Timestamp).valueOf()),
        BlockSeed: item.BlockSeed,
        BlockSignature: item.BlockSignature,
        CumulativeDifficulty: item.CumulativeDifficulty,
        SmithScale: null,
        BlocksmithID: util.getZBCAdress(item.BlocksmithPublicKey, 'ZNK'),
        TotalAmount: item.TotalAmount,
        TotalAmountConversion: util.zoobitConversion(item.TotalAmount),
        TotalFee: item.TotalFee,
        TotalFeeConversion: util.zoobitConversion(item.TotalFee),
        TotalCoinBase: item.TotalCoinBase,
        TotalCoinBaseConversion: util.zoobitConversion(item.TotalCoinBase),
        Version: item.Version,
        PayloadLength: item.PayloadLength,
        PayloadHash: item.PayloadHash,
        /** BlockExtendedInfo */
        TotalReceipts: null,
        PopChange: null,
        ReceiptValue: null,
        BlocksmithAddress: null,
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
      this.generalsService.setValueByKey(store.keyLastCheck, JSON.stringify({ ...lastCheck, HeightBefore: blockHeight }))

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
