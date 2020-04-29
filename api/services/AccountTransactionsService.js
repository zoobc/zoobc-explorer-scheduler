const BaseService = require('./BaseService');
const { AccountTransactions } = require('../../models');

module.exports = class AccountTransactionsService extends BaseService {
  constructor() {
    super(AccountTransactions);
  }

  insertMany(payloads, callback) {
    AccountTransactions.insertMany(payloads, callback);
  }
};
