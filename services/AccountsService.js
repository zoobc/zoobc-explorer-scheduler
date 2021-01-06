const BaseService = require('./BaseService')
const { Accounts } = require('../models')

module.exports = class AccountsService extends BaseService {
  constructor() {
    super(Accounts)
    this.name = 'AccountsService'
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
}
