const BaseService = require('./BaseService')
const { Accounts } = require('../models')

module.exports = class AccountsService extends BaseService {
  constructor() {
    super(Accounts)
    this.name = 'AccountsService'
  }

  getLastHeight(callback) {
    Accounts.findOne().select('TransactionHeight').sort('-TransactionHeight').exec(callback)
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
    Accounts.findOne({ AccountAddress: accountAddress }).select('FirstActive').exec(callback)
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
    Accounts.findOne({ AccountAddress: accountAddress }).select('TotalFeesPaid').exec(callback)
  }
}
