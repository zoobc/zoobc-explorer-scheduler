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

const _ = require('lodash')
const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { AccountBalance } = require('../protos')
const { AccountsService, TransactionsService, GeneralsService } = require('../services')

module.exports = class Accounts extends BaseController {
  constructor() {
    super(new AccountsService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
  }

  async update(callback) {
    const rollback = await this.generalsService.getValueRollback()
    if (rollback && rollback.res && rollback.res.Value === 'true') return callback(response.setResult(false, null))

    /** get last height account (local) */
    this.service.getLastHeight(async (err, res) => {
      /** send message telegram bot if available */
      if (err) return callback(response.sendBotMessage('Accounts', `[Accounts] Accounts Service - Get Last Height ${err}`))

      /** set variable last height account */
      const lastAccountHeight = res && res.TransactionHeight ? parseInt(res.TransactionHeight + 1) : 0

      /** getting value last check */
      const lastCheck = await this.generalsService.getSetLastCheck()

      /** return message if nothing */
      if (!lastCheck) return callback(response.setResult(false, '[Accounts] No additional data'))

      /** return message if last height account greather than last check height transaction  */
      if (lastAccountHeight > 0 && lastAccountHeight >= lastCheck.Height)
        return callback(response.setResult(false, '[Accounts] No additional data'))

      /** get all account address from transactions by heights */
      const account = await this.transactionsService.asyncAccountAddressByHeights(lastAccountHeight, lastCheck.Height)
      if (account.error)
        return callback(response.sendBotMessage('Accounts', `[Accounts] Transactions Service - Get Account Address ${account.error}`))

      /** return message if nothing */
      if (account.data.length < 1) return callback(response.setResult(false, '[Accounts] No additional data'))

      /** get account balances core */
      const params = { AccountAddresses: account.data.map(i => i.Account) }
      AccountBalance.GetAccountBalances(params, (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if available */
            response.sendBotMessage(
              'Accounts',
              `[Accounts] API Core Get Account Balances - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.AccountBalances.length < 1) return callback(response.setResult(false, `[Accounts] No additional data`))

        /** mapping data transactions and account balances */
        const payloads = res.AccountBalances.map(i => {
          // filter accounts using address formatted
          const accounts = account.data.filter(o => o.AccountFormatted === util.parseAddress(i.AccountAddress))

          /** get first active */
          const FirstActive = _.sortBy(accounts, ['Height'])[0].Timestamp

          /** get last active */
          const LastActive = _.sortBy(accounts, ['Height'])[accounts.length - 1].Timestamp

          /** get last transaction height */
          const TransactionHeight = _.sortBy(accounts, ['Height'])[accounts.length - 1].Height

          /** get fee paid recipient */
          const feeRecipients = accounts.filter(o => o.Type === 'Recipient')
          let TotalFeesPaid = feeRecipients.length > 0 ? _.sortBy(feeRecipients, ['Height'])[feeRecipients.length - 1].Fee : 0

          /** summary fee if sender */
          const feeSenders = accounts.filter(o => o.Type === 'Sender')
          if (feeSenders.length > 0) TotalFeesPaid = _.sumBy(feeSenders, 'Fee')

          return {
            FirstActive,
            LastActive,
            TransactionHeight,
            TotalFeesPaid: parseInt(TotalFeesPaid),
            TotalFeesPaidConversion: util.zoobitConversion(parseInt(TotalFeesPaid)),
            AccountAddress: i.AccountAddress,
            AccountAddressFormatted: util.parseAddress(i.AccountAddress),
            Balance: parseInt(i.Balance),
            BalanceConversion: util.zoobitConversion(parseInt(i.Balance)),
            SpendableBalance: parseInt(i.SpendableBalance),
            SpendableBalanceConversion: util.zoobitConversion(parseInt(i.SpendableBalance)),
            BlockHeight: i.BlockHeight,
            PopRevenue: parseInt(i.PopRevenue),
            TotalRewards: null,
            TotalRewardsConversion: null,
          }
        })

        this.service.upserts(payloads, ['AccountAddressFormatted'], (err, res) => {
          /** send message telegram bot if available */
          if (err) return callback(response.sendBotMessage('Accounts', `[Accounts] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError(`[Accounts] Upsert data failed`))

          return callback(response.setResult(true, `[Accounts] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
