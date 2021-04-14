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

const BaseService = require('./BaseService')
const { Accounts } = require('../models')

module.exports = class AccountsService extends BaseService {
  constructor() {
    super(Accounts)
    this.name = 'AccountsService'
  }

  getAccounts(callback) {
    Accounts.find().select().exec(callback)
  }

  getAccount(callback) {
    Accounts.findOne().select().lean().limit(1).exec(callback)
  }

  getLastHeight(callback) {
    Accounts.findOne().select('TransactionHeight').sort('-TransactionHeight').lean().exec(callback)
  }

  asyncFirstActiveAccount(accountAddress) {
    return new Promise(resolve => {
      this.getFirstActiveByAccountAddress(accountAddress, (err, res) => {
        if (err) return resolve(null)
        return resolve(res ? res.FirstActive : null)
      })
    })
  }

  getFirstActiveByAccountAddress(accountAddress, callback) {
    Accounts.findOne({ AccountAddress: accountAddress }).select('FirstActive').lean().exec(callback)
  }

  asyncTotalFeeAccount(accountAddress) {
    return new Promise(resolve => {
      this.getTotalFeeByAccountAddress(accountAddress, (err, res) => {
        if (err) return resolve(null)
        return resolve(res ? res.TotalFeesPaid : 0)
      })
    })
  }

  getTotalFeeByAccountAddress(accountAddress, callback) {
    Accounts.findOne({ AccountAddress: accountAddress }).select('TotalFeesPaid').lean().exec(callback)
  }

  findAndUpdate(payloads, callback) {
    Accounts.findOneAndUpdate(
      { AccountAddressFormatted: payloads.AccountAddressFormatted },
      {
        FirstActive: payloads.FirstActive,
        LastActive: payloads.LastActive,
        TransactionHeight: payloads.TransactionHeight,
        TotalFeesPaid: payloads.TotalFeesPaid,
        TotalFeesPaidConversion: payloads.TotalFeesPaid,
        AccountAddress: payloads.AccountAddress,
        AccountAddressFormatted: payloads.AccountAddressFormatted,
        Balance: payloads.Balance,
        BalanceConversion: payloads.Balance,
        SpendableBalance: payloads.SpendableBalance,
        SpendableBalanceConversion: payloads.SpendableBalance,
        BlockHeight: payloads.BlockHeight,
        PopRevenue: payloads.PopRevenue,
        TotalRewards: payloads.TotalRewards,
        TotalRewardsConversion: payloads.TotalRewardsConversion,
      },
      { new: false, upsert: true }
    ).exec((err, res) => {
      if (err) return callback(err, null)
      if (res && res.length < 1) return callback(null, null)
      return callback(null, res)
    })
  }

  getCurrentTotalRewardByAccountAddress(accountAddress, callback) {
    Accounts.findOne({ AccountAddress: accountAddress }).lean().exec(callback)
  }

  destroyAccountNull(callback) {
    Accounts.remove({ AccountAddressFormatted: null }, callback)
  }
}
