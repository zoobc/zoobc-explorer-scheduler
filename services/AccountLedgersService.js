const BaseService = require('./BaseService')
const { AccountLedgers } = require('../models')

module.exports = class AccountLedgersService extends BaseService {
  constructor() {
    super(AccountLedgers)
    this.name = 'AccountLedgersService'
  }
}
