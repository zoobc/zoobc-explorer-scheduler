const BaseService = require('./BaseService')
const { PendingTransactions } = require('../models')

module.exports = class PendingTransactionService extends BaseService {
  constructor() {
    super(PendingTransactions)
  }

  insertMany(payloads, callback) {
    PendingTransactions.insertMany(payloads, callback)
  }
}
