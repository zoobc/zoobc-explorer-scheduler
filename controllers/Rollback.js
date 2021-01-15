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
const { BlocksService, TransactionsService, NodesService, AccountsService } = require('../services')

module.exports = class Rollback extends BaseController {
  constructor() {
    super()
    this.nodesService = new NodesService()
    this.blocksService = new BlocksService()
    this.accountsService = new AccountsService()
    this.transactionsService = new TransactionsService()
  }

  checking(callback) {
    this.blocksService.getLastHeight(async (err, result) => {
      if (err) return callback(`[Rollback] Blocks Service - Get Last Height ${err}`, { success: false, message: null })
      if (!result || !result.Height) return callback(null, { success: false, message: '[Rollback] No data rollback' })

      const Limit = config.app.limitData * 2
      const Height = parseInt(result.Height) - Limit < 1 ? 1 : parseInt(result.Height) - Limit
      this.recursiveBlockHeight(Limit, Height, (err, result) => {
        if (err) return callback(`[Rollback] Recursive Block Height ${err}`, { success: false, message: null })
        if (!result) return callback(null, { success: false, message: '[Rollback] No data rollback' })

        let blockHeight = result.Height
        if (blockHeight < config.app.limitData) blockHeight = 0

        this.blocksService.destroies({ Height: { $gte: blockHeight } }, (err, result) => {
          if (err) return callback(`[Rollback] Blocks Service - Destroy Many ${err}`, { success: false, message: null })
          if (result.ok < 1 || result.deletedCount < 1)
            return callback(null, { success: false, message: '[Rollback - Blocks] No data rollback' })
          return callback(null, { success: true, message: `[Rollback - Blocks] Delete ${result.deletedCount} data successfully` })
        })

        this.transactionsService.destroies({ Height: { $gte: blockHeight } }, (err, result) => {
          if (err) return callback(`[Rollback] Transactions Service - Destroy Many ${err}`, { success: false, message: null })
          if (result.ok < 1 || result.deletedCount < 1)
            return callback(null, { success: false, message: '[Rollback - Transactions] No data rollback' })
          return callback(null, { success: true, message: `[Rollback - Transactions] Delete ${result.deletedCount} data successfully` })
        })

        this.nodesService.destroies({ Height: { $gte: blockHeight } }, (err, result) => {
          if (err) return callback(`[Rollback] Nodes Service - Destroy Many ${err}`, { success: false, message: null })
          if (result.ok < 1 || result.deletedCount < 1)
            return callback(null, { success: false, message: '[Rollback - Nodes] No data rollback' })
          return callback(null, { success: true, message: `[Rollback - Nodes] Delete ${result.deletedCount} data successfully` })
        })

        this.accountsService.destroies({ BlockHeight: { $gte: blockHeight } }, (err, result) => {
          if (err) return callback(`[Rollback] Accounts Service - Destroy Many ${err}`, { success: false, message: null })
          if (result.ok < 1 || result.deletedCount < 1)
            return callback(null, { success: false, message: '[Rollback - Accounts] No data rollback' })
          return callback(null, { success: true, message: `[Rollback - Accounts] Delete ${result.deletedCount} data successfully` })
        })

        // this.accountTransactionsService.destroies({ BlockHeight: { $gte: blockHeight } }, (err, result) => {
        //   if (err) return callback(`[Rollback] Accounts Service - Destroy Many ${err}`, { success: false, message: null })
        //   if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, message: '[Rollback - Account Transactions] No data rollback' })
        //   return callback(null, {
        //     success: true,
        //     message: `[Rollback - Account Transactions] Delete ${result.deletedCount} data successfully`,
        //   })
        // })
      })
    })
  }

  recursiveBlockHeight(limit, height, callback) {
    if (height < 1) return callback(null, null)

    Block.GetBlocks({ Limit: limit, Height: height }, (err, result) => {
      if (err) return callback(`[Rollback] Proto Block - Get Blocks ${err}`)
      if (result && result.Blocks && result.Blocks.length < 1) {
        const prevHeight = height - limit
        return this.recursiveBlockHeight(limit, prevHeight, callback)
      }

      this.blocksService.getFromHeight({ Limit: limit, Height: height }, (err, results) => {
        if (err) return callback(`[Rollback] Blocks Service - Get From Height ${err}`, null)
        if (results && results.length < 1) {
          const prevHeight = height - limit
          return this.recursiveBlockHeight(limit, prevHeight, callback)
        }

        const resultsCore = result.Blocks.map(item => ({
          BlockID: item.Block.ID,
          Height: item.Block.Height,
        })).sort((a, b) => (a.Height > b.Height ? 1 : -1))

        const resultsExplorer = results
          .map(item => ({ BlockID: item.BlockID, Height: item.Height }))
          .sort((a, b) => (a.Height > b.Height ? 1 : -1))

        const diffs = resultsCore.filter(({ BlockID: val1 }) => !resultsExplorer.some(({ BlockID: val2 }) => val2 === val1))
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
