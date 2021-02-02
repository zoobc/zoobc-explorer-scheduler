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

const BaseController = require('./BaseController')
const config = require('../config')
const { Block } = require('../protos')
const { store, msg, response } = require('../utils')
const {
  NodesService,
  BlocksService,
  AccountsService,
  GeneralsService,
  TransactionsService,
  AccountLedgerService,
  ParticipationScoresService,
} = require('../services')

module.exports = class Rollback extends BaseController {
  constructor() {
    super()
    this.nodesService = new NodesService()
    this.blocksService = new BlocksService()
    this.accountsService = new AccountsService()
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
    this.accountLedgerService = new AccountLedgerService()
    this.participationScoresService = new ParticipationScoresService()
  }

  execute(callback) {
    this.blocksService.getLastHeight(async (err, res) => {
      this.generalsService.setOnRollback(true)

      /** send message telegram bot if avaiable */
      if (err) {
        this.generalsService.setOnRollback(false)
        return callback(response.sendBotMessage('Rollback', `[Rollback] Block Service - Get Last Height ${err}`))
      }
      if (!res) {
        this.generalsService.setOnRollback(false)
        return callback(response.setResult(false, '[Rollback] No data to rollback'))
      }
      if (res && !res.Height) {
        this.generalsService.setOnRollback(false)
        return callback(response.setResult(false, '[Rollback] No data to rollback'))
      }

      const Limit = config.app.limitData * 2
      const Height = parseInt(res.Height) - Limit < 1 ? 0 : parseInt(res.Height) - Limit
      this.recursiveBlockHeight(Limit, Height, async (err, res) => {
        /** send message telegram bot if avaiable */
        if (err) {
          this.generalsService.setOnRollback(false)
          return callback(response.sendBotMessage('Rollback', `[Rollback] Recursive Block Height ${err}`))
        }
        if (!res) {
          this.generalsService.setOnRollback(false)
          return callback(response.setResult(false, '[Rollback] No data to rollback'))
        }

        const blockHeight = res.Height < config.app.limitData ? 0 : res.Height

        /** destroy participation scores */
        this.participationScoresService.destroies({ Height: { $gte: blockHeight } }, (err, res) => {
          if (err) {
            msg.red(`[Rollback] Destroy Participation Scores ${err}`)
          } else if (res && (res.ok < 1 || res.deletedCount < 1)) {
            msg.yellow('[Rollback] No Destroy Participation Scores')
          } else msg.green(`[Rollback] Destroy ${res.deletedCount} Participation Scores`)
        })

        /** destroy account ledgers */
        this.accountLedgerService.destroies({ BlockHeight: { $gte: blockHeight } }, (err, res) => {
          if (err) {
            msg.red(`[Rollback] Destroy Account Ledgers ${err}`)
          } else if (res && (res.ok < 1 || res.deletedCount < 1)) {
            msg.yellow('[Rollback] No Destroy Account Ledgers')
          } else msg.green(`[Rollback] Destroy ${res.deletedCount} Account Ledgers`)
        })

        /** destroy accounts */
        this.accountsService.destroies({ BlockHeight: { $gte: blockHeight } }, (err, res) => {
          if (err) {
            msg.red(`[Rollback] Destroy Accounts ${err}`)
          } else if (res && (res.ok < 1 || res.deletedCount < 1)) {
            msg.yellow('[Rollback] No Destroy Accounts')
          } else msg.green(`[Rollback] Destroy ${res.deletedCount} Accounts`)
        })

        /** destroy nodes */
        this.nodesService.destroies({ RegisteredBlockHeight: { $gte: blockHeight } }, (err, res) => {
          if (err) {
            msg.red(`[Rollback] Destroy Nodes ${err}`)
          } else if (res && (res.ok < 1 || res.deletedCount < 1)) {
            msg.yellow('[Rollback] No Destroy Nodes')
          } else msg.green(`[Rollback] Destroy ${res.deletedCount} Nodes`)
        })

        /** destroy transactions */
        this.transactionsService.destroies({ Height: { $gte: blockHeight } }, (err, res) => {
          if (err) {
            msg.red(`[Rollback] Destroy Transactions ${err}`)
          } else if (res && (res.ok < 1 || res.deletedCount < 1)) {
            msg.yellow('[Rollback] No Destroy Transactions')
          } else msg.green(`[Rollback] Destroy ${res.deletedCount} Transactions`)
        })

        /** destroy blocks */
        this.blocksService.destroies({ Height: { $gte: blockHeight } }, (err, res) => {
          if (err) {
            msg.red(`[Rollback] Destroy Blocks ${err}`)
          } else if (res && (res.ok < 1 || res.deletedCount < 1)) {
            msg.yellow('[Rollback] No Destroy Blocks')
          } else msg.green(`[Rollback] Destroy ${res.deletedCount} Blocks`)
        })

        /** update last check or delete one */
        if (blockHeight > 0) {
          const lastCheck = await this.generalsService.getSetLastCheck()
          const payloadLastCheck = { ...lastCheck, Height: res.Height, Timestamp: res.Timestamp }

          await this.generalsService.setValueByKey(store.keyLastCheck, payloadLastCheck)
        } else {
          await this.generalsService.destroy({ Key: store.keyLastCheck })
        }

        return callback(response.setResult(true, `[Rollback] Last Check Block Height ${blockHeight}`))
      })
    })
  }

  recursiveBlockHeight(limit, height, callback) {
    if (height < 1) return callback(null, null)

    Block.GetBlocks({ Limit: limit, Height: height }, (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) {
        this.generalsService.setOnRollback(false)
        return callback(response.sendBotMessage('Rollback', `[Rollback] API Core Get Blocks ${err}`))
      }

      if (res && res.Blocks && res.Blocks.length < 1) {
        const prevHeight = height - limit
        return this.recursiveBlockHeight(limit, prevHeight, callback)
      }

      const coreBlocks = res.Blocks.map(item => ({
        BlockID: item.ID,
        Height: item.Height,
        Timestamp: item.Timestamp,
      })).sort((a, b) => (a.Height > b.Height ? 1 : -1))

      this.blocksService.getFromHeight({ Limit: limit, Height: height }, (err, res) => {
        /** send message telegram bot if avaiable */
        if (err) {
          this.generalsService.setOnRollback(false)
          return callback(response.sendBotMessage('Rollback', `[Rollback] Blocks Service - Get From Height ${err}`))
        }

        if (res && res.length < 1) {
          const prevHeight = height - limit
          return this.recursiveBlockHeight(limit, prevHeight, callback)
        }

        const explorerBlocks = res
          .map(item => ({ BlockID: item.BlockID, Height: item.Height, Timestamp: item.Timestamp }))
          .sort((a, b) => (a.Height > b.Height ? 1 : -1))

        const diffs = coreBlocks.filter(({ BlockID: val1 }) => !explorerBlocks.some(({ BlockID: val2 }) => val2 === val1))

        if (diffs && diffs.length < 1) {
          const prevHeight = height - limit
          return this.recursiveBlockHeight(limit, prevHeight, callback)
        }

        const diff = Array.isArray(diffs) ? diffs[0] : diffs
        return callback(null, diff)
      })
    })
  }
}
