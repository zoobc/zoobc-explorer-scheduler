const BaseController = require('./BaseController')
const { store } = require('../utils')
const { AccountTransactionsService } = require('../services')

module.exports = class AccountTransactions extends BaseController {
  constructor() {
    super(new AccountTransactionsService())
  }

  update(callback) {
    if (store.accountTransactions.length < 1) return callback(null, null)

    this.service.insertMany(store.accountTransactions, (err, results) => {
      if (err) return callback(`[Account Transactions] Upsert ${err}`, null)
      if (results && results.length < 1) return callback(null, null)
      return callback(null, `[Account Transactions] Upsert ${results.length} data successfully`)
    })
  }
}
