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
const BaseController = require('./BaseController')
const { AccountLedger } = require('../protos')
const { util, response } = require('../utils')
const { AccountLedgerService, AccountsService, BlocksService, GeneralsService } = require('../services')

module.exports = class AccountLedgers extends BaseController {
  constructor() {
    super(new AccountLedgerService())
    this.blocksService = new BlocksService()
    this.accountService = new AccountsService()
    this.generalsService = new GeneralsService()
  }

  async update(callback) {
    this.accountService.getAccount(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('AccountLedger', `[Account Ledgers] Account Service - Get Last Height ${err}`))
      if (!res) return callback(response.setResult(false, '[Account Ledgers] No additional data'))

      this.blocksService.getLastTimestamp(async (err, res) => {
        /** send message telegram bot if avaiable */
        if (err) return callback(response.sendBotMessage('AccountLedger', `[Account Ledgers] Blocks Service - Get Last Timestamp ${err}`))
        if (!res) return callback(response.setResult(false, '[Account Ledgers] No additional data'))

        const lastCheck = await this.generalsService.getSetLastCheck()
        if (!lastCheck) return callback(response.setResult(false, '[Account Ledgers] No additional data'))

        const params = { EventType: 'EventReward', TimestampStart: lastCheck.Timestamp, TimestampEnd: moment(res.Timestamp).unix() }
        AccountLedger.GetAccountLedgers(params, async (err, res) => {
          if (err)
            return callback(
              /** send message telegram bot if avaiable */
              response.sendBotMessage(
                'AccountLedger',
                `[Account Ledger] API Core Get Account Ledger - ${err}`,
                `- Params : <pre>${JSON.stringify(params)}</pre>`
              )
            )

          if (res && res.AccountLedgers.length < 1) return callback(response.setResult(false, `[Account Ledgers] No additional data`))

          /** update or insert account base on account address */
          const promises = res.AccountLedgers.map(item => {
            return new Promise(resolve => {
              this.accountService.getCurrentTotalRewardByAccountAddress(item.AccountAddress, async (err, res) => {
                if (err)
                  return resolve({
                    err: `[Account Ledger] Account Service - Get Current Total Reward By AccountAddress ${err}`,
                    res: null,
                  })

                const TotalRewards =
                  res && res.TotalRewards ? parseInt(res.TotalRewards) + parseInt(item.BalanceChange) : parseInt(item.BalanceChange)
                const Balance = res && res.TotalRewards ? parseInt(res.Balance) : parseInt(item.BalanceChange)

                const payloadAccount = {
                  Balance,
                  TotalRewards,
                  FirstActive: res ? res.FirstActive : new Date(moment.unix(item.Timestamp).valueOf()),
                  LastActive: new Date(moment.unix(item.Timestamp).valueOf()),
                  TransactionHeight: res ? res.TransactionHeight : null,
                  TotalFeesPaid: res ? res.TotalFeesPaid : 0,
                  TotalFeesPaidConversion: res ? res.TotalFeesPaidConversion : 0,
                  AccountAddress: item.AccountAddress,
                  AccountAddressFormatted: util.parseAddress(item.AccountAddress),
                  BalanceConversion: util.zoobitConversion(Balance),
                  SpendableBalance: res ? res.SpendableBalance : 0,
                  SpendableBalanceConversion: res ? res.SpendableBalanceConversion : 0,
                  BlockHeight: res ? res.BlockHeight : item.BlockHeight,
                  PopRevenue: res ? res.PopRevenue : 0,
                  TotalRewardsConversion: util.zoobitConversion(TotalRewards),
                }

                this.accountService.findAndUpdate(payloadAccount, (err, res) => {
                  if (err) return resolve({ err: `[Account Ledger] Account Service - Find And Update ${err}`, res: null })
                  return resolve({ err: null, res })
                })
              })
            })
          })

          const results = await Promise.all(promises)
          const errors = results.filter(f => f.err !== null).map(i => i.err)
          const updates = results.filter(f => f.res !== null).map(i => i.res)

          if (updates && updates.length < 1 && errors.length < 1)
            return callback(response.setResult(false, `[Account Ledger] No additional data`))

          if (errors && errors.length > 0) return callback(response.sendBotMessage('AccountLedger', errors[0]))

          /** update or insert account ledger */
          const payloads = res.AccountLedgers.map(i => {
            return {
              ...i,
              AccountAddress: i.AccountAddress,
              AccountAddressFormatted: util.parseAddress(i.AccountAddress),
              Timestamp: new Date(moment.unix(i.Timestamp).valueOf()),
              BalanceChange: parseInt(i.BalanceChange),
              BalanceChangeConversion: util.zoobitConversion(parseInt(i.BalanceChange)),
            }
          })

          this.service.upserts(payloads, ['AccountAddressFormatted', 'BlockHeight', 'TransactionID'], (err, res) => {
            /** send message telegram bot if avaiable */
            if (err) return callback(response.sendBotMessage('AccountLedger', `[Account Ledger] Upsert - ${err}`))
            if (res && res.result.ok !== 1) return callback(response.setError('[Account Ledger] Upsert data failed'))

            return callback(response.setResult(true, `[Account Ledger] Upsert ${payloads.length} data successfully`))
          })
        })
      })
    })
  }
}
