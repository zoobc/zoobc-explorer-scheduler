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
const { util, response } = require('../utils')
const { AccountBalance } = require('../protos')
const { AccountsService, TransactionsService, GeneralsService } = require('../services')

module.exports = class AccountBalances extends BaseController {
  constructor() {
    super(new AccountsService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
  }

  async update(callback) {
    const rollback = await this.generalsService.getValueRollback()
    if (rollback && rollback.res && rollback.res.Value === 'true') return callback(response.setResult(false, null))

    this.service.getAccounts(async (err, res) => {
      /** send message telegram bot if available */
      if (err) return callback(response.sendBotMessage('Account Balances', `[Account Balances] Accounts Service - Get Account ${err}`))

      if (res.length < 1) return callback(response.setResult(false, '[Account Balances] No additional data'))

      const accounts = res
      const params = { AccountAddresses: accounts.map(i => i.AccountAddress) }
      AccountBalance.GetAccountBalances(params, (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if available */
            response.sendBotMessage(
              'Account Balances',
              `[Account Balances] API Core Get Account Balances - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.AccountBalances.length < 1) return callback(response.setResult(false, `[Account Balances] No additional data`))

        const accountBalances = res.AccountBalances
        const payloads = accountBalances.map(item => {
          const filterAccounts = accounts.filter(o => o.AccountAddressFormatted === util.parseAddress(item.AccountAddress))
          const account = filterAccounts[0]

          return {
            FirstActive: account.FirstActive,
            LastActive: account.LastActive,
            TransactionHeight: account.TransactionHeight,
            TotalFeesPaid: account.TotalFeesPaid,
            TotalFeesPaidConversion: account.TotalFeesPaid,
            AccountAddress: account.AccountAddress,
            AccountAddressFormatted: account.AccountAddressFormatted,
            Balance: parseInt(item.Balance),
            BalanceConversion: util.zoobitConversion(parseInt(item.Balance)),
            SpendableBalance: account.SpendableBalance,
            SpendableBalanceConversion: account.SpendableBalance,
            BlockHeight: account.BlockHeight,
            PopRevenue: account.PopRevenue,
            TotalRewards: account.TotalRewards,
            TotalRewardsConversion: account.TotalFeesPaidConversion,
          }
        })

        this.service.upserts(payloads, ['AccountAddressFormatted'], (err, res) => {
          /** send message telegram bot if available */
          if (err) return callback(response.sendBotMessage('Account Balances', `[Account Balances] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError(`[Account Balances] Upsert data failed`))

          return callback(response.setResult(true, `[Account Balances] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
