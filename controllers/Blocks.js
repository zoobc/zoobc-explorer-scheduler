const moment = require('moment')

const config = require('../config')
const BaseController = require('./BaseController')
const { Block } = require('../protos')
const { queue, store, util, msg, response } = require('../utils')
const { BlocksService, GeneralsService } = require('../services')

module.exports = class Blocks extends BaseController {
  constructor() {
    super(new BlocksService())
    this.generalsService = new GeneralsService()
  }

  static synchronize(service, params) {
    /** send message telegram bot if avaiable */
    if (!params) return response.sendBotMessage('Blocks', '[Blocks] Synchronize - Invalid params')

    return new Promise(resolve => {
      /** get blocks (core) by hight */
      Block.GetBlocks(params, (err, res) => {
        if (err)
          return resolve(
            /** send message telegram bot if avaiable */
            response.sendBotMessage('Blocks', `[Blocks] Proto Get Blocks - ${err}`, `- Params : <pre>${JSON.stringify(params)}</pre>`)
          )
        if (res && res.Blocks && res.Blocks.length < 1) return resolve(null)
        if (res && res.Blocks && res.Blocks.length < 1) return resolve(response.setResult(false, '[Blocks] No additional data'))

        /** mapping result */
        const payloads = res.Blocks.map(item => {
          const TotalRewards = parseFloat(item.Block.TotalCoinBase) + parseFloat(item.Block.TotalFee)

          const SkippedBlockSmithMapped =
            (item.SkippedBlocksmiths && item.SkippedBlocksmiths.length > 0) ||
            item.SkippedBlocksmiths.map(i => {
              return {
                ...i,
                BlocksmithPublicKey: util.bufferStr(i.BlocksmithPublicKey),
              }
            })

          const PublishedReceiptsMapped =
            (item.Block && item.Block.PublishedReceipts && item.Block.PublishedReceipts.length > 0) ||
            item.Block.PublishedReceipts.map(i => {
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
            // Transactions: item.Block.Transactions,
            // PublishedReceipts: item.Block.PublishedReceipts,
            PublishedReceipts: PublishedReceiptsMapped,
          }
        })

        /** update or insert data */
        service.upserts(payloads, ['BlockID', 'Height'], (err, res) => {
          /** send message telegram bot if avaiable */
          if (err) return resolve(response.sendBotMessage('Blocks', `[Blocks] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return resolve(response.setError('[Blocks] Upsert data failed'))

          /** subscribe graphql */
          const subscribeBlocks = payloads
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

          return resolve(response.setResult(true, `[Blocks] Upsert ${payloads.length} data successfully`, subscribeBlocks))
        })
      })
    })
  }

  update(callback) {
    /** get last height block (local) */
    this.service.getLastHeight(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Blocks', `[Blocks] Blocks Service - Get Last Height ${err}`))

      /** getting value last check height transaction */
      const generalLastCheckTransactionHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0

      /** initiating the queue */
      queue.init('Queue Blocks')

      /** adding a job to the queue */
      const blockHeight = res ? parseInt(res.Height + 1) : 0
      const params = { Limit: config.app.limitData, Height: blockHeight }
      msg.blue(`[Height] Last block height is ${blockHeight > 0 ? blockHeight - 1 : 0}`)
      msg.blue(`[Height] Last check transaction height is ${generalLastCheckTransactionHeight}`)
      queue.addJob(params)

      /** processing job the queue */
      queue.processJob(Blocks.synchronize, this.service)

      return callback(response.setResult(true, `[Queue] ${config.app.limitData} Blocks on processing`))
    })
  }
}
