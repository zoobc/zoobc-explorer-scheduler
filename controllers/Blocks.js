const moment = require('moment')
const config = require('../config')
const BaseController = require('./BaseController')
const { Block, PublishedReceipt } = require('../protos')
const { util, msg, response } = require('../utils')
const { BlocksService, GeneralsService } = require('../services')

const formatDate = 'DD MMM YYYY hh:mm:ss'

module.exports = class Blocks extends BaseController {
  constructor() {
    super(new BlocksService())
    this.generalsService = new GeneralsService()
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
      Block.GetBlocks(params, (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage('Blocks', `[Blocks] Proto Get Blocks - ${err}`, `- Params : <pre>${JSON.stringify(params)}</pre>`)
          )

        if (res && res.Blocks && res.Blocks.length < 1) return callback(response.setResult(false, '[Blocks] No additional data'))

        /** get the value of Published receipt from between heights */
        const maxHeight = res.Blocks.reduce((max, ress) => (ress.Block.Height > max ? ress.Block.Height : max), res.Blocks[0].Block.Height)

        const param = { FromHeight: blockHeight, ToHeight: maxHeight }

        PublishedReceipt.GetPublishedReceipts(param, (err, result) => {
          if (err)
            return callback(
              /** send message telegram bot if avaiable */
              response.sendBotMessage(
                'Blocks',
                `[Blocks] Proto Get Published Receipt - ${err}`,
                `- Params : <pre>${JSON.stringify(params)}</pre>`
              )
            )

          if (result && result.PublishedReceipts && result.length < 1)
            return callback(response.setResult(false, '[Blocks] No additional data for Get Published Receipt'))

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

            const receipt = result.PublishedReceipts.filter(f => f.BlockHeight === item.Block.Height)
            const PublishedReceipts =
              (receipt && receipt.PublishedReceipts && receipt.PublishedReceipts.length > 0) ||
              receipt.map(i => {
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
              PublishedReceipts: PublishedReceipts,
            }
          })

          /** update or insert data */
          this.service.upserts(payloads, ['BlockID', 'Height'], (err, res) => {
            /** send message telegram bot if avaiable */
            if (err) return callback(response.sendBotMessage('Blocks', `[Blocks] Upsert - ${err}`))
            if (res && res.result.ok !== 1) return callback(response.setError('[Blocks] Upsert data failed'))

            return callback(response.setResult(true, `[Blocks] Upsert ${payloads.length} data successfully`))
          })
        })
      })
    })
  }
}
