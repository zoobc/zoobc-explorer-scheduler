/** 
 * ZooBC Copyright (C) 2020 Quasisoft Limited - Hong Kong
 * This file is part of ZooBC <https://github.com/zoobc/zoobc-explorer-scheduler>

 * ZooBC is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * ZooBC is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with ZooBC.  If not, see <http://www.gnu.org/licenses/>.

 * Additional Permission Under GNU GPL Version 3 section 7.
 * As the special exception permitted under Section 7b, c and e, 
 * in respect with the Author’s copyright, please refer to this section:

 * 1. You are free to convey this Program according to GNU GPL Version 3,
 *     as long as you respect and comply with the Author’s copyright by 
 *     showing in its user interface an Appropriate Notice that the derivate 
 *     program and its source code are “powered by ZooBC”. 
 *     This is an acknowledgement for the copyright holder, ZooBC, 
 *     as the implementation of appreciation of the exclusive right of the
 *     creator and to avoid any circumvention on the rights under trademark
 *     law for use of some trade names, trademarks, or service marks.

 * 2. Complying to the GNU GPL Version 3, you may distribute 
 *     the program without any permission from the Author. 
 *     However a prior notification to the authors will be appreciated.

 * ZooBC is architected by Roberto Capodieci & Barton Johnston
 * contact us at roberto.capodieci[at]blockchainzoo.com
 * and barton.johnston[at]blockchainzoo.com

 * IMPORTANT: The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions of the Software.
**/

const moment = require('moment')
const config = require('../config')
const BaseController = require('./BaseController')
const { util, msg, response } = require('../utils')
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
            IntermediateHashes: i.IntermediateHashes,
            IntermediateHashesFormatted: util.bufferStr(i.IntermediateHashes),
            Receipt: {
              ...i.Receipt,
              SenderPublicKey: i.Receipt.SenderPublicKey,
              SenderPublicKeyFormatted: util.getZBCAddress(i.Receipt.SenderPublicKey, 'ZNK'),
              RecipientPublicKey: i.Receipt.RecipientPublicKey,
              RecipientPublicKeyFormatted: util.getZBCAddress(i.Receipt.RecipientPublicKey, 'ZNK'),
            },
          }
        })
      }

      if (skippeds && skippeds.SkippedBlocksmiths && skippeds.SkippedBlocksmiths.length > 0) {
        skippedsMapped = skippeds.SkippedBlocksmiths.map(i => {
          return {
            ...i,
            BlocksmithPublicKey: i.BlocksmithPublicKey,
            BlocksmithPublicKeyFormatted: util.getZBCAddress(i.BlocksmithPublicKey, 'ZNK'),
          }
        })
      }

      return {
        BlockID: item.ID,
        BlockHash: item.BlockHash,
        BlockHashFormatted: util.getZBCAddress(item.BlockHash, 'ZBL'),
        PreviousBlockID: item.PreviousBlockHash,
        PreviousBlockIDFormatted: util.getZBCAddress(item.PreviousBlockHash, 'ZBL'),
        Height: item.Height,
        Timestamp: new Date(moment.unix(item.Timestamp).valueOf()),
        BlockSeed: item.BlockSeed,
        BlockSignature: item.BlockSignature,
        CumulativeDifficulty: item.CumulativeDifficulty,
        SmithScale: null,
        BlocksmithID: item.BlocksmithPublicKey,
        BlocksmithIDFormatted: util.getZBCAddress(item.BlocksmithPublicKey, 'ZNK'),
        TotalAmount: item.TotalAmount,
        TotalAmountConversion: util.zoobitConversion(item.TotalAmount),
        TotalFee: item.TotalFee,
        TotalFeeConversion: util.zoobitConversion(item.TotalFee),
        TotalCoinBase: item.TotalCoinBase,
        TotalCoinBaseConversion: util.zoobitConversion(item.TotalCoinBase),
        Version: item.Version,
        PayloadLength: item.PayloadLength,
        PayloadHash: item.PayloadHash,
        MerkleRoot: item.MerkleRoot,
        MerkleTree: item.MerkleTree,
        ReferenceBlockHeight: item.ReferenceBlockHeight,

        /** BlockExtendedInfo */
        TotalReceipts: null,
        PopChange: null,
        ReceiptValue: null,
        BlocksmithAddress: null,
        BlocksmithAddressFormatted: null,
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
            response.sendBotMessage('Blocks', `[Blocks] API Core Get Blocks - ${err}`, `- Params : <pre>${JSON.stringify(params)}</pre>`)
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
