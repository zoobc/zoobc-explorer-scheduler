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

  getFirstActiveByAccountAddress(accountAddress, callback) {
    Accounts.findOne({ AccountAddress: accountAddress }).select('FirstActive').exec(callback)
  }

  getTotalFeeByAccountAddress(accountAddress, callback) {
    Accounts.findOne({ AccountAddress: accountAddress }).select('TotalFeesPaid').exec(callback)
  }
}
