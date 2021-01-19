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
const { store } = require('../utils')
const {
  NodesService,
  BlocksService,
  AccountsService,
  GeneralsService,
  TransactionsService,
  AccountLedgerService,
  ParticipationScoresService,
} = require('../services')

module.exports = class ResetData extends BaseController {
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

  static getServiceName(service) {
    switch (service.name) {
      case 'BlocksService':
        return 'Reset Blocks'
      case 'TransactionsService':
        return 'Reset Transactions'
      case 'NodesService':
        return 'Reset Nodes'
      case 'AccountsService':
        return 'Reset Accounts'
      case 'ParticipationScoresService':
        return 'Reset Participation Scores'
      case 'AccountLedgersService':
        return 'Reset Account Ledgers'
      case 'GeneralsService':
        return 'Reset Generals'
      default:
        return 'Reset Unknow Service'
    }
  }

  static resetter(service, params, callback) {
    const head = ResetData.getServiceName(service)
    service.destroies(params, (err, res) => {
      if (err) return callback(`[${head}] Destroy Many ${err}`, { success: false, message: null })
      if (res.ok < 1 || res.deletedCount < 1) return callback(null, { success: false, message: `[${head}] No reseting data` })
      return callback(null, { success: true, message: `[${head}] Delete ${res.deletedCount} data successfully` })
    })
  }

  async resetByServiceName(name, height) {
    const lastCheckHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0
    if (parseInt(lastCheckHeight) > parseInt(height)) this.generalsService.setValueByKey(store.keyLastCheckTransactionHeight, height)

    switch (name) {
      case 'BlocksService':
        return new Promise(resolve => {
          ResetData.resetter(this.blocksService, { Height: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'TransactionsService':
        return new Promise(resolve => {
          ResetData.resetter(this.transactionsService, { Height: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'NodesService':
        return new Promise(resolve => {
          ResetData.resetter(this.nodesService, { RegisteredBlockHeight: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'AccountsService':
        return new Promise(resolve => {
          ResetData.resetter(this.accountsService, { TransactionHeight: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'ParticipationScoresService':
        return new Promise(resolve => {
          ResetData.resetter(this.participationScoresService, { Height: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'AccountLedgersService':
        return new Promise(resolve => {
          ResetData.resetter(this.accountLedgerService, { BlockHeight: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      default:
        return { error: '[Reset] Unknow service name', result: { success: false, message: null } }
    }
  }

  async resetAllByHeight(height = 0) {
    const lastCheckHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0
    if (parseInt(lastCheckHeight) > parseInt(height)) this.generalsService.setValueByKey(store.keyLastCheckTransactionHeight, height)

    const promiseBlocks = new Promise(resolve => {
      ResetData.resetter(this.blocksService, { Height: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseTransactions = new Promise(resolve => {
      ResetData.resetter(this.transactionsService, { Height: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseNodes = new Promise(resolve => {
      ResetData.resetter(this.nodesService, { RegisteredBlockHeight: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseAccounts = new Promise(resolve => {
      ResetData.resetter(
        this.accountsService,
        { $or: [{ BlockHeight: { $gte: height } }, { TransactionHeight: { $gte: height } }] },
        (error, result) => {
          return resolve({ error, result })
        }
      )
    })

    const promiseParticipationScores = new Promise(resolve => {
      ResetData.resetter(this.participationScoresService, { Height: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseAccountLedgers = new Promise(resolve => {
      ResetData.resetter(this.accountLedgerService, { BlockHeight: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseGeneral = new Promise(resolve => {
      ResetData.resetter(this.generalsService, { Key: store.keyLastCheck }, (error, result) => {
        return resolve({ error, result })
      })
    })

    return Promise.all([
      promiseNodes,
      promiseBlocks,
      promiseAccounts,
      promiseTransactions,
      promiseAccountLedgers,
      promiseParticipationScores,
      promiseGeneral,
    ])
  }

  resetAll() {
    return this.resetAllByHeight(0)
  }
}
